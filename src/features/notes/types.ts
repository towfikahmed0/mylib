import type { FirestoreDate } from '../../types'

export interface UserNote {
  id: string
  userId: string
  title?: string
  content: string
  createdAt: FirestoreDate
  updatedAt?: FirestoreDate
}

export interface CreateNoteInput {
  title?: string
  content: string
}

export interface UpdateNoteInput {
  id: string
  title?: string
  content: string
}
