import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  doc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore'
import { db } from '@/firebase'

const MERCHANT_KEY = 'currentMerchantId'

export function getCurrentMerchantId() {
  return localStorage.getItem(MERCHANT_KEY) || ''
}

export function logoutMerchant() {
  localStorage.removeItem(MERCHANT_KEY)
}

export async function loginMerchant({ phone, loginCode }) {
  const q = query(
    collection(db, 'merchants'),
    where('phone', '==', phone),
    where('loginCode', '==', loginCode)
  )

  const snap = await getDocs(q)

  if (snap.empty) {
    throw new Error('商家登入失敗，請確認手機與登入碼')
  }

  const merchantDoc = snap.docs[0]
  localStorage.setItem(MERCHANT_KEY, merchantDoc.id)

  return {
    id: merchantDoc.id,
    ...merchantDoc.data(),
  }
}

export async function createMerchant({ name, phone, loginCode, area, address, googleMapUrl }) {
  const docRef = await addDoc(collection(db, 'merchants'), {
    name,
    phone,
    loginCode,
    area,
    address,
    googleMapUrl,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  return docRef.id
}

export async function getMerchantById(merchantId) {
  const q = query(collection(db, 'merchants'), where('__name__', '==', merchantId))
  const snap = await getDocs(q)

  if (snap.empty) return null

  return {
    id: snap.docs[0].id,
    ...snap.docs[0].data(),
  }
}

export async function createCoupon({
  merchantId,
  merchantName,
  title,
  description,
  area,
  address,
  googleMapUrl,
  imageBase64,
}) {
  const docRef = await addDoc(collection(db, 'coupons'), {
    merchantId,
    merchantName,
    title,
    description,
    area,
    address,
    googleMapUrl,
    imageBase64: imageBase64 || '',
    isActive: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  return docRef.id
}

export async function getMerchantCoupons(merchantId) {
  const q = query(
    collection(db, 'coupons'),
    where('merchantId', '==', merchantId),
    orderBy('createdAt', 'desc')
  )

  const snap = await getDocs(q)

  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  }))
}

export async function updateCouponStatus(couponId, isActive) {
  await updateDoc(doc(db, 'coupons', couponId), {
    isActive,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteCoupon(couponId) {
  await deleteDoc(doc(db, 'coupons', couponId))
}
