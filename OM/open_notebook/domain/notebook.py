import asyncio
import os
from pathlib import Path
from typing import Any, ClassVar, Dict, List, Literal, Optional, Tuple, Union

from loguru import logger
from pydantic import BaseModel, ConfigDict, Field, field_validator
from surreal_commands import submit_command
from surrealdb import RecordID

from open_notebook.database.repository import ensure_record_id, repo_query
from open_notebook.domain.base import ObjectModel
from open_notebook.exceptions import DatabaseOperationError, InvalidInputError


class Notebook(ObjectModel):
    table_name: ClassVar[str] = "notebook"
    nullable_fields: ClassVar[set[str]] = {
        "implementation_plan", "deadline", "assigned", "checklist", "parent_id",
        "report", "accepted", "is_admin", "done", "completed_at", "space_id",
        "goal", "goal_file", "review_notes",
    }
    name: str
    description: str
    archived: Optional[bool] = False
    notebook_type: Literal["cell", "task", "subtask"] = "cell"
    # Административная ячейка: рендерится в противоположной теме (см. фронтенд).
    is_admin: Optional[bool] = False
    # Служебный контейнер пространства: хранит источники/заметки/чат уровня
    # пространства. Скрыт из «Ячеек» и досок пространств (см. api).
    is_container: Optional[bool] = False
    state: int = 0
    parent_id: Optional[str] = None
    # Привязка к пользовательскому проекту (space kind=project). None — глобальная
    # карточка, видна только в «Ячейках»; в проекте видны карточки со своим space_id.
    space_id: Optional[str] = None
    implementation_plan: Optional[dict] = None
    deadline: Optional[str] = None
    assigned: Optional[str] = None
    checklist: Optional[list] = Field(default_factory=list)
    # «Цель ячейки/задачи» — простое поле (заменяет обязательный чек-лист «Цель»).
    # goal — текст; goal_file — метаданные приложенного файла {name, path, size}.
    goal: Optional[str] = None
    goal_file: Optional[dict] = None
    # Ручной порядок карточки внутри её группы состояния (вертикальный DnD в пространстве).
    # order — зарезервированное слово SurrealQL, поэтому поле называется sort_order.
    sort_order: Optional[int] = 0
    # Отчёт о выполнении — append-журнал записей {author, at, text}: кто, когда и
    # что зафиксировал. Из бэкенд-условий перехода исключён (см. _check_state_transitions).
    # Дописывается по одной записи через PUT (роутер сам проставляет at).
    report: Optional[list] = Field(default_factory=list)
    # «Внесённые замечания» — заполняются пользователем при возврате задачи из
    # «Можно проверять» (3) в «В работе» (2). Объект {text, url, file, created}.
    review_notes: Optional[dict] = None
    # Один UI-тумблер, два флага на двух стадиях:
    # done — «Готово» (В работе → Можно проверять, 2→3),
    # accepted — «Проверено» (Можно проверять → Завершено, 3→4).
    done: Optional[bool] = False
    accepted: Optional[bool] = False
    # Дата входа в «Завершено» (state 4). База для вычисляемого архива (n=14 дней).
    completed_at: Optional[str] = None

    def _checklist_has_items(self) -> bool:
        # checklist хранит массив именованных чек-листов [{title, items:[...]}].
        # Поддерживаем и старую плоскую форму [{title, isCompleted}] на всякий случай.
        for entry in self.checklist or []:
            if not isinstance(entry, dict):
                continue
            items = entry.get("items")
            if isinstance(items, list):
                if any(
                    (it.get("title") or "").strip()
                    for it in items
                    if isinstance(it, dict)
                ):
                    return True
            elif (entry.get("title") or "").strip():
                return True
        return False

    def _goal_checklist_has_item(self) -> bool:
        # Обязательный чек-лист «Цель задачи»/«Цель ячейки» помечен isDefault=true.
        # Для перехода 0→1 нужен ≥1 пункт с непустым заголовком (выполнен или нет).
        # Если помеченного по умолчанию нет (легаси) — смотрим любые чек-листы.
        entries = self.checklist or []
        default_entries = [
            e for e in entries if isinstance(e, dict) and e.get("isDefault")
        ]
        scan = default_entries if default_entries else entries
        for entry in scan:
            if not isinstance(entry, dict):
                continue
            for it in entry.get("items") or []:
                if isinstance(it, dict) and (it.get("title") or "").strip():
                    return True
        return False

    def _plan_finalized(self) -> bool:
        # План двигает 1→2 только после явного нажатия «План готов» (finalized=true);
        # черновик плана состояние не меняет.
        p = self.implementation_plan
        return bool(p and p.get("text") and p.get("finalized"))

    def _goal_present(self) -> bool:
        # «Цель» теперь простое поле goal. Легаси: до перехода цель хранилась в
        # дефолтном чек-листе — учитываем и его, чтобы старые задачи не откатывались.
        if (self.goal or "").strip():
            return True
        return self._goal_checklist_has_item()

    def _mandatory_checklist_done(self) -> bool:
        # Гейт «Завершено»: все пункты ДОПОЛНИТЕЛЬНЫХ (не-isDefault) чек-листов
        # отмечены. Дефолтный (isDefault) чек-лист — это контейнер ЦЕЛИ: его пункт
        # по смыслу заполняется, а не «отмечается» (условие 0→1), поэтому завершение
        # он НЕ блокирует. Если дополнительных чек-листов нет — условие выполнено.
        for entry in self.checklist or []:
            if not isinstance(entry, dict) or entry.get("isDefault"):
                continue
            for it in entry.get("items") or []:
                if not isinstance(it, dict):
                    continue
                if (it.get("title") or "").strip() and not it.get("isCompleted"):
                    return False
        return True

    def _check_state_transitions(self):
        # Состояние — чистая производная от СОБСТВЕННЫХ полей и тумблеров карточки,
        # пересчитывается при каждом save() в обе стороны. Удаление данных из
        # поля-условия каскадно опускает состояние; заполнение — поднимает.
        #
        # Эпик и подзадачи независимы в обе стороны: изменение статуса/состояния
        # подзадачи НЕ двигает родителя (эпик остаётся ячейкой), и наоборот —
        # состояние родителя не смотрит на детей. Связь parent↔child чисто
        # структурная (вложенность). Монотонная лестница:
        #   Идея(0) → Готово к работе(1) → В работе(2) → Можно проверять(3) → Завершено(4)
        #
        # Ячейка — всегда «Новая ячейка» (0): у неё нет исполнителя/цели-условия,
        # условие 0→1 физически невыполнимо. Оставляем явный guard.
        if self.notebook_type == "cell":
            self.state = 0
            self.completed_at = None
            return

        level = 0
        # 0→1 (Готово к работе): имя, описание, исполнитель и заполненная «Цель».
        # Дедлайн и план сюда больше НЕ входят — они условие следующего шага.
        if (
            self.name
            and self.description
            and self.assigned
            and self._goal_present()
        ):
            level = 1
            # 1→2 (В работе): появились дедлайн и финализированный план реализации.
            if self.deadline and self._plan_finalized():
                level = 2
                # 2→3 (Можно проверять): нажат тумблер «Готово». Отчёт в условие
                # НЕ входит (промежуточные отчёты состояние не двигают).
                if self.done:
                    level = 3
                    # 3→4 (Завершено): «Проверено» И закрыты все подзадачи и
                    # обязательный чек-лист.
                    if self.accepted and self._mandatory_checklist_done():
                        level = 4

        self.state = level
        # completed_at фиксируется при входе в «Завершено», сбрасывается при выходе
        # (в т.ч. при каскадном откате из-за очистки любого поля-условия).
        if level == 4:
            if not self.completed_at:
                from datetime import date

                self.completed_at = date.today().isoformat()
        else:
            self.completed_at = None

    async def save(self):
        # Состояние — производная только собственных полей карточки (эпик и
        # подзадачи независимы), поэтому запросов к детям здесь нет.
        self._check_state_transitions()
        return await super().save()

    @field_validator("name")
    @classmethod
    def name_must_not_be_empty(cls, v):
        if not v.strip():
            raise InvalidInputError("Notebook name cannot be empty")
        return v

    async def get_children(self) -> List["Notebook"]:
        """Get all child notebooks (subtasks/children of this notebook)."""
        try:
            children = await repo_query(
                "select * from notebook where parent_id = $id order by created desc",
                {"id": str(self.id)},
            )
            return [Notebook(**child) for child in children] if children else []
        except Exception as e:
            logger.error(f"Error fetching children for notebook {self.id}: {str(e)}")
            logger.exception(e)
            raise DatabaseOperationError(e)

    async def get_parent(self) -> Optional["Notebook"]:
        """Get parent notebook if this is a child."""
        if not self.parent_id:
            return None
        try:
            return await Notebook.get(self.parent_id)
        except Exception as e:
            logger.error(f"Error fetching parent for notebook {self.id}: {str(e)}")
            logger.exception(e)
            raise DatabaseOperationError(e)

    async def get_sources(self, include_full_text: bool = False) -> List["Source"]:
        try:
            source_projection = "" if include_full_text else " omit source.full_text"
            srcs = await repo_query(
                f"""
                select *{source_projection} from (
                select in as source from reference where out=$id
                fetch source
            ) order by source.updated desc
            """,
                {"id": ensure_record_id(self.id)},
            )
            return [Source(**src["source"]) for src in srcs] if srcs else []
        except Exception as e:
            logger.error(f"Error fetching sources for notebook {self.id}: {str(e)}")
            logger.exception(e)
            raise DatabaseOperationError(e)

    async def get_notes(self, include_content: bool = False) -> List["Note"]:
        try:
            note_projection = (
                " omit note.embedding"
                if include_content
                else " omit note.content, note.embedding"
            )
            srcs = await repo_query(
                f"""
            select *{note_projection} from (
                select in as note from artifact where out=$id
                fetch note
            ) order by note.updated desc
            """,
                {"id": ensure_record_id(self.id)},
            )
            return [Note(**src["note"]) for src in srcs] if srcs else []
        except Exception as e:
            logger.error(f"Error fetching notes for notebook {self.id}: {str(e)}")
            logger.exception(e)
            raise DatabaseOperationError(e)

    async def get_context(self) -> str:
        """
        Build long-form notebook context for podcast and LLM workflows.

        Normal list retrieval omits large source/note bodies, so this method uses
        opt-in full-content fetches and formats only substantive context blocks.
        """
        sources = await self.get_sources(include_full_text=True)
        notes = await self.get_notes(include_content=True)
        context_blocks = []

        for source in sources:
            source_context = await source.get_context(context_size="long")
            if isinstance(source_context, dict):
                title = source_context.get("title") or source.title or "Untitled source"
                full_text = source_context.get("full_text")
                insights = source_context.get("insights") or []

                content_parts = []
                if full_text:
                    content_parts.append(str(full_text))

                insight_lines = []
                for insight in insights:
                    if not isinstance(insight, dict):
                        continue

                    insight_content = insight.get("content")
                    if not insight_content:
                        continue

                    insight_type = insight.get("insight_type") or "Insight"
                    insight_lines.append(f"- {insight_type}: {insight_content}")

                if insight_lines:
                    content_parts.append("Insights:\n" + "\n".join(insight_lines))

                content = "\n\n".join(content_parts).strip()
            else:
                title = source.title or "Untitled source"
                content = str(source_context).strip()

            if content:
                context_blocks.append(f"## Source: {title}\n\n{content}")

        for note in notes:
            note_context = note.get_context(context_size="long")
            if isinstance(note_context, dict):
                title = note_context.get("title") or note.title or "Untitled note"
                content = note_context.get("content")
                content = str(content).strip() if content else ""
            else:
                title = note.title or "Untitled note"
                content = str(note_context).strip()

            if content:
                context_blocks.append(f"## Note: {title}\n\n{content}")

        return "\n\n".join(context_blocks)

    async def get_chat_sessions(self) -> List["ChatSession"]:
        try:
            srcs = await repo_query(
                """
                select * from (
                    select
                    <- chat_session as chat_session
                    from refers_to
                    where out=$id
                    fetch chat_session
                )
                order by chat_session.updated desc
            """,
                {"id": ensure_record_id(self.id)},
            )
            return (
                [ChatSession(**src["chat_session"][0]) for src in srcs] if srcs else []
            )
        except Exception as e:
            logger.error(
                f"Error fetching chat sessions for notebook {self.id}: {str(e)}"
            )
            logger.exception(e)
            raise DatabaseOperationError(e)

    async def get_delete_preview(self) -> Dict[str, Any]:
        """
        Get counts of items that would be affected by deleting this notebook.

        Returns a dict with:
        - note_count: Number of notes that will be deleted
        - exclusive_source_count: Sources only in this notebook (can be deleted)
        - shared_source_count: Sources in other notebooks (will be unlinked only)
        """
        try:
            notebook_id = ensure_record_id(self.id)

            # Count notes
            note_result = await repo_query(
                "SELECT count() as count FROM artifact WHERE out = $notebook_id GROUP ALL",
                {"notebook_id": notebook_id},
            )
            note_count = note_result[0]["count"] if note_result else 0

            # Get sources with count of references to OTHER notebooks
            # If assigned_others = 0, source is exclusive to this notebook
            # If assigned_others > 0, source is shared with other notebooks
            source_counts = await repo_query(
                """
                SELECT
                    id,
                    count(->reference[WHERE out != $notebook_id].out) as assigned_others
                FROM (SELECT VALUE <-reference.in AS sources FROM $notebook_id)[0]
                """,
                {"notebook_id": notebook_id},
            )

            exclusive_count = 0
            shared_count = 0
            for src in source_counts:
                if src.get("assigned_others", 0) == 0:
                    exclusive_count += 1
                else:
                    shared_count += 1

            return {
                "note_count": note_count,
                "exclusive_source_count": exclusive_count,
                "shared_source_count": shared_count,
            }
        except Exception as e:
            logger.error(f"Error getting delete preview for notebook {self.id}: {e}")
            logger.exception(e)
            raise DatabaseOperationError(e)

    async def delete(self, delete_exclusive_sources: bool = False) -> Dict[str, int]:
        """
        Delete notebook with cascade deletion of notes and optional source deletion.

        Args:
            delete_exclusive_sources: If True, also delete sources that belong
                                     only to this notebook. Default is False.

        Returns:
            Dict with counts: deleted_notes, deleted_sources, unlinked_sources
        """
        if self.id is None:
            raise InvalidInputError("Cannot delete notebook without an ID")

        try:
            notebook_id = ensure_record_id(self.id)
            deleted_notes = 0
            deleted_sources = 0
            unlinked_sources = 0

            # 1. Get and delete all notes linked to this notebook
            notes = await self.get_notes()
            for note in notes:
                await note.delete()
                deleted_notes += 1
            logger.info(f"Deleted {deleted_notes} notes for notebook {self.id}")

            # Delete artifact relationships
            await repo_query(
                "DELETE artifact WHERE out = $notebook_id",
                {"notebook_id": notebook_id},
            )

            # 2. Handle sources
            if delete_exclusive_sources:
                # Find sources with count of references to OTHER notebooks
                # If assigned_others = 0, source is exclusive to this notebook
                source_counts = await repo_query(
                    """
                    SELECT
                        id,
                        count(->reference[WHERE out != $notebook_id].out) as assigned_others
                    FROM (SELECT VALUE <-reference.in AS sources FROM $notebook_id)[0]
                    """,
                    {"notebook_id": notebook_id},
                )

                for src in source_counts:
                    source_id = src.get("id")
                    if source_id and src.get("assigned_others", 0) == 0:
                        # Exclusive source - delete it
                        try:
                            source = await Source.get(str(source_id))
                            await source.delete()
                            deleted_sources += 1
                        except Exception as e:
                            logger.warning(
                                f"Failed to delete exclusive source {source_id}: {e}"
                            )
                    else:
                        unlinked_sources += 1
            else:
                # Just count sources that will be unlinked
                source_result = await repo_query(
                    "SELECT count() as count FROM reference WHERE out = $notebook_id GROUP ALL",
                    {"notebook_id": notebook_id},
                )
                unlinked_sources = source_result[0]["count"] if source_result else 0

            # Delete reference relationships (unlink all sources)
            await repo_query(
                "DELETE reference WHERE out = $notebook_id",
                {"notebook_id": notebook_id},
            )
            logger.info(
                f"Unlinked {unlinked_sources} sources, deleted {deleted_sources} "
                f"exclusive sources for notebook {self.id}"
            )

            # 3. Delete the notebook record itself
            await super().delete()
            logger.info(f"Deleted notebook {self.id}")

            return {
                "deleted_notes": deleted_notes,
                "deleted_sources": deleted_sources,
                "unlinked_sources": unlinked_sources,
            }

        except Exception as e:
            logger.error(f"Error deleting notebook {self.id}: {e}")
            logger.exception(e)
            raise DatabaseOperationError(f"Failed to delete notebook: {e}")


class Asset(BaseModel):
    file_path: Optional[str] = None
    url: Optional[str] = None


class SourceEmbedding(ObjectModel):
    table_name: ClassVar[str] = "source_embedding"
    content: str

    async def get_source(self) -> "Source":
        try:
            src = await repo_query(
                """
            select source.* from $id fetch source
            """,
                {"id": ensure_record_id(self.id)},
            )
            return Source(**src[0]["source"])
        except Exception as e:
            logger.error(f"Error fetching source for embedding {self.id}: {str(e)}")
            logger.exception(e)
            raise DatabaseOperationError(e)


class SourceInsight(ObjectModel):
    table_name: ClassVar[str] = "source_insight"
    insight_type: str
    content: str

    async def get_source(self) -> "Source":
        try:
            src = await repo_query(
                """
            select source.* from $id fetch source
            """,
                {"id": ensure_record_id(self.id)},
            )
            return Source(**src[0]["source"])
        except Exception as e:
            logger.error(f"Error fetching source for insight {self.id}: {str(e)}")
            logger.exception(e)
            raise DatabaseOperationError(e)

    async def save_as_note(self, notebook_id: Optional[str] = None) -> Any:
        source = await self.get_source()
        note = Note(
            title=f"{self.insight_type} from source {source.title}",
            content=self.content,
        )
        await note.save()
        if notebook_id:
            await note.add_to_notebook(notebook_id)
        return note


class Source(ObjectModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)

    table_name: ClassVar[str] = "source"
    nullable_fields: ClassVar[set[str]] = {"space_id"}
    asset: Optional[Asset] = None
    title: Optional[str] = None
    topics: Optional[List[str]] = Field(default_factory=list)
    full_text: Optional[str] = None
    # Привязка к проекту (space kind=project). None — дефолтный (глобальный) источник.
    space_id: Optional[str] = None
    command: Optional[Union[str, RecordID]] = Field(
        default=None, description="Link to surreal-commands processing job"
    )

    @field_validator("command", mode="before")
    @classmethod
    def parse_command(cls, value):
        """Parse command field to ensure RecordID format"""
        if isinstance(value, str) and value:
            return ensure_record_id(value)
        return value

    @field_validator("id", mode="before")
    @classmethod
    def parse_id(cls, value):
        """Parse id field to handle both string and RecordID inputs"""
        if value is None:
            return None
        if isinstance(value, RecordID):
            return str(value)
        return str(value) if value else None

    async def get_status(self) -> Optional[str]:
        """Get the processing status of the associated command"""
        if not self.command:
            return None

        try:
            from surreal_commands import get_command_status

            status = await get_command_status(str(self.command))
            return status.status if status else "unknown"
        except Exception as e:
            logger.warning(f"Failed to get command status for {self.command}: {e}")
            return "unknown"

    async def get_processing_progress(self) -> Optional[Dict[str, Any]]:
        """Get detailed processing information for the associated command"""
        if not self.command:
            return None

        try:
            from surreal_commands import get_command_status

            status_result = await get_command_status(str(self.command))
            if not status_result:
                return None

            # Extract execution metadata if available
            result = getattr(status_result, "result", None)
            execution_metadata = (
                result.get("execution_metadata", {}) if isinstance(result, dict) else {}
            )

            return {
                "status": status_result.status,
                "started_at": execution_metadata.get("started_at"),
                "completed_at": execution_metadata.get("completed_at"),
                "error": getattr(status_result, "error_message", None),
                "result": result,
            }
        except Exception as e:
            logger.warning(f"Failed to get command progress for {self.command}: {e}")
            return None

    async def get_context(
        self, context_size: Literal["short", "long"] = "short"
    ) -> Dict[str, Any]:
        insights_list = await self.get_insights()
        insights = [insight.model_dump() for insight in insights_list]
        if context_size == "long":
            return dict(
                id=self.id,
                title=self.title,
                insights=insights,
                full_text=self.full_text,
            )
        else:
            return dict(id=self.id, title=self.title, insights=insights)

    async def get_embedded_chunks(self) -> int:
        try:
            result = await repo_query(
                """
                select count() as chunks from source_embedding where source=$id GROUP ALL
                """,
                {"id": ensure_record_id(self.id)},
            )
            if len(result) == 0:
                return 0
            return result[0]["chunks"]
        except Exception as e:
            logger.error(f"Error fetching chunks count for source {self.id}: {str(e)}")
            logger.exception(e)
            raise DatabaseOperationError(f"Failed to count chunks for source: {str(e)}")

    async def get_insights(self) -> List[SourceInsight]:
        try:
            result = await repo_query(
                """
                SELECT * FROM source_insight WHERE source=$id
                """,
                {"id": ensure_record_id(self.id)},
            )
            return [SourceInsight(**insight) for insight in result]
        except Exception as e:
            logger.error(f"Error fetching insights for source {self.id}: {str(e)}")
            logger.exception(e)
            raise DatabaseOperationError("Failed to fetch insights for source")

    async def add_to_notebook(self, notebook_id: str) -> Any:
        if not notebook_id:
            raise InvalidInputError("Notebook ID must be provided")
        return await self.relate("reference", notebook_id)

    async def vectorize(self) -> str:
        """
        Submit vectorization as a background job using the embed_source command.

        This method leverages the job-based architecture to prevent HTTP connection
        pool exhaustion when processing large documents. The embed_source command:
        1. Detects content type from file path
        2. Chunks text using content-type aware splitter
        3. Generates all embeddings in batches
        4. Bulk inserts source_embedding records

        Returns:
            str: The command/job ID that can be used to track progress via the commands API

        Raises:
            ValueError: If source has no text to vectorize
            DatabaseOperationError: If job submission fails
        """
        logger.info(f"Submitting embed_source job for source {self.id}")

        try:
            if not self.full_text or not self.full_text.strip():
                raise ValueError(f"Source {self.id} has no text to vectorize")

            # Submit the embed_source command
            command_id = submit_command(
                "open_notebook",
                "embed_source",
                {"source_id": str(self.id)},
            )

            command_id_str = str(command_id)
            logger.info(
                f"Embed source job submitted for source {self.id}: "
                f"command_id={command_id_str}"
            )

            return command_id_str

        except ValueError:
            raise
        except Exception as e:
            logger.error(
                f"Failed to submit embed_source job for source {self.id}: {e}"
            )
            logger.exception(e)
            raise DatabaseOperationError(e)

    async def add_insight(self, insight_type: str, content: str) -> Optional[str]:
        """
        Submit insight creation as an async command (fire-and-forget).

        Submits a create_insight command that handles database operations with
        automatic retry logic for transaction conflicts. The command also submits
        an embed_insight command for async embedding.

        This method returns immediately after submitting the command - it does NOT
        wait for the insight to be created. Use this for batch operations where
        throughput is more important than immediate confirmation.

        Args:
            insight_type: Type/category of the insight
            content: The insight content text

        Returns:
            command_id for optional tracking, or None if submission failed

        Raises:
            InvalidInputError: If insight_type or content is empty
        """
        if not insight_type or not content:
            raise InvalidInputError("Insight type and content must be provided")

        try:
            # Submit create_insight command (fire-and-forget)
            # Command handles retries internally for transaction conflicts
            command_id = submit_command(
                "open_notebook",
                "create_insight",
                {
                    "source_id": str(self.id),
                    "insight_type": insight_type,
                    "content": content,
                },
            )
            logger.info(
                f"Submitted create_insight command {command_id} for source {self.id} "
                f"(type={insight_type})"
            )
            return str(command_id)

        except Exception as e:
            logger.error(f"Error submitting create_insight for source {self.id}: {e}")
            return None

    def _prepare_save_data(self) -> dict:
        """Override to ensure command field is always RecordID format for database"""
        data = super()._prepare_save_data()

        # Ensure command field is RecordID format if not None
        if data.get("command") is not None:
            data["command"] = ensure_record_id(data["command"])

        return data

    async def delete(self) -> bool:
        """Delete source and clean up associated file, embeddings, and insights."""
        # Clean up uploaded file if it exists
        if self.asset and self.asset.file_path:
            file_path = Path(self.asset.file_path)
            if file_path.exists():
                try:
                    os.unlink(file_path)
                    logger.info(f"Deleted file for source {self.id}: {file_path}")
                except Exception as e:
                    logger.warning(
                        f"Failed to delete file {file_path} for source {self.id}: {e}. "
                        "Continuing with database deletion."
                    )
            else:
                logger.debug(
                    f"File {file_path} not found for source {self.id}, skipping cleanup"
                )

        # Delete associated embeddings and insights to prevent orphaned records
        try:
            source_id = ensure_record_id(self.id)
            await repo_query(
                "DELETE source_embedding WHERE source = $source_id",
                {"source_id": source_id},
            )
            await repo_query(
                "DELETE source_insight WHERE source = $source_id",
                {"source_id": source_id},
            )
            logger.debug(f"Deleted embeddings and insights for source {self.id}")
        except Exception as e:
            logger.warning(
                f"Failed to delete embeddings/insights for source {self.id}: {e}. "
                "Continuing with source deletion."
            )

        # Call parent delete to remove database record
        return await super().delete()


class Note(ObjectModel):
    table_name: ClassVar[str] = "note"
    nullable_fields: ClassVar[set[str]] = {"space_id"}
    title: Optional[str] = None
    note_type: Optional[Literal["human", "ai"]] = None
    content: Optional[str] = None
    # Привязка к проекту (space kind=project). None — дефолтная (глобальная) заметка.
    space_id: Optional[str] = None

    @field_validator("content")
    @classmethod
    def content_must_not_be_empty(cls, v):
        if v is not None and not v.strip():
            raise InvalidInputError("Note content cannot be empty")
        return v

    async def save(self) -> Optional[str]:
        """
        Save the note and submit embedding command.

        Overrides ObjectModel.save() to submit an async embed_note command
        after saving, instead of inline embedding.

        Returns:
            Optional[str]: The command_id if embedding was submitted, None otherwise
        """
        # Call parent save (without embedding)
        await super().save()

        # Submit embedding command (fire-and-forget) if note has content
        if self.id and self.content and self.content.strip():
            command_id = submit_command(
                "open_notebook",
                "embed_note",
                {"note_id": str(self.id)},
            )
            logger.debug(f"Submitted embed_note command {command_id} for {self.id}")
            return command_id

        return None

    async def add_to_notebook(self, notebook_id: str) -> Any:
        if not notebook_id:
            raise InvalidInputError("Notebook ID must be provided")
        return await self.relate("artifact", notebook_id)

    def get_context(
        self, context_size: Literal["short", "long"] = "short"
    ) -> Dict[str, Any]:
        if context_size == "long":
            return dict(id=self.id, title=self.title, content=self.content)
        else:
            return dict(
                id=self.id,
                title=self.title,
                content=self.content[:100] if self.content else None,
            )


class ChatSession(ObjectModel):
    table_name: ClassVar[str] = "chat_session"
    nullable_fields: ClassVar[set[str]] = {"model_override"}
    title: Optional[str] = None
    model_override: Optional[str] = None

    async def relate_to_notebook(self, notebook_id: str) -> Any:
        if not notebook_id:
            raise InvalidInputError("Notebook ID must be provided")
        return await self.relate("refers_to", notebook_id)

    async def relate_to_source(self, source_id: str) -> Any:
        if not source_id:
            raise InvalidInputError("Source ID must be provided")
        return await self.relate("refers_to", source_id)


async def text_search(
    keyword: str, results: int, source: bool = True, note: bool = True
):
    if not keyword:
        raise InvalidInputError("Search keyword cannot be empty")
    try:
        search_results = await repo_query(
            """
            select *
            from fn::text_search($keyword, $results, $source, $note)
            """,
            {"keyword": keyword, "results": results, "source": source, "note": note},
        )
        return search_results
    except RuntimeError as e:
        # SurrealDB's search::highlight can compute a byte position that exceeds the
        # stored string length on large or multi-byte chunks, aborting the whole query
        # ("position overflow"). Fall back to vector search so the user still gets
        # results instead of a 500. See issue #648.
        if "position overflow" in str(e):
            logger.warning(
                f"Highlight position overflow, falling back to vector search: {str(e)}"
            )
            try:
                return await vector_search(keyword, results, source, note)
            except Exception as ve:
                # Both search paths failed (e.g. no embedding model configured).
                # Surface the failure instead of returning [] — an empty list would
                # be indistinguishable from a legitimate "no matches" and mask a
                # total search outage from callers.
                logger.error(f"Vector search fallback also failed: {str(ve)}")
                logger.exception(ve)
                raise DatabaseOperationError(ve)
        logger.error(f"Error performing text search: {str(e)}")
        logger.exception(e)
        raise DatabaseOperationError(e)
    except Exception as e:
        logger.error(f"Error performing text search: {str(e)}")
        logger.exception(e)
        raise DatabaseOperationError(e)


async def vector_search(
    keyword: str,
    results: int,
    source: bool = True,
    note: bool = True,
    minimum_score=0.2,
):
    if not keyword:
        raise InvalidInputError("Search keyword cannot be empty")
    try:
        from open_notebook.utils.embedding import generate_embedding

        # Use unified embedding function (handles chunking if query is very long)
        embed = await generate_embedding(keyword)
        search_results = await repo_query(
            """
            SELECT * FROM fn::vector_search($embed, $results, $source, $note, $minimum_score);
            """,
            {
                "embed": embed,
                "results": results,
                "source": source,
                "note": note,
                "minimum_score": minimum_score,
            },
        )
        return search_results
    except Exception as e:
        logger.error(f"Error performing vector search: {str(e)}")
        logger.exception(e)
        raise DatabaseOperationError(e)
