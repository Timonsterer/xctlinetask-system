// src/services/pocketPlaceService.js

import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/firebase'

const COLLECTION_NAME = 'pocket_places'

// 取得使用者所有收藏
export const getPlaces = async (userId) => {
  if (!userId) throw new Error('缺少 userId')

  const q = query(
    collection(db, COLLECTION_NAME),
    where('ownerId', '==', userId),
    orderBy('createdAt', 'desc')
  )

  const snap = await getDocs(q)

  return snap.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  }))
}

// 新增收藏
export const addPlace = async ({ userId, name, address, category, note }) => {
  if (!userId) throw new Error('缺少 userId')
  if (!name) throw new Error('缺少名稱')
  if (!address) throw new Error('缺少地址')

  return await addDoc(collection(db, COLLECTION_NAME), {
    ownerId: userId,
    name: name.trim(),
    address: address.trim(),
    category: category || '其他',
    note: note?.trim() || '',
    createdAt: serverTimestamp(),
  })
}

// 刪除收藏
export const deletePlace = async (id) => {
  if (!id) throw new Error('缺少 id')

  return await deleteDoc(doc(db, COLLECTION_NAME, id))
}

// Google Maps 搜尋連結
export const getMapSearchUrl = (place) => {
  const queryText = `${place.name} ${place.address}`
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(queryText)}`
}

// Google Maps 導航連結
export const getNavigationUrl = (place) => {
  const destination = place.address || place.name
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`
}
