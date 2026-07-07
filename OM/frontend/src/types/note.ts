// Типы заметок. Портированы из api/models.py (NoteResponse / NoteCreate / NoteUpdate).

export type NoteType = 'human' | 'ai'

export interface Note {
  id: string
  title: string | null
  content: string | null
  note_type: NoteType | null
  // Привязка к проекту (space kind=project). null — дефолтная (глобальная) заметка.
  space_id: string | null
  // Непосредственный родитель — ноутбук (ячейка/подзадача), к которому привязана
  // заметка. Ярлык в UI показывает родителя, а не весь проект. null — заметка не
  // привязана к ноутбуку (глобальная в рамках проекта).
  parent_id?: string | null
  parent_name?: string | null
  created: string
  updated: string
  command_id?: string | null
}

export interface CreateNoteRequest {
  title?: string
  content: string
  note_type?: NoteType
  notebook_id?: string
  space_id?: string
}

export interface UpdateNoteRequest {
  title?: string
  content?: string
  note_type?: NoteType
  space_id?: string
}
