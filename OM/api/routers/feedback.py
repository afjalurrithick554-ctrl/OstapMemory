"""Dev Mode фидбек: фронт шлёт сюда комментарии по элементам интерфейса.

Пишем в файл {DATA_FOLDER}/dev_feedback.jsonl (одна JSON-строка на запись),
чтобы фидбек переживал перезагрузку и был доступен для разбора.
"""

import json
import os
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from open_notebook.config import DATA_FOLDER

router = APIRouter()

FEEDBACK_FILE = f"{DATA_FOLDER}/dev_feedback.jsonl"


class FeedbackRequest(BaseModel):
    element: str
    comment: str


class FeedbackResponse(BaseModel):
    status: str
    id: str


class FeedbackItem(BaseModel):
    id: str
    timestamp: str
    element: str
    comment: str
    done: bool


class FeedbackListResponse(BaseModel):
    items: list[FeedbackItem]
    total: int


def _read_all() -> list[dict]:
    if not os.path.exists(FEEDBACK_FILE):
        return []
    records = []
    with open(FEEDBACK_FILE, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                records.append(json.loads(line))
    return records


def _write_all(records: list[dict]) -> None:
    os.makedirs(DATA_FOLDER, exist_ok=True)
    with open(FEEDBACK_FILE, "w", encoding="utf-8") as f:
        for record in records:
            f.write(json.dumps(record, ensure_ascii=False) + "\n")


@router.get("/feedback", response_model=FeedbackListResponse)
async def list_feedback(done: Optional[bool] = None):
    """Получить список комментариев Dev Mode. ?done=false — только открытые."""
    records = _read_all()
    if done is not None:
        records = [r for r in records if r.get("done", False) == done]
    return FeedbackListResponse(items=records, total=len(records))


@router.post("/feedback", response_model=FeedbackResponse)
async def submit_feedback(body: FeedbackRequest):
    """Сохранить комментарий Dev Mode в файл (JSON Lines)."""
    os.makedirs(DATA_FOLDER, exist_ok=True)
    record = {
        "id": uuid.uuid4().hex[:8],
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "element": body.element,
        "comment": body.comment,
        "done": False,
    }
    with open(FEEDBACK_FILE, "a", encoding="utf-8") as f:
        f.write(json.dumps(record, ensure_ascii=False) + "\n")
    return FeedbackResponse(status="ok", id=record["id"])


@router.patch("/feedback/{feedback_id}", response_model=FeedbackResponse)
async def mark_feedback_done(feedback_id: str):
    """Отметить комментарий как выполненный (done=true)."""
    records = _read_all()
    found = False
    for record in records:
        if record["id"] == feedback_id:
            record["done"] = True
            found = True
            break
    if not found:
        raise HTTPException(status_code=404, detail=f"Feedback {feedback_id} not found")
    _write_all(records)
    return FeedbackResponse(status="ok", id=feedback_id)
