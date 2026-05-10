import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
  doc,
  updateDoc,
  increment,
  getDoc,
} from 'firebase/firestore'

import { db } from '@/firebase'

export async function getActiveCouponsByAreas(
  areas = []
) {
  const q = query(
    collection(db, 'coupons'),
    where('isActive', '==', true)
  )

  const snap = await getDocs(q)

  let list = snap.docs
    .map((d) => ({
      id: d.id,
      ...d.data(),
    }))

    // 🔥 過濾已用完優惠券
    .filter((item) => {
      const limit =
        Number(item.limit || 0)

      const used =
        Number(item.usedCount || 0)

      // limit = 0 代表不限量
      if (limit === 0) return true

      return used < limit
    })

  // 區域過濾
  if (areas.length > 0) {
    list = list.filter((item) => {
      return areas.includes(item.area)
    })
  }

  // 時間排序
  list.sort((a, b) => {
    const aTime =
      a.createdAt?.seconds || 0

    const bTime =
      b.createdAt?.seconds || 0

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

  const startAt =
    now.toISOString().slice(0, 16)

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

/**
 * 使用優惠券
 * 1. 扣數量
 * 2. 自動收藏店家
 * 3. 數量歸零自動隱藏
 */
export async function useCoupon(
  userId,
  coupon
) {
  const couponRef = doc(
    db,
    'coupons',
    coupon.id
  )

  const couponSnap =
    await getDoc(couponRef)

  if (!couponSnap.exists()) {
    throw new Error('優惠券不存在')
  }

  const data = couponSnap.data()

  const limit =
    Number(data.limit || 0)

  const used =
    Number(data.usedCount || 0)

  // 已售完
  if (
    limit > 0 &&
    used >= limit
  ) {
    throw new Error('優惠券已用完')
  }

  // 扣使用數
  await updateDoc(couponRef, {
    usedCount: increment(1),
    updatedAt: serverTimestamp(),
  })

  // 收藏店家
  await addCouponToPocketPlace(
    userId,
    coupon
  )

  // 再讀一次確認是否售完
  const afterSnap =
    await getDoc(couponRef)

  const afterData =
    afterSnap.data()

  const afterUsed =
    Number(afterData.usedCount || 0)

  // 🔥 歸零自動隱藏
  if (
    limit > 0 &&
    afterUsed >= limit
  ) {
    await updateDoc(couponRef, {
      isActive: false,
      soldOut: true,
      soldOutAt: serverTimestamp(),
    })
  }

  return true
}
