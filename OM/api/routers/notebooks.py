import os
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, File, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse
from loguru import logger

from api.models import (
    ImplementationPlan,
    NotebookCreate,
    NotebookDeletePreview,
    NotebookDeleteResponse,
    NotebookResponse,
    NotebookUpdate,
)
from open_notebook.config import UPLOADS_FOLDER
from open_notebook.database.repository import ensure_record_id, repo_query
from open_notebook.domain.notebook import Notebook, Source
from open_notebook.exceptions import InvalidInputError, NotFoundError

router = APIRouter()


@router.get("/notebooks", response_model=List[NotebookResponse])
async def get_notebooks(
    archived: Optional[bool] = Query(None, description="Filter by archived status"),
    order_by: str = Query("updated desc", description="Order by field and direction"),
):
    """Get all notebooks with optional filtering and ordering."""
    try:
        # Validate order_by against allowlist to prevent SurrealQL injection
        allowed_fields = {"name", "created", "updated"}
        allowed_directions = {"asc", "desc"}

        parts = order_by.strip().lower().split()
        if len(parts) == 1:
            if parts[0] not in allowed_fields:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid order_by field: '{order_by}'. Allowed fields: {', '.join(sorted(allowed_fields))}",
                )
            validated_order_by = parts[0]
        elif len(parts) == 2:
            if parts[0] not in allowed_fields or parts[1] not in allowed_directions:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid order_by: '{order_by}'. Allowed fields: {', '.join(sorted(allowed_fields))}. Allowed directions: asc, desc",
                )
            validated_order_by = f"{parts[0]} {parts[1]}"
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid order_by format: '{order_by}'. Expected 'field' or 'field direction'",
            )

        # Build the query with counts
        query = f"""
            SELECT *,
            count(<-reference.in) as source_count,
            count(<-artifact.in) as note_count
            FROM notebook
            ORDER BY {validated_order_by}
        """

        result = await repo_query(query)

        # Служебные контейнеры пространств не показываем как карточки нигде.
        result = [nb for nb in result if not nb.get("is_container")]

        # Filter by archived status if specified
        if archived is not None:
            result = [nb for nb in result if nb.get("archived") == archived]

        return [
            NotebookResponse(
                id=str(nb.get("id", "")),
                name=nb.get("name", ""),
                description=nb.get("description", ""),
                archived=nb.get("archived", False),
                notebook_type=nb.get("notebook_type", "cell"),
                state=nb.get("state", 0),
                is_admin=nb.get("is_admin", False),
                parent_id=nb.get("parent_id"),
                space_id=nb.get("space_id"),
                implementation_plan=nb.get("implementation_plan"),
                deadline=nb.get("deadline"),
                assigned=nb.get("assigned"),
                checklist=nb.get("checklist"),
                goal=nb.get("goal"),
                goal_file=nb.get("goal_file"),
                sort_order=nb.get("sort_order", 0),
                report=nb.get("report"),
                review_notes=nb.get("review_notes"),
                done=nb.get("done", False),
                accepted=nb.get("accepted", False),
                completed_at=nb.get("completed_at"),
                created=str(nb.get("created", "")),
                updated=str(nb.get("updated", "")),
                source_count=nb.get("source_count", 0),
                note_count=nb.get("note_count", 0),
            )
            for nb in result
        ]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching notebooks: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Error fetching notebooks: {str(e)}"
        )


@router.post("/notebooks", response_model=NotebookResponse)
async def create_notebook(notebook: NotebookCreate):
    """Create a new notebook."""
    try:
        checklist = (
            [item.model_dump() for item in notebook.checklist]
            if notebook.checklist else []
        )
        new_notebook = Notebook(
            name=notebook.name,
            description=notebook.description,
            notebook_type=notebook.notebook_type or "cell",
            parent_id=notebook.parent_id,
            space_id=notebook.space_id,
            is_admin=notebook.is_admin or False,
            checklist=checklist,
            goal=notebook.goal,
            goal_file=notebook.goal_file,
        )
        await new_notebook.save()

        persist_checklist = checklist or []
        if new_notebook.id:
            await repo_query(
                "UPDATE $id SET checklist = $checklist",
                {"id": ensure_record_id(new_notebook.id), "checklist": persist_checklist},
            )

        return NotebookResponse(
            id=new_notebook.id or "",
            name=new_notebook.name,
            description=new_notebook.description,
            archived=new_notebook.archived or False,
            notebook_type=new_notebook.notebook_type,
            state=new_notebook.state,
            is_admin=new_notebook.is_admin or False,
            parent_id=new_notebook.parent_id,
            space_id=new_notebook.space_id,
            implementation_plan=new_notebook.implementation_plan,
            deadline=new_notebook.deadline,
            assigned=new_notebook.assigned,
            checklist=persist_checklist,
            goal=new_notebook.goal,
            goal_file=new_notebook.goal_file,
            sort_order=new_notebook.sort_order or 0,
            created=str(new_notebook.created),
            updated=str(new_notebook.updated),
            source_count=0,
            note_count=0,
        )
    except InvalidInputError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating notebook: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Error creating notebook: {str(e)}"
        )


@router.get(
    "/notebooks/{notebook_id}/delete-preview", response_model=NotebookDeletePreview
)
async def get_notebook_delete_preview(notebook_id: str):
    """Get a preview of what will be deleted when this notebook is deleted."""
    try:
        notebook = await Notebook.get(notebook_id)

        preview = await notebook.get_delete_preview()

        return NotebookDeletePreview(
            notebook_id=str(notebook.id),
            notebook_name=notebook.name,
            note_count=preview["note_count"],
            exclusive_source_count=preview["exclusive_source_count"],
            shared_source_count=preview["shared_source_count"],
        )
    except HTTPException:
        raise
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Notebook not found")
    except Exception as e:
        logger.error(f"Error getting delete preview for notebook {notebook_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching notebook deletion preview: {str(e)}",
        )


@router.get("/notebooks/{notebook_id}", response_model=NotebookResponse)
async def get_notebook(notebook_id: str):
    """Get a specific notebook by ID."""
    try:
        # Query with counts for single notebook
        query = """
            SELECT *,
            count(<-reference.in) as source_count,
            count(<-artifact.in) as note_count
            FROM $notebook_id
        """
        result = await repo_query(query, {"notebook_id": ensure_record_id(notebook_id)})

        if not result:
            raise HTTPException(status_code=404, detail="Notebook not found")

        nb = result[0]
        return NotebookResponse(
            id=str(nb.get("id", "")),
            name=nb.get("name", ""),
            description=nb.get("description", ""),
            archived=nb.get("archived", False),
            notebook_type=nb.get("notebook_type", "cell"),
            state=nb.get("state", 0),
            is_admin=nb.get("is_admin", False),
            parent_id=nb.get("parent_id"),
            space_id=nb.get("space_id"),
            implementation_plan=nb.get("implementation_plan"),
            deadline=nb.get("deadline"),
            assigned=nb.get("assigned"),
            checklist=nb.get("checklist"),
            goal=nb.get("goal"),
            goal_file=nb.get("goal_file"),
            sort_order=nb.get("sort_order", 0),
            report=nb.get("report"),
            review_notes=nb.get("review_notes"),
            done=nb.get("done", False),
            accepted=nb.get("accepted", False),
            completed_at=nb.get("completed_at"),
            created=str(nb.get("created", "")),
            updated=str(nb.get("updated", "")),
            source_count=nb.get("source_count", 0),
            note_count=nb.get("note_count", 0),
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching notebook {notebook_id}: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Error fetching notebook: {str(e)}"
        )


@router.put("/notebooks/{notebook_id}", response_model=NotebookResponse)
async def update_notebook(notebook_id: str, notebook_update: NotebookUpdate):
    """Update a notebook."""
    try:
        notebook = await Notebook.get(notebook_id)

        # Update only provided fields
        if notebook_update.name is not None:
            notebook.name = notebook_update.name
        if notebook_update.description is not None:
            notebook.description = notebook_update.description
        if notebook_update.archived is not None:
            notebook.archived = notebook_update.archived
        if notebook_update.notebook_type is not None:
            notebook.notebook_type = notebook_update.notebook_type
        if notebook_update.is_admin is not None:
            notebook.is_admin = notebook_update.is_admin
        if notebook_update.parent_id is not None:
            notebook.parent_id = notebook_update.parent_id
        if notebook_update.space_id is not None:
            # Пустая строка = перенос в глобальные «Ячейки» (space_id = None).
            notebook.space_id = notebook_update.space_id or None
        if notebook_update.implementation_plan is not None:
            notebook.implementation_plan = notebook_update.implementation_plan.model_dump()
        if notebook_update.deadline is not None:
            notebook.deadline = notebook_update.deadline
        if notebook_update.assigned is not None:
            notebook.assigned = notebook_update.assigned
        if notebook_update.report_entry is not None:
            # Append-only журнал: дописываем одну запись, `at` ставит сервер.
            entry = notebook_update.report_entry.model_dump()
            entry["at"] = datetime.now(timezone.utc).isoformat()
            notebook.report = (notebook.report or []) + [entry]
        if notebook_update.review_notes is not None:
            notebook.review_notes = notebook_update.review_notes
        if notebook_update.done is not None:
            notebook.done = notebook_update.done
        if notebook_update.accepted is not None:
            notebook.accepted = notebook_update.accepted
        if notebook_update.goal is not None:
            notebook.goal = notebook_update.goal
        if notebook_update.goal_file is not None:
            notebook.goal_file = notebook_update.goal_file
        if notebook_update.sort_order is not None:
            notebook.sort_order = notebook_update.sort_order
        checklist_data = None
        if notebook_update.checklist is not None:
            checklist_data = [item.model_dump() for item in notebook_update.checklist]
            notebook.checklist = checklist_data

        await notebook.save()

        if checklist_data is not None and notebook.id:
            await repo_query(
                "UPDATE $id SET checklist = $checklist",
                {"id": ensure_record_id(notebook.id), "checklist": checklist_data},
            )

        # Вложенный объект goal_file (как checklist) надёжно кладём отдельным SET.
        if notebook_update.goal_file is not None and notebook.id:
            await repo_query(
                "UPDATE $id SET goal_file = $gf",
                {"id": ensure_record_id(notebook.id), "gf": notebook_update.goal_file},
            )

        # Вложенный объект review_notes — тоже отдельным SET (надёжность вложенных объектов).
        if notebook_update.review_notes is not None and notebook.id:
            await repo_query(
                "UPDATE $id SET review_notes = $rn",
                {"id": ensure_record_id(notebook.id), "rn": notebook_update.review_notes},
            )

        # Query with counts after update
        query = """
            SELECT *,
            count(<-reference.in) as source_count,
            count(<-artifact.in) as note_count
            FROM $notebook_id
        """
        result = await repo_query(query, {"notebook_id": ensure_record_id(notebook_id)})

        if result:
            nb = result[0]
            return NotebookResponse(
                id=str(nb.get("id", "")),
                name=nb.get("name", ""),
                description=nb.get("description", ""),
                archived=nb.get("archived", False),
                notebook_type=nb.get("notebook_type", "cell"),
                state=nb.get("state", 0),
                is_admin=nb.get("is_admin", False),
                parent_id=nb.get("parent_id"),
                space_id=nb.get("space_id"),
                implementation_plan=nb.get("implementation_plan"),
                deadline=nb.get("deadline"),
                assigned=nb.get("assigned"),
                checklist=nb.get("checklist"),
                goal=nb.get("goal"),
                goal_file=nb.get("goal_file"),
                sort_order=nb.get("sort_order", 0),
                report=nb.get("report"),
                review_notes=nb.get("review_notes"),
                done=nb.get("done", False),
                accepted=nb.get("accepted", False),
                completed_at=nb.get("completed_at"),
                created=str(nb.get("created", "")),
                updated=str(nb.get("updated", "")),
                source_count=nb.get("source_count", 0),
                note_count=nb.get("note_count", 0),
            )

        # Fallback if query fails
        return NotebookResponse(
            id=notebook.id or "",
            name=notebook.name,
            description=notebook.description,
            archived=notebook.archived or False,
            notebook_type=notebook.notebook_type,
            state=notebook.state,
            is_admin=notebook.is_admin or False,
            parent_id=notebook.parent_id,
            space_id=notebook.space_id,
            implementation_plan=notebook.implementation_plan,
            deadline=notebook.deadline,
            assigned=notebook.assigned,
            checklist=notebook.checklist,
            goal=notebook.goal,
            goal_file=notebook.goal_file,
            sort_order=notebook.sort_order or 0,
            report=notebook.report,
            review_notes=notebook.review_notes,
            accepted=notebook.accepted,
            created=str(notebook.created),
            updated=str(notebook.updated),
            source_count=0,
            note_count=0,
        )
    except HTTPException:
        raise
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Notebook not found")
    except InvalidInputError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating notebook {notebook_id}: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Error updating notebook: {str(e)}"
        )


@router.post("/notebooks/{notebook_id}/sources/{source_id}")
async def add_source_to_notebook(notebook_id: str, source_id: str):
    """Add an existing source to a notebook (create the reference)."""
    try:
        # Verify the notebook and source exist (raises NotFoundError -> 404)
        await Notebook.get(notebook_id)
        await Source.get(source_id)

        # Check if reference already exists (idempotency)
        existing_ref = await repo_query(
            "SELECT * FROM reference WHERE out = $source_id AND in = $notebook_id",
            {
                "notebook_id": ensure_record_id(notebook_id),
                "source_id": ensure_record_id(source_id),
            },
        )

        # If reference doesn't exist, create it
        if not existing_ref:
            await repo_query(
                "RELATE $source_id->reference->$notebook_id",
                {
                    "notebook_id": ensure_record_id(notebook_id),
                    "source_id": ensure_record_id(source_id),
                },
            )

        return {"message": "Source linked to notebook successfully"}
    except HTTPException:
        raise
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Notebook or source not found")
    except Exception as e:
        logger.error(
            f"Error linking source {source_id} to notebook {notebook_id}: {str(e)}"
        )
        raise HTTPException(
            status_code=500, detail=f"Error linking source to notebook: {str(e)}"
        )


@router.delete("/notebooks/{notebook_id}/sources/{source_id}")
async def remove_source_from_notebook(notebook_id: str, source_id: str):
    """Remove a source from a notebook (delete the reference)."""
    try:
        # Verify the notebook exists (raises NotFoundError -> 404)
        await Notebook.get(notebook_id)

        # Delete the reference record linking source to notebook
        await repo_query(
            "DELETE FROM reference WHERE out = $notebook_id AND in = $source_id",
            {
                "notebook_id": ensure_record_id(notebook_id),
                "source_id": ensure_record_id(source_id),
            },
        )

        return {"message": "Source removed from notebook successfully"}
    except HTTPException:
        raise
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Notebook not found")
    except Exception as e:
        logger.error(
            f"Error removing source {source_id} from notebook {notebook_id}: {str(e)}"
        )
        raise HTTPException(
            status_code=500, detail=f"Error removing source from notebook: {str(e)}"
        )


@router.get("/notebooks/{notebook_id}/children", response_model=List[NotebookResponse])
async def get_notebook_children(notebook_id: str):
    """Get all child notebooks (subtasks) for a given notebook."""
    try:
        notebook = await Notebook.get(notebook_id)
        children = await notebook.get_children()

        return [
            NotebookResponse(
                id=child.id or "",
                name=child.name,
                description=child.description,
                archived=child.archived or False,
                notebook_type=child.notebook_type,
                state=child.state,
                is_admin=child.is_admin or False,
                parent_id=child.parent_id,
                space_id=child.space_id,
                implementation_plan=child.implementation_plan,
                deadline=child.deadline,
                assigned=child.assigned,
                checklist=child.checklist,
                report=child.report,
                accepted=child.accepted,
                created=str(child.created),
                updated=str(child.updated),
                source_count=0,
                note_count=0,
            )
            for child in children
        ]
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Notebook not found")
    except Exception as e:
        logger.error(f"Error fetching children for notebook {notebook_id}: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Error fetching children: {str(e)}"
        )


@router.delete("/notebooks/{notebook_id}", response_model=NotebookDeleteResponse)
async def delete_notebook(
    notebook_id: str,
    delete_exclusive_sources: bool = Query(
        False,
        description="Whether to delete sources that belong only to this notebook",
    ),
):
    """
    Delete a notebook with cascade deletion.

    Always deletes all notes associated with the notebook.
    If delete_exclusive_sources is True, also deletes sources that belong only
    to this notebook (not linked to any other notebooks).
    """
    try:
        notebook = await Notebook.get(notebook_id)

        result = await notebook.delete(delete_exclusive_sources=delete_exclusive_sources)

        return NotebookDeleteResponse(
            message="Notebook deleted successfully",
            deleted_notes=result["deleted_notes"],
            deleted_sources=result["deleted_sources"],
            unlinked_sources=result["unlinked_sources"],
        )
    except HTTPException:
        raise
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Notebook not found")
    except Exception as e:
        logger.error(f"Error deleting notebook {notebook_id}: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Error deleting notebook: {str(e)}"
        )


@router.post("/notebooks/{notebook_id}/goal-file")
async def upload_goal_file(notebook_id: str, file: UploadFile = File(...)):
    """Прикрепить файл к «Цели» карточки. Возвращает метаданные goal_file."""
    try:
        # Ленивый импорт — переиспользуем хранилище загрузок из sources.
        from api.routers.sources import save_uploaded_file

        notebook = await Notebook.get(notebook_id)
        path = await save_uploaded_file(file)
        meta = {
            "name": file.filename,
            "path": path,
            "size": os.path.getsize(path) if os.path.exists(path) else None,
        }
        notebook.goal_file = meta
        await notebook.save()
        # Вложенный объект надёжно кладём отдельным SET (как checklist): MERGE через
        # базовый save() теряет содержимое объекта.
        await repo_query(
            "UPDATE $id SET goal_file = $gf",
            {"id": ensure_record_id(notebook.id), "gf": meta},
        )
        return {"success": True, "goal_file": meta}
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Notebook not found")
    except Exception as e:
        logger.error(f"Error uploading goal file for {notebook_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error uploading goal file: {str(e)}")


@router.get("/notebooks/{notebook_id}/goal-file")
async def download_goal_file(notebook_id: str):
    """Скачать файл, прикреплённый к «Цели» карточки."""
    try:
        notebook = await Notebook.get(notebook_id)
        meta = notebook.goal_file or {}
        file_path = meta.get("path")
        if not file_path:
            raise HTTPException(status_code=404, detail="No goal file attached")

        safe_root = os.path.realpath(UPLOADS_FOLDER)
        resolved = os.path.realpath(file_path)
        if not resolved.startswith(safe_root + os.sep):
            raise HTTPException(status_code=403, detail="Access to file denied")
        if not os.path.exists(resolved):
            raise HTTPException(status_code=404, detail="File not found on server")

        return FileResponse(resolved, filename=meta.get("name") or os.path.basename(resolved))
    except HTTPException:
        raise
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Notebook not found")
    except Exception as e:
        logger.error(f"Error downloading goal file for {notebook_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error downloading goal file: {str(e)}")


@router.post("/notebooks/{notebook_id}/review-file")
async def upload_review_file(notebook_id: str, file: UploadFile = File(...)):
    """Загрузить файл/изображение для «Внесённых замечаний». Возвращает метаданные
    {name, path, size} — поле review_notes фронт кладёт отдельным PUT при возврате."""
    try:
        from api.routers.sources import save_uploaded_file

        # Проверяем существование карточки (404, если нет), сам файл не привязываем.
        await Notebook.get(notebook_id)
        path = await save_uploaded_file(file)
        meta = {
            "name": file.filename,
            "path": path,
            "size": os.path.getsize(path) if os.path.exists(path) else None,
        }
        return {"success": True, "file": meta}
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Notebook not found")
    except Exception as e:
        logger.error(f"Error uploading review file for {notebook_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error uploading review file: {str(e)}")


@router.get("/notebooks/{notebook_id}/review-file")
async def download_review_file(notebook_id: str):
    """Скачать файл, приложенный к «Внесённым замечаниям»."""
    try:
        notebook = await Notebook.get(notebook_id)
        meta = (notebook.review_notes or {}).get("file") or {}
        file_path = meta.get("path")
        if not file_path:
            raise HTTPException(status_code=404, detail="No review file attached")

        safe_root = os.path.realpath(UPLOADS_FOLDER)
        resolved = os.path.realpath(file_path)
        if not resolved.startswith(safe_root + os.sep):
            raise HTTPException(status_code=403, detail="Access to file denied")
        if not os.path.exists(resolved):
            raise HTTPException(status_code=404, detail="File not found on server")

        return FileResponse(resolved, filename=meta.get("name") or os.path.basename(resolved))
    except HTTPException:
        raise
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Notebook not found")
    except Exception as e:
        logger.error(f"Error downloading review file for {notebook_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error downloading review file: {str(e)}")


@router.delete("/notebooks/{notebook_id}/goal-file")
async def delete_goal_file(notebook_id: str):
    """Открепить файл от «Цели» карточки (сам файл на диске не трогаем)."""
    try:
        notebook = await Notebook.get(notebook_id)
        notebook.goal_file = None
        await notebook.save()
        await repo_query(
            "UPDATE $id SET goal_file = NONE",
            {"id": ensure_record_id(notebook_id)},
        )
        return {"success": True}
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Notebook not found")
    except Exception as e:
        logger.error(f"Error clearing goal file for {notebook_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error clearing goal file: {str(e)}")
