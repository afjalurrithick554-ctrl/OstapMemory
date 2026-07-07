import { api } from './client'
import type { Note, CreateNoteRequest, UpdateNoteRequest } from '@/types/note'

export async function listNotes(notebookId: string): Promise<Note[]> {
  const { data } = await api.get<Note[]>('/notes', { params: { notebook_id: notebookId } })
  return data
}

// Все заметки без фильтра по ячейке (пространство «Заметки»).
export async function listAllNotes(): Promise<Note[]> {
  const { data } = await api.get<Note[]>('/notes')
  return data
}

export async function createNote(body: CreateNoteRequest): Promise<Note> {
  const { data } = await api.post<Note>('/notes', body)
  return data
}

export async function updateNote(id: string, body: UpdateNoteRequest): Promise<Note> {
  const { data } = await api.put<Note>(`/notes/${id}`, body)
  return data
}

export async function deleteNote(id: string): Promise<void> {
  await api.delete(`/notes/${id}`)
}
