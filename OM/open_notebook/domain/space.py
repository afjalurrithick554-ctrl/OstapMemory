from typing import ClassVar, List, Literal, Optional

from loguru import logger
from pydantic import field_validator

from open_notebook.domain.base import ObjectModel
from open_notebook.exceptions import InvalidInputError


class Space(ObjectModel):
    """Пространство сайдбара.

    kind="default" — системные неудаляемые пространства (Ярлыки, Поиск, Прогресс,
    Источники, Заметки, Архив), создаются миграцией и имеют устойчивый slug.
    kind="project" — пользовательские пространства-проекты (аналог вкладки «Ячейки»,
    но содержат только карточки этого проекта).
    """

    table_name: ClassVar[str] = "space"
    nullable_fields: ClassVar[set[str]] = {"slug", "icon", "description", "container_id"}

    name: str
    kind: Literal["default", "project"] = "project"
    # Устойчивый идентификатор дефолтного пространства для маршрутизации UI.
    slug: Optional[str] = None
    icon: Optional[str] = None
    # Описание пространства: для дефолтных задаётся миграцией, для проектов — пользователем.
    description: Optional[str] = None
    # Контейнер-notebook пространства (источники/заметки/чат уровня пространства).
    # Создаётся лениво при первом обращении к вкладкам пространства.
    container_id: Optional[str] = None
    # Неудаляемые пространства нельзя удалить через API (дефолтные).
    removable: bool = True
    # Архив — скрытое пространство: не показывается в обычном списке сайдбара.
    hidden: bool = False
    # Порядок отображения в сайдбаре.
    order: int = 0

    @field_validator("name")
    @classmethod
    def name_must_not_be_empty(cls, v):
        if not v.strip():
            raise InvalidInputError("Space name cannot be empty")
        return v

    @classmethod
    async def get_all(cls, order_by="order asc") -> List["Space"]:
        return await super().get_all(order_by=order_by)
