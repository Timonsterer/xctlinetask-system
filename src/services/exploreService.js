import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore'

import { db } from '@/firebase'

export async function getActiveCouponsByAreas(areas = []) {
  const q = query(
    collection(db, 'coupons'),
    where('isActive', '==', true)
  )

  const snap = await getDocs(q)

  let list = snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  }))

  if (areas.length > 0) {
    list = list.filter((item) => {
      return areas.includes(item.area)
    })
  }

  list.sort((a, b) => {
    const aTime = a.createdAt?.seconds || 0
    const bTime = b.createdAt?.seconds || 0

    return bTime - aTime
  })

  return list
}

export async function saveExplorePreference(
  userId,
  allowedAreas
) {
  await addDoc(
    collection(db, 'explore_preferences'),
    {
      userId,
      allowedAreas,
      createdAt: serverTimestamp(),
    }
  )
}

export async function addCouponToPocketPlace(
  userId,
  coupon
) {
  await addDoc(
    collection(db, 'pocket_places'),
    {
      ownerId: userId,
      userId,

      name:
        coupon.merchantName ||
        coupon.title ||
        '',

      area:
        coupon.area || '',

      address:
        coupon.address || '',

      note:
        `探店優惠：${coupon.title || ''}`,

      googleMapUrl:
        coupon.googleMapUrl || '',

      source:
        'explore_coupon',

      couponId:
        coupon.id || '',

      createdAt:
        serverTimestamp(),

      updatedAt:
        serverTimestamp(),
    }
  )
}

export async function addCouponToTask(
  userId,
  coupon
) {
  const now = new Date()
  const startAt = now.toISOString().slice(0, 16)

  await addDoc(
    collection(db, 'tasks'),
    {
      ownerId: userId,
      userId,

      title:
        `探店：${coupon.merchantName || coupon.title || ''}`,

      content:
        coupon.description ||
        coupon.title ||
        '探店任務',

      location:
        coupon.address || '',

      googleMapUrl:
        coupon.googleMapUrl || '',

      source:
        'explore_coupon',

      couponId:
        coupon.id || '',

      status:
        'pending',

      startAt,

      createdAt:
        serverTimestamp(),

      updatedAt:
        serverTimestamp(),
    }
  )
}
