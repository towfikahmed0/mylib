import { useEffect, useState } from 'react'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore'
import { db } from '../../../lib/firebase'
import { sanitizeFirestoreData } from '../../../lib/firestore'
import { useAuth } from '../../auth/useAuth'
import type { CreateNoteInput, UpdateNoteInput, UserNote } from '../types'

export function useNotes() {
  const { user } = useAuth()
  const uid = user?.uid
  const [notes, setNotes] = useState<UserNote[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!uid) return

    const notesCol = collection(db, 'users', uid, 'notes')
    const q = query(notesCol, orderBy('createdAt', 'desc'))

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((docSnap) => {
          const data = docSnap.data()
          return {
            id: docSnap.id,
            userId: uid,
            title: typeof data.title === 'string' ? data.title : '',
            content: typeof data.content === 'string' ? data.content : '',
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          } as UserNote
        })
        setNotes(items)
        setIsLoading(false)
        setError(null)
      },
      (err) => {
        setError(err as Error)
        setIsLoading(false)
      },
    )

    return () => unsubscribe()
  }, [uid])

  const createNote = async (input: CreateNoteInput) => {
    if (!uid) throw new Error('You must be signed in to take notes.')
    const notesCol = collection(db, 'users', uid, 'notes')
    const docRef = await addDoc(
      notesCol,
      sanitizeFirestoreData({
        title: input.title?.trim() || '',
        content: input.content.trim(),
        createdAt: serverTimestamp(),
      }),
    )
    return docRef.id
  }

  const updateNote = async (input: UpdateNoteInput) => {
    if (!uid) throw new Error('You must be signed in to edit notes.')
    const noteRef = doc(db, 'users', uid, 'notes', input.id)
    await updateDoc(
      noteRef,
      sanitizeFirestoreData({
        title: input.title !== undefined ? input.title.trim() : '',
        content: input.content.trim(),
        updatedAt: serverTimestamp(),
      }),
    )
  }

  const deleteNote = async (id: string) => {
    if (!uid) throw new Error('You must be signed in to delete notes.')
    const noteRef = doc(db, 'users', uid, 'notes', id)
    await deleteDoc(noteRef)
  }

  return {
    notes: uid ? notes : [],
    isLoading: uid ? isLoading : false,
    error,
    createNote,
    updateNote,
    deleteNote,
  }
}
