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

const COLLECTION_NAME = "idle_posts"

// 取得全部閒置/可約資料
export const getIdlePosts = async () => {
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
export const getIdlePostById = async (id) => {
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
export const createIdlePost = async (payload = {}) => {
  const cleanPayload = {
    title: payload.title || "",
    description: payload.description || "",
    type: payload.type || "help", // help / hangout / service

    ownerName: payload.ownerName || "",
    phone: payload.phone || "",
    email: payload.email || "",
    contactText: payload.contactText || "",
    contactUrl: payload.contactUrl || "",

    location: payload.location || "",
    reward: payload.reward || "",

    startAt: payload.startAt || null,

    tags: Array.isArray(payload.tags) ? payload.tags : [],

    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }

  const ref = await addDoc(collection(db, COLLECTION_NAME), cleanPayload)
  return ref.id
}

// 更新
export const updateIdlePost = async (id, payload = {}) => {
  if (!id) {
    throw new Error("缺少 ID")
  }

  const ref = doc(db, COLLECTION_NAME, id)

  const cleanPayload = {
    title: payload.title || "",
    description: payload.description || "",
    type: payload.type || "help",

    ownerName: payload.ownerName || "",
    phone: payload.phone || "",
    email: payload.email || "",
    contactText: payload.contactText || "",
    contactUrl: payload.contactUrl || "",

    location: payload.location || "",
    reward: payload.reward || "",

    startAt: payload.startAt || null,

    tags: Array.isArray(payload.tags) ? payload.tags : [],

    updatedAt: serverTimestamp(),
  }

  await updateDoc(ref, cleanPayload)
}

// 刪除
export const deleteIdlePost = async (id) => {
  if (!id) {
    throw new Error("缺少 ID")
  }

  await deleteDoc(doc(db, COLLECTION_NAME, id))
}
