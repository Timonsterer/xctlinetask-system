<template>
  <div class="explore-page">
    <section class="hero">
      <p class="eyebrow">EXPLORE</p>
      <h1>探店優惠</h1>
      <p class="hero-text">只顯示優惠券，使用後自動收藏店家。</p>
    </section>

    <section class="filter-card">
      <div class="filter-top">
        <h2>可去範圍</h2>
        <button class="refresh-btn" @click="loadExploreItems">重新搜尋</button>
      </div>

      <div class="area-input">
        <input
          v-model="areaInput"
          placeholder="例如：高雄楠梓區"
          @keyup.enter="addArea"
        />
        <button @click="addArea">新增</button>
      </div>

      <div class="quick-areas">
        <button
          v-for="area in quickAreas"
          :key="area"
          @click="quickAdd(area)"
        >
          {{ area }}
        </button>
      </div>

      <div class="area-list">
        <div
          v-for="area in allowedAreas"
          :key="area"
          class="area-chip"
        >
          {{ area }}
          <span @click="removeArea(area)">×</span>
        </div>
      </div>
    </section>

    <section class="coupon-section">
      <div class="section-top">
        <h2>優惠券列表</h2>
        <span class="count">{{ exploreItems.length }} 張</span>
      </div>

      <div v-if="loading" class="empty-box">讀取中...</div>

      <div v-else-if="exploreItems.length === 0" class="empty-box">
        目前沒有符合條件的優惠券
      </div>

      <div
        v-for="item in exploreItems"
        :key="item.id"
        class="coupon-card"
      >
        <img
          v-if="item.imageBase64 || item.imageUrl"
          :src="item.imageBase64 || item.imageUrl"
          class="coupon-image"
        />

        <div class="coupon-body">
          <div class="coupon-header">
            <div>
              <h3>{{ item.merchantName || '未命名商家' }}</h3>
              <p class="area">{{ item.area || item.category || '未設定區域' }}</p>
            </div>

            <div class="tag">優惠券</div>
          </div>

          <h4 class="title">
            {{ item.title || item.discountText || '未命名優惠券' }}
          </h4>

          <p class="desc">
            {{ item.description || item.discountText || '尚無說明' }}
          </p>

          <p class="address">
            📍 {{ item.address || '未提供地址' }}
          </p>

          <p v-if="item.code" class="code">
            優惠碼：{{ item.code }}
          </p>

          <p v-if="item.endDate" class="date">
            有效期限：{{ item.endDate }}
          </p>

          <div class="actions">
            <button class="use-btn" @click="useCoupon(item)">
              使用優惠券
            </button>

            <button class="task-btn" @click="addToTask(item)">
              加入任務
            </button>

            <button class="map-btn" @click="openMap(item)">
              Google Map
            </button>
          </div>
        </div>
      </div>
    </section>

    <div v-if="toast" class="toast">
      {{ toast }}
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'

import {
  collection,
  getDocs,
  doc,
  updateDoc,
  increment,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore'

import { db } from '@/firebase'

import {
  addCouponToPocketPlace,
  addCouponToTask,
} from '@/services/exploreService'

const loading = ref(false)
const exploreItems = ref([])
const toast = ref('')
const areaInput = ref('')
const allowedAreas = ref([])

const quickAreas = [
  '高雄楠梓區',
  '高雄左營區',
  '高雄三民區',
  '高雄鼓山區',
  '高雄新興區',
  '高雄苓雅區',
]

const userId =
  localStorage.getItem('lineUserId') ||
  localStorage.getItem('userId') ||
  'guest'

onMounted(async () => {
  const savedAreas = localStorage.getItem('exploreAreas')

  if (savedAreas) {
    allowedAreas.value = JSON.parse(savedAreas)
  }

  await loadExploreItems()
})

function saveAreas() {
  localStorage.setItem(
    'exploreAreas',
    JSON.stringify(allowedAreas.value)
  )
}

function addArea() {
  const area = areaInput.value.trim()
  if (!area) return

  if (!allowedAreas.value.includes(area)) {
    allowedAreas.value.push(area)
  }

  areaInput.value = ''
  saveAreas()
  loadExploreItems()
}

function quickAdd(area) {
  if (!allowedAreas.value.includes(area)) {
    allowedAreas.value.push(area)
  }

  saveAreas()
  loadExploreItems()
}

function removeArea(area) {
  allowedAreas.value = allowedAreas.value.filter((item) => item !== area)
  saveAreas()
  loadExploreItems()
}

function passAreaFilter(item) {
  if (allowedAreas.value.length === 0) return true

  const text = [
    item.area,
    item.address,
    item.category,
    item.merchantName,
  ]
    .filter(Boolean)
    .join(' ')

  return allowedAreas.value.some((area) => text.includes(area))
}

function passStatusFilter(item) {
  return !item.status || item.status === 'active'
}

function passDateFilter(item) {
  if (!item.endDate) return true

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const end = new Date(item.endDate)
  end.setHours(23, 59, 59, 999)

  return end >= today
}

async function loadExploreItems() {
  loading.value = true

  try {
    const merchantSnap = await getDocs(collection(db, 'merchants'))
    const couponSnap = await getDocs(collection(db, 'coupons'))

    const merchantMap = {}

    merchantSnap.docs.forEach((docSnap) => {
      merchantMap[docSnap.id] = {
        id: docSnap.id,
        ...docSnap.data(),
      }
    })

    const coupons = couponSnap.docs.map((docSnap) => {
      const data = docSnap.data()
      const merchant = merchantMap[data.merchantId] || {}

      return {
        id: docSnap.id,
        type: 'coupon',

        ...data,

        merchantId: data.merchantId || '',
        merchantName:
          data.merchantName ||
          merchant.name ||
          '未命名商家',

        category:
          data.category ||
          merchant.category ||
          '',

        area:
          data.area ||
          merchant.area ||
          merchant.category ||
          '',

        address:
          data.address ||
          merchant.address ||
          '',

        googleMapUrl:
          data.googleMapUrl ||
          data.mapUrl ||
          merchant.googleMapUrl ||
          merchant.mapUrl ||
          '',

        imageUrl:
          data.imageUrl ||
          merchant.imageUrl ||
          '',

        imageBase64:
          data.imageBase64 ||
          merchant.imageBase64 ||
          '',

        merchantData: merchant,
      }
    })

    exploreItems.value = coupons
      .filter(passStatusFilter)
      .filter(passDateFilter)
      .filter(passAreaFilter)
  } catch (err) {
    console.error(err)
    showToast('讀取優惠券失敗')
  } finally {
    loading.value = false
  }
}

async function useCoupon(item) {
  try {
    await addCouponToPocketPlace(userId, {
      id: item.merchantId || item.id,
      merchantId: item.merchantId || '',
      name: item.merchantName || item.name || item.title,
      merchantName: item.merchantName || item.name || item.title,
      category: item.category || '',
      area: item.area || '',
      address: item.address || '',
      googleMapUrl: item.googleMapUrl || item.mapUrl || '',
      mapUrl: item.googleMapUrl || item.mapUrl || '',
      imageUrl: item.imageUrl || '',
      imageBase64: item.imageBase64 || '',
      source: 'coupon_used',
      couponId: item.id,
      couponTitle: item.title || '',
    })

    await addDoc(collection(db, 'coupon_usages'), {
      userId,
      couponId: item.id,
      merchantId: item.merchantId || '',
      merchantName: item.merchantName || '',
      title: item.title || '',
      usedAt: serverTimestamp(),
    })

    await updateDoc(doc(db, 'coupons', item.id), {
      usedCount: increment(1),
      lastUsedAt: serverTimestamp(),
    })

    showToast('已使用優惠券，店家已自動收藏到口袋名單')
  } catch (err) {
    console.error(err)
    showToast('使用失敗，請檢查 Firestore 權限')
  }
}

async function addToTask(item) {
  try {
    await addCouponToTask(userId, item)
    showToast('已加入待做任務')
  } catch (err) {
    console.error(err)
    showToast('加入任務失敗')
  }
}

function openMap(item) {
  if (item.googleMapUrl || item.mapUrl) {
    window.open(item.googleMapUrl || item.mapUrl, '_blank')
    return
  }

  const keyword = encodeURIComponent(
    item.address ||
    item.merchantName ||
    item.title
  )

  window.open(
    `https://www.google.com/maps/search/?api=1&query=${keyword}`,
    '_blank'
  )
}

function showToast(message) {
  toast.value = message

  setTimeout(() => {
    toast.value = ''
  }, 1800)
}
</script>

<style scoped>
.explore-page {
  min-height: 100vh;
  padding: 20px;
  background:
    radial-gradient(circle at top left, #fef3c7 0, transparent 28%),
    linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%);
  box-sizing: border-box;
}

.hero,
.filter-card,
.coupon-section {
  max-width: 860px;
  margin: 0 auto 20px;
}

.hero {
  padding: 28px;
  border-radius: 28px;
  background: linear-gradient(135deg, #f59e0b, #b45309);
  color: white;
  box-shadow: 0 18px 40px rgba(180, 83, 9, 0.2);
}

.eyebrow {
  margin: 0 0 6px;
  font-size: 12px;
  letter-spacing: 2px;
  opacity: 0.85;
}

.hero h1 {
  margin: 0;
  font-size: 34px;
  font-weight: 900;
}

.hero-text {
  margin-top: 10px;
  color: #fff7ed;
}

.filter-card,
.coupon-section {
  background: white;
  border-radius: 24px;
  padding: 22px;
  box-shadow: 0 14px 32px rgba(15, 23, 42, 0.08);
}

.filter-top,
.section-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.filter-top h2,
.section-top h2 {
  margin: 0;
}

.refresh-btn {
  border: none;
  padding: 10px 14px;
  border-radius: 12px;
  background: #111827;
  color: white;
  cursor: pointer;
}

.area-input {
  margin-top: 18px;
  display: grid;
  grid-template-columns: 1fr 100px;
  gap: 10px;
}

.area-input input {
  padding: 14px;
  border-radius: 14px;
  border: 1px solid #d1d5db;
  font-size: 15px;
}

.area-input button {
  border: none;
  border-radius: 14px;
  background: #f59e0b;
  color: white;
  font-weight: 800;
  cursor: pointer;
}

.quick-areas,
.area-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 16px;
}

.quick-areas button {
  border: none;
  background: #f3f4f6;
  padding: 10px 14px;
  border-radius: 999px;
  cursor: pointer;
}

.area-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #dbeafe;
  color: #1d4ed8;
  padding: 10px 14px;
  border-radius: 999px;
  font-weight: 700;
}

.area-chip span {
  cursor: pointer;
}

.count {
  color: #6b7280;
}

.empty-box {
  padding: 28px;
  text-align: center;
  color: #6b7280;
}

.coupon-card {
  margin-top: 18px;
  border: 1px solid #e5e7eb;
  border-radius: 22px;
  overflow: hidden;
  background: white;
}

.coupon-image {
  width: 100%;
  height: 220px;
  object-fit: cover;
  background: #f3f4f6;
}

.coupon-body {
  padding: 18px;
}

.coupon-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.coupon-header h3 {
  margin: 0;
  font-size: 22px;
}

.area {
  margin-top: 4px;
  color: #6b7280;
}

.tag {
  height: fit-content;
  background: #fef3c7;
  color: #92400e;
  padding: 8px 12px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 800;
}

.title {
  margin-top: 16px;
  margin-bottom: 8px;
  font-size: 20px;
}

.desc {
  color: #4b5563;
  line-height: 1.7;
}

.address,
.code,
.date {
  margin-top: 12px;
  color: #374151;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 18px;
}

.actions button {
  flex: 1;
  min-width: 120px;
  border: none;
  padding: 13px;
  border-radius: 14px;
  font-weight: 800;
  cursor: pointer;
}

.use-btn {
  background: #f59e0b;
  color: white;
}

.task-btn {
  background: #dcfce7;
  color: #166534;
}

.map-btn {
  background: #111827;
  color: white;
}

.toast {
  position: fixed;
  left: 50%;
  bottom: 26px;
  transform: translateX(-50%);
  background: #111827;
  color: white;
  padding: 14px 18px;
  border-radius: 999px;
  font-weight: 800;
  box-shadow: 0 14px 32px rgba(0, 0, 0, 0.18);
}
</style>
