from typing import List

from fastapi import APIRouter, HTTPException
from loguru import logger

from api.models import SpaceCreate, SpaceResponse, SpaceUpdate
from open_notebook.domain.notebook import Notebook
from open_notebook.domain.space import Space
from open_notebook.exceptions import InvalidInputError, NotFoundError

router = APIRouter()


async def _get_or_create_container(space: Space) -> Notebook:
    """Контейнер-notebook пространства (источники/заметки/чат уровня пространства).

    Создаётся лениво: при первом обращении к вкладкам пространства. Скрыт из
    списков карточек (is_container=true, space_id=None).
    """
    if space.container_id:
        try:
            existing = await Notebook.get(space.container_id)
            if existing:
                return existing
        except NotFoundError:
            pass  # контейнер удалён — пересоздадим ниже

    container = Notebook(
        name=space.name,
        description="",
        notebook_type="cell",
        is_container=True,
        space_id=None,
    )
    await container.save()
    space.container_id = container.id
    await space.save()
    return container


def _to_response(space: Space) -> SpaceResponse:
    return SpaceResponse(
        id=space.id or "",
        name=space.name,
        kind=space.kind,
        slug=space.slug,
        icon=space.icon,
        description=space.description,
        removable=space.removable,
        hidden=space.hidden,
        order=space.order,
    )


@router.get("/spaces", response_model=List[SpaceResponse])
async def get_spaces():
    """Все пространства, отсортированные по порядку (включая скрытые — например, Архив)."""
    try:
        spaces = await Space.get_all(order_by="order asc")
        return [_to_response(s) for s in spaces]
    except Exception as e:
        logger.error(f"Error fetching spaces: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching spaces: {str(e)}")


@router.get("/spaces/{space_id}/container")
async def get_space_container(space_id: str):
    """ID контейнера-notebook пространства (для вкладок Источники/Заметки/Чат).

    Создаётся при первом обращении. Клиент передаёт этот id в те же колонки,
    что и у ячейки.
    """
    try:
        space = await Space.get(space_id)
        container = await _get_or_create_container(space)
        return {"container_id": container.id, "space_id": space_id}
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Space not found")
    except Exception as e:
        logger.error(f"Error resolving container for space {space_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error resolving container: {str(e)}")


@router.post("/spaces", response_model=SpaceResponse)
async def create_space(payload: SpaceCreate):
    """Создать пользовательское пространство-проект."""
    try:
        # Порядок нового пространства — в конец списка.
        existing = await Space.get_all(order_by="order asc")
        next_order = (max((s.order for s in existing), default=-1)) + 1
        space = Space(
            name=payload.name,
            kind="project",  # через API создаются только пользовательские проекты
            icon=payload.icon,
            description=payload.description,
            removable=True,
            hidden=False,
            order=next_order,
        )
        await space.save()
        return _to_response(space)
    except InvalidInputError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating space: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error creating space: {str(e)}")


@router.put("/spaces/{space_id}", response_model=SpaceResponse)
async def update_space(space_id: str, payload: SpaceUpdate):
    """Переименовать/сменить иконку/порядок пространства."""
    try:
        space = await Space.get(space_id)
        if payload.name is not None:
            space.name = payload.name
        if payload.icon is not None:
            space.icon = payload.icon
        if payload.order is not None:
            space.order = payload.order
        if payload.description is not None:
            space.description = payload.description
        await space.save()
        return _to_response(space)
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Space not found")
    except InvalidInputError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating space {space_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error updating space: {str(e)}")


@router.delete("/spaces/{space_id}")
async def delete_space(space_id: str):
    """Удалить пространство. Дефолтные (removable=false) удалять нельзя."""
    try:
        space = await Space.get(space_id)
        if not space.removable:
            raise HTTPException(
                status_code=400,
                detail="Нельзя удалить системное пространство",
            )
        # Вместе с пространством удаляем его контейнер (источники/заметки/чат уровня
        # пространства), чтобы не оставлять осиротевший notebook.
        if space.container_id:
            try:
                container = await Notebook.get(space.container_id)
                if container:
                    await container.delete()
            except NotFoundError:
                pass
        await space.delete()
        return {"success": True, "deleted_id": space_id}
    except HTTPException:
        raise
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Space not found")
    except Exception as e:
        logger.error(f"Error deleting space {space_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error deleting space: {str(e)}")
