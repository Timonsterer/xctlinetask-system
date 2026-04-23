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

const TASKS_COLLECTION = 'tasks'
const TASK_HISTORY_COLLECTION = 'task_history'
const USERS_COLLECTION = 'users'

function toTimestamp(value) {
  if (!value) return null

  if (typeof value?.toDate === 'function') {
    return value
  }

  if (value instanceof Date) {
    return Timestamp.fromDate(value)
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  return Timestamp.fromDate(date)
}

function normalizeTask(docSnap) {
  const data = docSnap.data()

  return {
    id: docSnap.id,
    ...data,
    ownerId: data.ownerId || data.userId || '',
    userId: data.userId || data.ownerId || '',
    status: data.status === 'completed' ? 'done' : (data.status || 'pending'),
    dueAt: data.dueAt || data.startAt || null,
  }
}

// 取得目前待做任務
export async function getCurrentTaskByOwner(ownerId) {
  if (!ownerId) return null

  const tasksRef = collection(db, TASKS_COLLECTION)

  // 優先抓 ownerId
  try {
    const q = query(
      tasksRef,
      where('ownerId', '==', ownerId),
      where('status', '==', 'pending'),
      orderBy('dueAt', 'asc'),
      orderBy('createdAt', 'asc'),
      limit(1)
    )

    const snap = await getDocs(q)

    if (!snap.empty) {
      return normalizeTask(snap.docs[0])
    }
  } catch (error) {
    console.warn('getCurrentTaskByOwner ownerId query failed:', error)
  }

  // 相容舊資料：抓 userId
  try {
    const q = query(
      tasksRef,
      where('userId', '==', ownerId),
      where('status', '==', 'pending'),
      orderBy('dueAt', 'asc'),
      orderBy('createdAt', 'asc'),
      limit(1)
    )

    const snap = await getDocs(q)

    if (!snap.empty) {
      return normalizeTask(snap.docs[0])
    }
  } catch (error) {
    console.warn('getCurrentTaskByOwner userId query failed:', error)
  }

  return null
}

// 建立任務
export async function createTask({
  ownerId,
  title,
  dueAt,
  durationMinutes = 30,
  rawTimeInput = '',
  rawDurationInput = '',
  note = '',
  type = 'key',
  isCurrent = true,
}) {
  if (!ownerId) {
    throw new Error('缺少 ownerId')
  }

  if (!title) {
    throw new Error('缺少 title')
  }

  const dueTimestamp = toTimestamp(dueAt)
  if (!dueTimestamp) {
    throw new Error('dueAt 格式錯誤')
  }

  const endDate = new Date(dueTimestamp.toDate().getTime() + durationMinutes * 60 * 1000)
  const endTimestamp = Timestamp.fromDate(endDate)

  const payload = {
    ownerId,
    userId: ownerId,

    title,
    note,
    type,

    status: 'pending',
    isCurrent,

    dueAt: dueTimestamp,
    startAt: dueTimestamp,
    endAt: endTimestamp,

    durationMinutes,
    durationText: rawDurationInput || '',
    rawTimeInput,
    rawDurationInput,

    completedAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }

  const docRef = await addDoc(collection(db, TASKS_COLLECTION), payload)
  return docRef.id
}

// 取得單筆任務
export async function getTaskById(taskId) {
  if (!taskId) return null

  const ref = doc(db, TASKS_COLLECTION, taskId)
  const snap = await getDoc(ref)

  if (!snap.exists()) return null

  return normalizeTask(snap)
}

// 更新任務
export async function updateTask(taskId, payload = {}) {
  if (!taskId) {
    throw new Error('缺少 taskId')
  }

  const cleanPayload = {
    updatedAt: serverTimestamp(),
  }

  if (payload.title !== undefined) cleanPayload.title = payload.title || ''
  if (payload.note !== undefined) cleanPayload.note = payload.note || ''
  if (payload.type !== undefined) cleanPayload.type = payload.type || 'key'
  if (payload.status !== undefined) {
    cleanPayload.status = payload.status === 'completed' ? 'done' : payload.status
  }
  if (payload.isCurrent !== undefined) cleanPayload.isCurrent = !!payload.isCurrent

  if (payload.ownerId !== undefined) {
    cleanPayload.ownerId = payload.ownerId || ''
    cleanPayload.userId = payload.ownerId || ''
  }

  if (payload.durationMinutes !== undefined) {
    cleanPayload.durationMinutes = Number(payload.durationMinutes || 30)
  }

  if (payload.rawTimeInput !== undefined) {
    cleanPayload.rawTimeInput = payload.rawTimeInput || ''
  }

  if (payload.rawDurationInput !== undefined) {
    cleanPayload.rawDurationInput = payload.rawDurationInput || ''
    cleanPayload.durationText = payload.rawDurationInput || ''
  }

  if (payload.dueAt !== undefined) {
    const ts = toTimestamp(payload.dueAt)
    cleanPayload.dueAt = ts
    cleanPayload.startAt = ts

    const mins = Number(
      payload.durationMinutes ??
      cleanPayload.durationMinutes ??
      30
    )

    if (ts) {
      const endDate = new Date(ts.toDate().getTime() + mins * 60 * 1000)
      cleanPayload.endAt = Timestamp.fromDate(endDate)
    }
  }

  await updateDoc(doc(db, TASKS_COLLECTION, taskId), cleanPayload)
}

// 完成任務
export async function completeTask(task) {
  if (!task?.id) {
    throw new Error('缺少 task.id')
  }

  const ownerId = task.ownerId || task.userId || ''
  const taskRef = doc(db, TASKS_COLLECTION, task.id)

  await updateDoc(taskRef, {
    status: 'done',
    isCurrent: false,
    completedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  await addDoc(collection(db, TASK_HISTORY_COLLECTION), {
    ownerId,
    userId: ownerId,

    taskId: task.id,
    title: task.title || '',
    note: task.note || '',
    type: task.type || 'key',

    dueAt: task.dueAt || task.startAt || null,
    startAt: task.startAt || task.dueAt || null,
    endAt: task.endAt || null,

    durationMinutes: task.durationMinutes || 30,
    durationText: task.durationText || task.rawDurationInput || '',
    rawTimeInput: task.rawTimeInput || '',
    rawDurationInput: task.rawDurationInput || '',

    completedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
  })
}

// 刪除任務
export async function deleteTask(taskId) {
  if (!taskId) {
    throw new Error('缺少 taskId')
  }

  await deleteDoc(doc(db, TASKS_COLLECTION, taskId))
}

// 清除 30 天前歷史
export async function cleanupTaskHistoryOlderThan30Days(ownerId) {
  if (!ownerId) return

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 30)

  const historyRef = collection(db, TASK_HISTORY_COLLECTION)
  const q = query(
    historyRef,
    where('ownerId', '==', ownerId),
    where('createdAt', '<', Timestamp.fromDate(cutoff))
  )

  const snap = await getDocs(q)
  const jobs = snap.docs.map((item) =>
    deleteDoc(doc(db, TASK_HISTORY_COLLECTION, item.id))
  )

  await Promise.all(jobs)
}

// 取得歷史紀錄
export async function getTaskHistoryByOwner(ownerId) {
  if (!ownerId) return []

  const historyRef = collection(db, TASK_HISTORY_COLLECTION)
  const resultMap = new Map()

  try {
    const q = query(
      historyRef,
      where('ownerId', '==', ownerId),
      orderBy('completedAt', 'desc')
    )

    const snap = await getDocs(q)
    snap.docs.forEach((item) => {
      resultMap.set(item.id, {
        id: item.id,
        ...item.data(),
      })
    })
  } catch (error) {
    console.warn('getTaskHistoryByOwner ownerId query failed:', error)
  }

  try {
    const q = query(
      historyRef,
      where('userId', '==', ownerId),
      orderBy('completedAt', 'desc')
    )

    const snap = await getDocs(q)
    snap.docs.forEach((item) => {
      resultMap.set(item.id, {
        id: item.id,
        ...item.data(),
      })
    })
  } catch (error) {
    console.warn('getTaskHistoryByOwner userId query failed:', error)
  }

  return [...resultMap.values()].sort((a, b) => {
    const aTime =
      typeof a.completedAt?.toDate === 'function'
        ? a.completedAt.toDate().getTime()
        : 0

    const bTime =
      typeof b.completedAt?.toDate === 'function'
        ? b.completedAt.toDate().getTime()
        : 0

    return bTime - aTime
  })
}

// 更新使用者閒置狀態
export async function updateUserIdleState(userId, payload = {}) {
  if (!userId) {
    throw new Error('缺少 userId')
  }

  const userRef = doc(db, USERS_COLLECTION, userId)

  await updateDoc(userRef, {
    ...payload,
    updatedAt: serverTimestamp(),
  })
}

// 取得使用者資料
export async function getUserProfile(userId) {
  if (!userId) return null

  const userRef = doc(db, USERS_COLLECTION, userId)
  const snap = await getDoc(userRef)

  if (!snap.exists()) return null

  return {
    id: snap.id,
    ...snap.data(),
  }
}
