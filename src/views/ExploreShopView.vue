<template>
  <div class="page explore-page">
    <header class="card page-header">
      <div>
        <p class="eyebrow">EXPLORE</p>

        <h1 class="title">
          探店媒合
        </h1>

        <p class="sub">
          找看看最近有哪些優惠、探店、合作店家。
        </p>
      </div>

      <button
        class="btn btn-small add-btn"
        @click="goMerchant"
      >
        商家入口
      </button>
    </header>

    <section class="card-soft filter-box">
      <label>搜尋店家</label>

      <input
        v-model="keyword"
        placeholder="搜尋店名 / 地址 / 優惠"
      />
    </section>

    <section
      v-if="filteredShops.length === 0"
      class="empty"
    >
      目前沒有商家資料
    </section>

    <section
      v-else
      class="shop-list"
    >
      <div
        v-for="shop in filteredShops"
        :key="shop.id"
        class="card shop-card"
      >
        <img
          v-if="shop.imageUrl"
          :src="shop.imageUrl"
          class="shop-cover"
          alt="shop"
        />

        <div class="shop-content">
          <div class="shop-top">
            <div>
              <h2>
                {{ shop.name }}
              </h2>

              <p class="address">
                {{ shop.address || '無地址' }}
              </p>
            </div>

            <span class="badge badge-yellow">
              優惠中
            </span>
          </div>

          <div
            v-if="shop.coupon"
            class="coupon-box"
          >
            🎁 {{ shop.coupon }}
          </div>

          <p class="description">
            {{
              shop.description ||
              '這間店目前沒有補充介紹'
            }}
          </p>

          <div class="action-grid">
            <button
              class="btn btn-blue action-btn"
              @click="openMap(shop)"
            >
              <span>導航</span>
              <small>Google Map</small>
            </button>

            <button
              class="btn btn-green action-btn"
              @click="savePocket(shop)"
            >
              <span>收藏</span>
              <small>口袋名單</small>
            </button>

            <button
              class="btn btn-purple action-btn"
              @click="createRaid(shop)"
            >
              <span>揪團</span>
              <small>多人副本</small>
            </button>

            <button
              class="btn btn-yellow action-btn"
              @click="addTask(shop)"
            >
              <span>任務</span>
              <small>加入行程</small>
            </button>

            <button
              class="btn btn-secondary action-btn"
              @click="shareShop(shop)"
            >
              <span>分享</span>
              <small>分享朋友</small>
            </button>

            <button
              class="btn btn-red action-btn"
              @click="contactShop(shop)"
            >
              <span>聯絡</span>
              <small>聯繫店家</small>
            </button>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import {
  ref,
  computed,
  onMounted,
} from 'vue'

import {
  collection,
  getDocs,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore'

import { db } from '@/firebase'

const keyword = ref('')
const shops = ref([])

const lineUserId =
  localStorage.getItem('lineUserId') ||
  localStorage.getItem('userId') ||
  ''

const filteredShops = computed(() => {
  return shops.value.filter((shop) => {
    const text = `
      ${shop.name || ''}
      ${shop.address || ''}
      ${shop.description || ''}
      ${shop.coupon || ''}
    `.toLowerCase()

    return text.includes(
      keyword.value.toLowerCase()
    )
  })
})

const loadShops = async () => {
  const snap = await getDocs(
    collection(db, 'merchant_coupons')
  )

  shops.value = snap.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  }))
}

const mapUrl = (shop) => {
  const text =
    shop.address ||
    shop.name ||
    ''

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(text)}`
}

const openMap = (shop) => {
  window.location.assign(mapUrl(shop))
}

const savePocket = async (shop) => {
  try {
    await addDoc(
      collection(db, 'pocket_places'),
      {
        name: shop.name || '',
        address: shop.address || '',
        description:
          shop.description || '',
        imageUrl: shop.imageUrl || '',

        ownerId: lineUserId,
        userId: lineUserId,

        createdAt:
          serverTimestamp(),
      }
    )

    alert('已加入口袋名單')
  } catch (err) {
    console.error(err)
    alert('加入失敗')
  }
}

const createRaid = async (shop) => {
  try {
    await addDoc(
      collection(db, 'multi_raids'),
      {
        title: `${shop.name} 揪團`,
        description:
          shop.description || '',

        address:
          shop.address || '',

        imageUrl:
          shop.imageUrl || '',

        ownerId: lineUserId,

        status: 'recruiting',

        requiredPeople: 5,

        joinedUsers: [],

        createdAt:
          serverTimestamp(),
      }
    )

    alert('已建立多人副本')
  } catch (err) {
    console.error(err)
    alert('建立失敗')
  }
}

const addTask = async (shop) => {
  try {
    await addDoc(
      collection(db, 'tasks'),
      {
        title: `探店：${shop.name}`,

        description:
          shop.description || '',

        address:
          shop.address || '',

        type: 'explore_shop',

        ownerId: lineUserId,
        userId: lineUserId,

        status: 'pending',

        createdAt:
          serverTimestamp(),
      }
    )

    alert('已加入任務')
  } catch (err) {
    console.error(err)
    alert('加入失敗')
  }
}

const shareShop = async (shop) => {
  const text =
    `${shop.name}\n` +
    `${shop.address || ''}\n` +
    `${mapUrl(shop)}`

  try {
    if (navigator.share) {
      await navigator.share({
        title: shop.name,
        text,
      })
    } else {
      await navigator.clipboard.writeText(
        text
      )

      alert('已複製分享內容')
    }
  } catch (err) {
    console.error(err)
  }
}

const contactShop = (shop) => {
  if (shop.phone) {
    window.location.href =
      `tel:${shop.phone}`
    return
  }

  alert('此商家尚未提供聯絡方式')
}

const goMerchant = () => {
  window.location.href =
    '/merchant'
}

onMounted(() => {
  loadShops()
})
</script>

<style scoped>
.explore-page {
  max-width: 900px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;

  gap: 16px;
}

.eyebrow {
  margin: 0 0 6px;

  font-size: 12px;
  font-weight: 900;

  letter-spacing: 2px;

  color: #9b7b00;
}

.add-btn {
  white-space: nowrap;
}

.filter-box {
  margin-bottom: 18px;
}

.shop-list {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.shop-card {
  overflow: hidden;
  padding: 0;
}

.shop-cover {
  width: 100%;
  height: 220px;

  object-fit: cover;

  display: block;

  border-bottom:
    2px solid #1e1e1e;
}

.shop-content {
  padding: 18px;
}

.shop-top {
  display: flex;
  justify-content: space-between;

  align-items: flex-start;

  gap: 12px;
}

.shop-top h2 {
  margin: 0 0 6px;

  font-size: 22px;
  font-weight: 900;
}

.address {
  margin: 0;

  color: #666;

  font-size: 14px;
  font-weight: 700;

  line-height: 1.5;
}

.coupon-box {
  margin-top: 14px;

  background: #fff1a8;

  border:
    2px solid #1e1e1e;

  border-radius: 16px;

  padding: 12px 14px;

  font-size: 15px;
  font-weight: 900;
}

.description {
  margin: 14px 0 0;

  color: #333;

  font-size: 15px;
  font-weight: 700;

  line-height: 1.7;
}

.action-grid {
  display: grid;

  grid-template-columns:
    repeat(3, minmax(0, 1fr));

  gap: 10px;

  margin-top: 18px;

  width: 100%;
}

.action-btn {
  width: 100%;
  min-width: 0;

  min-height: 74px;

  padding: 10px 6px;

  display: flex;

  flex-direction: column;

  align-items: center;
  justify-content: center;

  gap: 4px;

  text-align: center;
}

.action-btn span {
  font-size: 15px;
  font-weight: 900;
}

.action-btn small {
  font-size: 12px;
  font-weight: 800;

  color: #333;
}

.btn-yellow {
  background: var(--primary);
}

@media (max-width: 768px) {
  .explore-page {
    max-width: 100%;
  }

  .page-header {
    flex-direction: column;
  }

  .add-btn {
    width: 100%;
  }

  .shop-top {
    flex-direction: column;
  }

  .action-grid {
    grid-template-columns:
      repeat(3, minmax(0, 1fr));

    gap: 8px;
  }

  .action-btn {
    min-height: 66px;

    padding: 8px 4px;
  }

  .action-btn span {
    font-size: 14px;
  }

  .action-btn small {
    font-size: 11px;
  }
}
</style>
