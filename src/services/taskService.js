import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  addDoc,
  serverTimestamp,
  Timestamp,
  deleteDoc,
} from 'firebase/firestore'
import { db } from '../firebase'

export async function getCurrentTaskByOwner(ownerId) {
  const tasksRef = collection(db, 'tasks')
  const q = query(
    tasksRef,
    where('ownerId', '==', ownerId),
    where('status', '==', 'pending'),
    orderBy('dueAt', 'asc'),
    orderBy('createdAt', 'asc'),
    limit(1)
  )

  const snap = await getDocs(q)

  if (snap.empty) return null

  const taskDoc = snap.docs[0]
  return {
    id: taskDoc.id,
    ...taskDoc.data(),
  }
}

export async function createTask({
  ownerId,
  title,
  dueAt,
  durationMinutes = 30,
  rawTimeInput = '',
  rawDurationInput = '',
}) {
  const payload = {
    ownerId,
    title,
    status: 'pending',
    type: 'key',
    dueAt: Timestamp.fromDate(dueAt),
    durationMinutes,
    rawTimeInput,
    rawDurationInput,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    completedAt: null,
  }

  const docRef = await addDoc(collection(db, 'tasks'), payload)
  return docRef.id
}

export async function completeTask(task) {
  const taskRef = doc(db, 'tasks', task.id)

  await updateDoc(taskRef, {
    status: 'completed',
    completedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  await addDoc(collection(db, 'task_history'), {
    ownerId: task.ownerId,
    taskId: task.id,
    title: task.title,
    type: task.type || 'key',
    dueAt: task.dueAt || null,
    durationMinutes: task.durationMinutes || 30,
    rawTimeInput: task.rawTimeInput || '',
    rawDurationInput: task.rawDurationInput || '',
    completedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
  })
}

export async function cleanupTaskHistoryOlderThan30Days(ownerId) {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 30)

  const historyRef = collection(db, 'task_history')
  const q = query(
    historyRef,
    where('ownerId', '==', ownerId),
    where('createdAt', '<', Timestamp.fromDate(cutoff))
  )

  const snap = await getDocs(q)

  const jobs = snap.docs.map((item) => deleteDoc(doc(db, 'task_history', item.id)))
  await Promise.all(jobs)
}

export async function getTaskHistoryByOwner(ownerId) {
  const historyRef = collection(db, 'task_history')
  const q = query(
    historyRef,
    where('ownerId', '==', ownerId),
    orderBy('completedAt', 'desc')
  )

  const snap = await getDocs(q)

  return snap.docs.map((item) => ({
    id: item.id,
    ...item.data(),
  }))
}

export async function updateUserIdleState(userId, payload) {
  const userRef = doc(db, 'users', userId)
  await updateDoc(userRef, {
    ...payload,
    updatedAt: serverTimestamp(),
  })
}

export async function getUserProfile(userId) {
  const userRef = doc(db, 'users', userId)
  const snap = await getDoc(userRef)

  if (!snap.exists()) return null

  return {
    id: snap.id,
    ...snap.data(),
  }
}
