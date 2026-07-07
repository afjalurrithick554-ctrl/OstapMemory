"""
Юнит-тесты машины состояний Notebook (_check_state_transitions).

Проверяем чистую производную логику без БД: собираем Notebook и вызываем
_check_state_transitions() напрямую, читаем self.state / self.completed_at.

Модель состояний (утв. 2026-07-02):
  Идея(0) → Готово к работе(1) → В работе(2) → Можно проверять(3) → Завершено(4)
Ячейка всегда 0. Переходы обратимы (каскадный откат при очистке поля-условия).
"""

from datetime import date

from open_notebook.domain.notebook import Notebook


def _goal_checklist(title="Цель задачи", item="Сделать штуку"):
    return [{"title": title, "isDefault": True, "items": [{"title": item, "isCompleted": False}]}]


def _ready_task(**overrides):
    """Задача с полным набором полей для состояния 1 (Готово к работе)."""
    data = dict(
        name="Задача",
        description="Описание",
        notebook_type="task",
        deadline="2026-07-10",
        assigned="Боба",
        checklist=_goal_checklist(),
    )
    data.update(overrides)
    return Notebook(**data)


def _apply(nb):
    nb._check_state_transitions()
    return nb


# --- Ячейка ---------------------------------------------------------------

def test_cell_always_state_0():
    nb = Notebook(
        name="Ячейка", description="Опис", notebook_type="cell",
        deadline="2026-07-10", assigned="Боба", checklist=_goal_checklist(),
    )
    _apply(nb)
    assert nb.state == 0
    assert nb.completed_at is None


# --- 0 → 1 (Идея → Готово к работе) --------------------------------------

def test_idea_missing_deadline_stays_0():
    nb = _ready_task(deadline=None)
    _apply(nb)
    assert nb.state == 0


def test_idea_missing_assigned_stays_0():
    nb = _ready_task(assigned=None)
    _apply(nb)
    assert nb.state == 0


def test_idea_empty_goal_checklist_stays_0():
    nb = _ready_task(checklist=[{"title": "Цель задачи", "isDefault": True, "items": []}])
    _apply(nb)
    assert nb.state == 0


def test_ready_when_all_fields_present():
    nb = _ready_task()
    _apply(nb)
    assert nb.state == 1


def test_goal_item_counts_even_if_not_completed():
    # ≥1 непустой пункт достаточно, выполнять его не требуется.
    nb = _ready_task(checklist=_goal_checklist(item="Не выполнено"))
    _apply(nb)
    assert nb.state == 1


# --- 1 → 2 (Готово к работе → В работе) ----------------------------------

def test_draft_plan_does_not_advance():
    nb = _ready_task(implementation_plan={"text": "черновик"})
    _apply(nb)
    assert nb.state == 1  # план не финализирован


def test_finalized_plan_advances_to_in_progress():
    nb = _ready_task(implementation_plan={"text": "план", "finalized": True})
    _apply(nb)
    assert nb.state == 2


def test_finalized_but_empty_text_does_not_advance():
    nb = _ready_task(implementation_plan={"text": "", "finalized": True})
    _apply(nb)
    assert nb.state == 1


# --- 2 → 3 (В работе → Можно проверять) ----------------------------------

def test_report_alone_does_not_advance():
    # Ключевой фикс: непустой отчёт сам по себе НЕ двигает состояние.
    nb = _ready_task(
        implementation_plan={"text": "план", "finalized": True},
        report="Промежуточный отчёт",
    )
    _apply(nb)
    assert nb.state == 2


def test_done_toggle_advances_to_review():
    nb = _ready_task(
        implementation_plan={"text": "план", "finalized": True},
        report="Отчёт",
        done=True,
    )
    _apply(nb)
    assert nb.state == 3


def test_done_without_plan_stays_ready():
    # done без финализированного плана не перепрыгивает стадию.
    nb = _ready_task(done=True)
    _apply(nb)
    assert nb.state == 1


# --- 3 → 4 (Можно проверять → Завершено) ---------------------------------

def test_accepted_completes_and_sets_completed_at():
    nb = _ready_task(
        implementation_plan={"text": "план", "finalized": True},
        done=True,
        accepted=True,
    )
    _apply(nb)
    assert nb.state == 4
    assert nb.completed_at == date.today().isoformat()


def test_completed_at_preserved_if_already_set():
    nb = _ready_task(
        implementation_plan={"text": "план", "finalized": True},
        done=True,
        accepted=True,
        completed_at="2026-01-01",
    )
    _apply(nb)
    assert nb.state == 4
    assert nb.completed_at == "2026-01-01"  # не перезаписываем


# --- Обратимость (каскадный откат) ---------------------------------------

def test_clearing_deadline_cascades_to_idea():
    nb = _ready_task(
        implementation_plan={"text": "план", "finalized": True},
        done=True,
        accepted=True,
        deadline=None,  # убрали дедлайн у уже завершённой задачи
    )
    _apply(nb)
    assert nb.state == 0
    assert nb.completed_at is None  # сброшен при откате из «Завершено»


def test_unfinalizing_plan_drops_to_ready():
    nb = _ready_task(
        implementation_plan={"text": "план", "finalized": False},
        done=True,
        accepted=True,
    )
    _apply(nb)
    assert nb.state == 1


def test_untoggling_accepted_drops_to_review():
    nb = _ready_task(
        implementation_plan={"text": "план", "finalized": True},
        done=True,
        accepted=False,
    )
    _apply(nb)
    assert nb.state == 3
    assert nb.completed_at is None
