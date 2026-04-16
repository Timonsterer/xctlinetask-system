import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore"
import { db } from "@/firebase"

const COLLECTION_NAME = "life_templates"

// 取得全部
export const getLifeTemplates = async () => {
  const q = query(
    collection(db, COLLECTION_NAME),
    orderBy("createdAt", "desc")
  )

  const snapshot = await getDocs(q)

  return snapshot.docs.map((docItem) => ({
    id: docItem.id,
    ...docItem.data(),
  }))
}

// 單筆
export const getLifeTemplateById = async (id) => {
  if (!id) return null

  const ref = doc(db, COLLECTION_NAME, id)
  const snapshot = await getDoc(ref)

  if (!snapshot.exists()) return null

  return {
    id: snapshot.id,
    ...snapshot.data(),
  }
}

// 建立
export const createLifeTemplate = async (payload = {}) => {
  const cleanPayload = {
    title: payload.title || "",
    subtitle: payload.subtitle || "",
    description: payload.description || "",
    coverImage: payload.coverImage || "",

    tags: Array.isArray(payload.tags) ? payload.tags : [],

    dailySchedule: Array.isArray(payload.dailySchedule)
      ? payload.dailySchedule
      : [],

    keyPoints: Array.isArray(payload.keyPoints)
      ? payload.keyPoints
      : [],

    practiceTips: Array.isArray(payload.practiceTips)
      ? payload.practiceTips
      : [],

    note: payload.note || "",

    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }

  const ref = await addDoc(collection(db, COLLECTION_NAME), cleanPayload)
  return ref.id
}

// 更新
export const updateLifeTemplate = async (id, payload = {}) => {
  if (!id) {
    throw new Error("缺少 ID")
  }

  const ref = doc(db, COLLECTION_NAME, id)

  const cleanPayload = {
    title: payload.title || "",
    subtitle: payload.subtitle || "",
    description: payload.description || "",
    coverImage: payload.coverImage || "",

    tags: Array.isArray(payload.tags) ? payload.tags : [],

    dailySchedule: Array.isArray(payload.dailySchedule)
      ? payload.dailySchedule
      : [],

    keyPoints: Array.isArray(payload.keyPoints)
      ? payload.keyPoints
      : [],

    practiceTips: Array.isArray(payload.practiceTips)
      ? payload.practiceTips
      : [],

    note: payload.note || "",

    updatedAt: serverTimestamp(),
  }

  await updateDoc(ref, cleanPayload)
}

// 刪除
export const deleteLifeTemplate = async (id) => {
  if (!id) {
    throw new Error("缺少 ID")
  }

  await deleteDoc(doc(db, COLLECTION_NAME, id))
}
