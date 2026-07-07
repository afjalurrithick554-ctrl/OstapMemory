import {
  STATE_COLORS,
  STATE_TEXT_COLORS,
  STATE_RING_COLORS,
  STATE_BORDER_COLORS,
  STATE_TINT_COLORS,
  ARCHIVE_DAYS,
  type Notebook,
  type Checklist,
  type ChecklistItem,
} from '@/types/notebook'

export function clampState(state: number): number {
  return Math.max(0, Math.min(STATE_COLORS.length - 1, state))
}

export function stateColor(state: number): string {
  return STATE_COLORS[clampState(state)]
}
export function stateTextColor(state: number): string {
  return STATE_TEXT_COLORS[clampState(state)]
}
export function stateRing(state: number): string {
  return STATE_RING_COLORS[clampState(state)]
}
export function stateBorder(state: number): string {
  return STATE_BORDER_COLORS[clampState(state)]
}
export function stateTint(state: number): string {
  return STATE_TINT_COLORS[clampState(state)]
}

// Архивна ли карточка: вручную (archived) ИЛИ по времени
// (в «Завершено» дольше ARCHIVE_DAYS дней от completed_at).
export function isArchived(
  nb: Pick<Notebook, 'archived' | 'state' | 'completed_at'>,
): boolean {
  if (nb.archived) return true
  if (nb.state === 4 && nb.completed_at) {
    const done = new Date(nb.completed_at).getTime()
    if (!Number.isNaN(done)) {
      return Date.now() - done > ARCHIVE_DAYS * 86400_000
    }
  }
  return false
}

// Сортировка карточек внутри пространства: по группам состояний
// (Идея → Готово к работе → Можно проверять → Завершено), новые — сверху.
export function compareByStateThenNewest(a: Notebook, b: Notebook): number {
  if (a.state !== b.state) return a.state - b.state
  return new Date(b.created).getTime() - new Date(a.created).getTime()
}

export function genId(): string {
  // crypto.randomUUID есть во всех целевых браузерах; запасной вариант на всякий случай.
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36)
}

// Признак старой формы данных: массив пунктов {title,isCompleted} без поля items.
function isLegacyItems(raw: unknown[]): boolean {
  return raw.length > 0 && !Array.isArray((raw[0] as { items?: unknown }).items)
}

// Возвращает чек-листы ноутбука, гарантируя наличие дефолтного (первого, isDefault).
// defaultTitle используется для синтеза дефолтного, когда чек-листов ещё нет
// или данные в старой плоской форме.
export function normalizeChecklists(
  checklist: Checklist[] | null | undefined,
  defaultTitle: string,
): Checklist[] {
  const raw = (checklist ?? []) as unknown[]
  if (raw.length && !isLegacyItems(raw)) {
    const lists = raw as Checklist[]
    return lists.map((c, i) => ({
      id: c.id || genId(),
      title: c.title ?? '',
      isDefault: i === 0,
      items: (c.items ?? []).map((it) => ({ title: it.title ?? '', isCompleted: !!it.isCompleted })),
    }))
  }
  // Старые плоские пункты → один дефолтный чек-лист (или пустой дефолтный).
  const legacy = raw as ChecklistItem[]
  return [
    {
      id: genId(),
      title: defaultTitle,
      isDefault: true,
      items: legacy.map((it) => ({ title: it.title ?? '', isCompleted: !!it.isCompleted })),
    },
  ]
}

// Все пункты из всех чек-листов (учитывает и старую плоскую форму).
function allItems(checklist: Checklist[] | null | undefined): ChecklistItem[] {
  const raw = (checklist ?? []) as unknown[]
  if (raw.length && !isLegacyItems(raw)) {
    return (raw as Checklist[]).flatMap((c) => c.items ?? [])
  }
  return raw as ChecklistItem[]
}

// Текст «Цели» из легаси-дефолтного чек-листа (пункты через перенос строки).
// Нужен для миграции-в-UI: пока goal пуст, показываем старое содержимое в новом поле.
export function legacyGoalText(nb: Pick<Notebook, 'checklist'>): string {
  const raw = (nb.checklist ?? []) as unknown[]
  if (!raw.length) return ''
  // Старая плоская форма [{title,isCompleted}] — весь массив это пункты.
  if (!Array.isArray((raw[0] as { items?: unknown }).items)) {
    return (raw as ChecklistItem[])
      .map((it) => (it.title ?? '').trim())
      .filter(Boolean)
      .join('\n')
  }
  const lists = raw as Checklist[]
  const def = lists.find((c) => c.isDefault) ?? lists[0]
  return (def?.items ?? [])
    .map((it) => (it.title ?? '').trim())
    .filter(Boolean)
    .join('\n')
}

export function checklistProgress(nb: Pick<Notebook, 'checklist'>): { completed: number; total: number; pct: number } {
  const items = allItems(nb.checklist)
  const total = items.length
  const completed = items.filter((c) => c.isCompleted).length
  const pct = total ? Math.round((completed / total) * 100) : 0
  return { completed, total, pct }
}

export function isCell(nb: Pick<Notebook, 'notebook_type'>): boolean {
  return nb.notebook_type === 'cell'
}

// Простое относительное время без внешних зависимостей.
export function formatRelative(iso: string, locale: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const diffSec = Math.round((Date.now() - then) / 1000)
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 31536000], ['month', 2592000], ['day', 86400],
    ['hour', 3600], ['minute', 60], ['second', 1],
  ]
  for (const [unit, secs] of units) {
    if (Math.abs(diffSec) >= secs || unit === 'second') {
      return rtf.format(-Math.round(diffSec / secs), unit)
    }
  }
  return ''
}
