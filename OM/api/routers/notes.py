from typing import List, Literal, Optional

from fastapi import APIRouter, HTTPException, Query
from loguru import logger

from api.models import NoteCreate, NoteResponse, NoteUpdate
from open_notebook.database.repository import ensure_record_id, repo_query
from open_notebook.domain.notebook import Note
from open_notebook.exceptions import InvalidInputError, NotFoundError

router = APIRouter()


async def _parents_map(note_ids: List[str]) -> dict[str, dict]:
    """Непосредственный родитель заметок — ноутбук, к которому они привязаны
    (ребро artifact: note=in, notebook=out). Одним запросом для списка, без N+1.
    Если заметка привязана к нескольким ноутбукам — берём первого (стабильно по created)."""
    if not note_ids:
        return {}
    # SurrealDB v2 требует, чтобы поле ORDER BY присутствовало в проекции —
    # поэтому выбираем out.created отдельным алиасом и сортируем по нему.
    rows = await repo_query(
        """
        SELECT in AS note, out.id AS parent_id, out.name AS parent_name,
               out.created AS parent_created
        FROM artifact WHERE in IN $ids ORDER BY parent_created ASC
        """,
        {"ids": [ensure_record_id(i) for i in note_ids]},
    )
    parents: dict[str, dict] = {}
    for r in rows or []:
        note_key = str(r.get("note"))
        if note_key not in parents and r.get("parent_id"):
            parents[note_key] = {
                "parent_id": str(r.get("parent_id")),
                "parent_name": r.get("parent_name"),
            }
    return parents


@router.get("/notes", response_model=List[NoteResponse])
async def get_notes(
    notebook_id: Optional[str] = Query(None, description="Filter by notebook ID"),
):
    """Get all notes with optional notebook filtering."""
    try:
        if notebook_id:
            # Get notes for a specific notebook
            from open_notebook.domain.notebook import Notebook

            notebook = await Notebook.get(notebook_id)
            # include_content=True: список заметок в UI показывает превью и
            # открывает заметку прямо из списочных данных — контент нужен.
            notes = await notebook.get_notes(include_content=True)
        else:
            # Get all notes
            notes = await Note.get_all(order_by="updated desc")

        parents = await _parents_map([n.id for n in notes if n.id])
        return [
            NoteResponse(
                id=note.id or "",
                title=note.title,
                content=note.content,
                note_type=note.note_type,
                space_id=getattr(note, "space_id", None),
                parent_id=parents.get(note.id or "", {}).get("parent_id"),
                parent_name=parents.get(note.id or "", {}).get("parent_name"),
                created=str(note.created),
                updated=str(note.updated),
            )
            for note in notes
        ]
    except HTTPException:
        raise
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Notebook not found")
    except Exception as e:
        logger.error(f"Error fetching notes: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching notes: {str(e)}")


@router.post("/notes", response_model=NoteResponse)
async def create_note(note_data: NoteCreate):
    """Create a new note."""
    try:
        # Auto-generate title if not provided and it's an AI note
        title = note_data.title
        if not title and note_data.note_type == "ai" and note_data.content:
            from open_notebook.graphs.prompt import graph as prompt_graph

            prompt = "Based on the Note below, please provide a Title for this content, with max 15 words"
            result = await prompt_graph.ainvoke(
                {  # type: ignore[arg-type]
                    "input_text": note_data.content,
                    "prompt": prompt,
                }
            )
            title = result.get("output", "Untitled Note")

        # Validate note_type
        note_type: Optional[Literal["human", "ai"]] = None
        if note_data.note_type in ("human", "ai"):
            note_type = note_data.note_type  # type: ignore[assignment]
        elif note_data.note_type is not None:
            raise HTTPException(
                status_code=400, detail="note_type must be 'human' or 'ai'"
            )

        # Наследуем проект (space_id) от пространства ноутбука, если явно не задан —
        # чтобы заметка, созданная внутри проекта, попадала в тот же проект.
        effective_space_id: Optional[str] = note_data.space_id or None
        if effective_space_id is None and note_data.notebook_id:
            from open_notebook.domain.notebook import Notebook

            nb = await Notebook.get(note_data.notebook_id)
            if nb and getattr(nb, "space_id", None):
                effective_space_id = nb.space_id

        new_note = Note(
            title=title,
            content=note_data.content,
            note_type=note_type,
            space_id=effective_space_id,
        )
        command_id = await new_note.save()

        # Add to notebook if specified
        if note_data.notebook_id:
            from open_notebook.domain.notebook import Notebook

            # Verify the notebook exists (raises NotFoundError -> 404)
            await Notebook.get(note_data.notebook_id)
            await new_note.add_to_notebook(note_data.notebook_id)

        parents = await _parents_map([new_note.id] if new_note.id else [])
        parent = parents.get(new_note.id or "", {})
        return NoteResponse(
            id=new_note.id or "",
            title=new_note.title,
            content=new_note.content,
            note_type=new_note.note_type,
            space_id=getattr(new_note, "space_id", None),
            parent_id=parent.get("parent_id"),
            parent_name=parent.get("parent_name"),
            created=str(new_note.created),
            updated=str(new_note.updated),
            command_id=str(command_id) if command_id else None,
        )
    except HTTPException:
        raise
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Notebook not found")
    except InvalidInputError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating note: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error creating note: {str(e)}")


@router.get("/notes/{note_id}", response_model=NoteResponse)
async def get_note(note_id: str):
    """Get a specific note by ID."""
    try:
        note = await Note.get(note_id)

        parents = await _parents_map([note.id] if note.id else [])
        parent = parents.get(note.id or "", {})
        return NoteResponse(
            id=note.id or "",
            title=note.title,
            content=note.content,
            note_type=note.note_type,
            space_id=getattr(note, "space_id", None),
            parent_id=parent.get("parent_id"),
            parent_name=parent.get("parent_name"),
            created=str(note.created),
            updated=str(note.updated),
        )
    except HTTPException:
        raise
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Note not found")
    except Exception as e:
        logger.error(f"Error fetching note {note_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching note: {str(e)}")


@router.put("/notes/{note_id}", response_model=NoteResponse)
async def update_note(note_id: str, note_update: NoteUpdate):
    """Update a note."""
    try:
        note = await Note.get(note_id)

        # Update only provided fields
        if note_update.title is not None:
            note.title = note_update.title
        if note_update.content is not None:
            note.content = note_update.content
        if note_update.note_type is not None:
            if note_update.note_type in ("human", "ai"):
                note.note_type = note_update.note_type  # type: ignore[assignment]
            else:
                raise HTTPException(
                    status_code=400, detail="note_type must be 'human' or 'ai'"
                )
        if note_update.space_id is not None:
            # Пустая строка = дефолтная (глобальная) заметка (space_id = None).
            note.space_id = note_update.space_id or None

        command_id = await note.save()

        parents = await _parents_map([note.id] if note.id else [])
        parent = parents.get(note.id or "", {})
        return NoteResponse(
            id=note.id or "",
            title=note.title,
            content=note.content,
            note_type=note.note_type,
            space_id=getattr(note, "space_id", None),
            parent_id=parent.get("parent_id"),
            parent_name=parent.get("parent_name"),
            created=str(note.created),
            updated=str(note.updated),
            command_id=str(command_id) if command_id else None,
        )
    except HTTPException:
        raise
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Note not found")
    except InvalidInputError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating note {note_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error updating note: {str(e)}")


@router.delete("/notes/{note_id}")
async def delete_note(note_id: str):
    """Delete a note."""
    try:
        note = await Note.get(note_id)

        await note.delete()

        return {"message": "Note deleted successfully"}
    except HTTPException:
        raise
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Note not found")
    except Exception as e:
        logger.error(f"Error deleting note {note_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error deleting note: {str(e)}")
