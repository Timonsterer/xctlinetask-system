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

const COLLECTION_NAME = "contacts"

export const getContacts = async () => {
  const q = query(
    collection(db, COLLECTION_NAME),
    orderBy("updatedAt", "desc")
  )

  const snapshot = await getDocs(q)

  return snapshot.docs.map((docItem) => ({
    id: docItem.id,
    ...docItem.data(),
  }))
}

export const getContactById = async (id) => {
  if (!id) return null

  const ref = doc(db, COLLECTION_NAME, id)
  const snapshot = await getDoc(ref)

  if (!snapshot.exists()) return null

  return {
    id: snapshot.id,
    ...snapshot.data(),
  }
}

export const createContact = async (payload = {}) => {
  const cleanPayload = {
    name: payload.name || "",
    phone: payload.phone || "",
    email: payload.email || "",
    company: payload.company || "",
    address: payload.address || "",
    note: payload.note || "",
    tags: Array.isArray(payload.tags) ? payload.tags : [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }

  const ref = await addDoc(collection(db, COLLECTION_NAME), cleanPayload)
  return ref.id
}

export const updateContact = async (id, payload = {}) => {
  if (!id) {
    throw new Error("缺少聯絡人 ID")
  }

  const ref = doc(db, COLLECTION_NAME, id)

  const cleanPayload = {
    name: payload.name || "",
    phone: payload.phone || "",
    email: payload.email || "",
    company: payload.company || "",
    address: payload.address || "",
    note: payload.note || "",
    tags: Array.isArray(payload.tags) ? payload.tags : [],
    updatedAt: serverTimestamp(),
  }

  await updateDoc(ref, cleanPayload)
}

export const deleteContact = async (id) => {
  if (!id) {
    throw new Error("缺少聯絡人 ID")
  }

  await deleteDoc(doc(db, COLLECTION_NAME, id))
}
