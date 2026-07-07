# OstapMemory Vue 3 — План реализации

## Концепция продукта

OstapMemory — докер-контейнер с БД и интерфейсом, "AI-память" для человека и агента.
Базируется на механике Open Notebook, переписан на Vue 3 с кастомизациями.

### Ключевые сущности

**Ячейка (Cell)** — базовый контейнер для информации. Хранилище. Всегда state=0 (голубая).
Внутри: источники, заметки, чат с AI. Может содержать подзадачи.

**Задача (Task)** — ячейка с расширенными полями: исполнитель, дедлайн, план реализации, чеклист.
Проходит 5 состояний. Может содержать подзадачи.

**Подзадача (Subtask)** — создаётся внутри cell или task. Всегда ведёт себя как task
(все поля, все переходы состояний). Привязана к родителю через `parent_id`.

### State Machine (5 состояний)

| # | Состояние | Цвет | Условие перехода |
|---|-----------|------|------------------|
| 0 | Идея | 🔵 голубой | По умолчанию. Cell всегда здесь |
| 1 | Готово к работе | 🟡 жёлтый | Есть имя + описание + чеклист "Цель задачи" |
| 2 | В работе | 🟠 оранжевый | Есть план реализации + дедлайн + исполнитель |
| 3 | На проверке | 🟢 зелёный | Есть отчёт о выполнении |
| 4 | Готово | ⚪ серый | ⚠️ условие — РЕВЬЮ |

Визуализация: цветная обводка (аура) + ВСЕ ТЕКСТЫ на карточке окрашиваются в цвет состояния.

⚠️ ИСПРАВИТЬ при переносе:
- В текущем коде subtask приравнен к cell (state=0) — баг
- Переходы в состояния 3 и 4 — условия не реализованы, нужно спроектировать

---

## Архитектура

```
OM/
├── frontend/              ← Vue 3 + Vite (НОВЫЙ)
│   ├── src/
│   │   ├── components/        — UI компоненты
│   │   ├── views/             — страницы (роуты)
│   │   ├── stores/            — Pinia stores
│   │   ├── composables/       — хуки (аналог React hooks)
│   │   ├── api/               — API клиент
│   │   ├── types/             — TypeScript типы
│   │   ├── i18n/              — локализации
│   │   └── assets/            — стили, иконки
│   └── Dockerfile
├── api/                   ← Python FastAPI (скопированный из repo/, с исправлениями)
├── open_notebook/         ← Domain layer (скопированный из repo/)
├── component-templates/   ← Эталонные компоненты (страховка)
├── surreal_data/          ← Данные SurrealDB
├── notebook_data/         ← Данные приложения
├── docker-compose.yml
└── vue3-rewrite-plan.md   ← Этот файл
```

---

## Стек (утверждён)

| Слой | Технология |
|------|-----------|
| Frontend | Vue 3 + Vite + TypeScript |
| UI | shadcn-vue + Tailwind CSS |
| State | Pinia |
| Router | vue-router 4 |
| HTTP | axios или ky |
| i18n | vue-i18n |
| Icons | lucide-vue-next |
| Markdown | markdown-it |
| Backend | Python FastAPI (из текущего проекта) |
| DB | SurrealDB v2 (отдельный контейнер) |
| Container | Docker Compose |

---

## Фазы реализации

### ФАЗА 0: Подготовка
1. Скопировать backend (api/ + open_notebook/) из repo/ в OM/ с исправлениями
2. Создать docker-compose.yml (3 контейнера: frontend, backend, surrealdb)
3. Инициализировать Vue 3 + Vite + TypeScript проект
4. Настроить shadcn-vue + Tailwind CSS
5. Создать папку component-templates/

### ФАЗА 1: Интерфейс (Shell) — без данных
Цель: рабочая оболочка, все страницы доступны, визуально похоже на Notebook

1. **AppShell + Sidebar** — collapsible, группы навигации, логотип OstapMemory
2. **Routing** — vue-router:
   - `/` — главная (редирект)
   - `/notebooks` — список ячеек
   - `/notebooks/:id` — детальная страница ячейки
   - `/sources` — список источников
   - `/search` — поиск
   - `/progress` — витрина состояний (неудаляемая вкладка)
   - `/podcasts` — подкасты
   - `/settings` — настройки
   - `/settings/api-keys` — API ключи
   - `/transformations` — трансформации
   - `/advanced` — расширенные настройки
3. **Тема** — dark/light toggle, CSS переменные
4. **i18n** — vue-i18n, русская локаль первая
5. **Auth** — страница логина

### ФАЗА 2: Ядро — Notebooks/Cells
Цель: полный CRUD ячеек с визуализацией состояний

1. **Список ячеек** — карточки (tile) / строки (list), поиск, фильтр, архив
2. **NotebookCard / NotebookRow** — аура + тексты в цвет состояния, badge типа, прогресс чеклиста
3. **Создание ячейки** — диалог: выбор cell/task, ввод чеклиста
4. **Детальная страница** — 3-колоночный layout: Sources | Notes | Chat
5. **NotebookHeader** — inline-редактирование: имя, описание, тип, дедлайн (DatePicker), исполнитель, план, чеклист
6. **State Machine** — автоматические переходы, ауры, badges
7. **Иерархия** — ChildrenSection, создание subtask (всегда task по поведению)
8. **Collapsible columns** — свернуть/развернуть Sources и Notes

### ФАЗА 3: Sources и Notes
1. **Sources CRUD** — добавление (link/upload/text), карточки, детальная страница
2. **Notes CRUD** — создание, markdown editor, inline-редактирование
3. **Context management** — include/exclude/insights-only для чата
4. **Bulk actions** — массовое include/exclude всех sources/notes

### ФАЗА 4: Chat
1. **Notebook Chat** — сессии, streaming SSE, контекст из sources/notes
2. **Source Chat** — чат с отдельным источником
3. **Model selector** — выбор AI модели
4. **Session manager** — список сессий, переключение

### ФАЗА 5: Остальные страницы
1. **Progress** — витрина состояний:
   - Горизонтальная панель сверху: карточки в состоянии "В работе" (state=2)
   - Карточки — тот же компонент что в Ячейках, реактивная синхронизация через Pinia
   - Кликабельны, открывают ту же ячейку
   - Под панелью — пока пусто, расширяем позже
   - Вкладка в sidebar неудаляемая
2. **Search** — полнотекстовый + векторный поиск
3. **Podcasts** — генерация, профили спикеров
4. **Settings** — API ключи, embedding, общие настройки
5. **Transformations** — шаблоны обработки

### ФАЗА 6: Dev Mode, Polish, Дизайн
1. **DevModeOverlay** — визуальный фидбек по элементам
2. **DevModeToggle** — включение/выключение в sidebar
3. **Command Palette** — быстрые действия (Cmd+K)
4. **Responsive** — мобильный layout с табами вместо колонок
5. **Error handling** — ErrorBoundary, ConnectionGuard
6. **Контрольная правка дизайна** — после создания всех элементов, финальная настройка внешнего вида каждой страницы и вкладки

### Библиотека эталонных компонентов
Папка `OM/component-templates/` — по одному .vue файлу на каждый UI-компонент.
- Чистый шаблонный код без привязки к данным
- Один компонент = один файл (не дублируем вариации)
- Страховка: сломал → берёшь эталон и восстанавливаешь
- Обновляется ТОЛЬКО после подтверждения пользователя
- Обновляется ТОЛЬКО когда компонент взят в работу и изменения проверены

---

## Что переносим из текущего React-проекта

### Backend (с исправлениями)
- Система типов Cell/Task/Subtask
- State Machine (с фиксом subtask и ревью переходов 3→4)
- Модели: ImplementationPlan, ChecklistItem, расширенный Notebook
- API: CRUD notebooks, sources, notes, chat, search, podcasts, settings
- API эндпоинт GET /notebooks/{id}/children
- Перехват OpenNotebookError
- Миграции 16, 17 для SurrealDB
- Интеграция OpenRouter

### Frontend (переписываем React → Vue 3)
- Все компоненты: layout, notebooks, sources, notes, chat, search, podcasts, settings
- Dev Mode (overlay + toggle)
- DatePicker
- Локализации (14 языков, ребрендинг, ru-RU "ячейка")
- CSS: ауры состояний, Dev Mode стили, dark/light тема

---

## ✅ РЕШЕНИЯ (28.06.2026)

- **UI Kit**: shadcn-vue + Tailwind CSS
- **Бэкенд**: Копируем Python FastAPI в OM/, развиваем независимо
- **БД**: Отдельная SurrealDB (свой контейнер)
- **Подход**: Сначала интерфейс без данных, потом подключаем БД/API
- **Notebook не трогаем** — он остаётся в Docker нетронутым
- **Subtask = task** по поведению (state machine, все поля)
- **Progress** — витрина, не канбан. Неудаляемая вкладка
- **Component-templates/** — эталоны с защитой от перезаписи

### Нерешённые вопросы
- Порты для нового приложения (Notebook занимает 8000/5055/8502)
- Docker compose: отдельный файл или расширение существующего
- Условия переходов в состояния 3 (На проверке) и 4 (Готово)
