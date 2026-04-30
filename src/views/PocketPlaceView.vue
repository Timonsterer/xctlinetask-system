<template>
  <div class="page">
    <header class="header">
      <div>
        <p class="tag">Pocket List</p>
        <h1>口袋名單</h1>
        <p class="sub">收藏、導航、分享你的私房名單</p>
      </div>
    </header>

    <section class="card">
      <h2>新增收藏</h2>

      <input v-model="form.name" placeholder="地點名稱，例如：好吃牛肉麵" />
      <input v-model="form.address" placeholder="地址或關鍵字，例如：台中市西區公益路" />

      <select v-model="form.category">
        <option value="餐廳">餐廳</option>
        <option value="咖啡">咖啡</option>
        <option value="客戶">客戶</option>
        <option value="景點">景點</option>
        <option value="其他">其他</option>
      </select>

      <textarea v-model="form.note" placeholder="備註，例如：牛肉很嫩、適合帶朋友"></textarea>

      <button class="primary-btn" @click="addPlace">
        加入口袋名單
      </button>
    </section>

    <section class="share-card">
      <div>
        <h2>分享我的公開名單</h2>
        <p>勾選下方「分享給大家」，就會出現在分享清單裡。</p>
      </div>

      <button class="share-main-btn" @click="sharePublicList">
        分享名單
      </button>
    </section>

    <section class="card">
      <h2>搜尋收藏</h2>
      <input v-model="keyword" placeholder="搜尋名稱、地址、分類、備註" />
    </section>

    <section class="list">
      <div v-if="filteredPlaces.length === 0" class="empty">
        尚無收藏地點
      </div>

      <div v-for="place in filteredPlaces" :key="place.id" class="place-card">
        <div class="place-top">
          <div>
            <h3>{{ place.name }}</h3>
            <span class="category">{{ place.category }}</span>
          </div>

          <label class="share-toggle">
            <input
              type="checkbox"
              :checked="place.isPublic"
              @change="togglePublic(place)"
            />
            <span>分享給大家</span>
          </label>
        </div>

        <p class="address">📍 {{ place.address }}</p>
        <p v-if="place.note" class="note">備註：{{ place.note }}</p>

        <div class="actions">
          <button @click="openMap(place)">開啟地圖</button>
          <button @click="openNavigation(place)">開始導航</button>
          <button @click="sharePlace(place)">單筆分享</button>
          <button class="delete" @click="deletePlace(place.id)">刪除</button>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  doc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/firebase'

const userId = localStorage.getItem('lineUserId') || ''

const places = ref([])
const keyword = ref('')

const form = ref({
  name: '',
  address: '',
  category: '餐廳',
  note: '',
})

const placesRef = collection(db, 'pocket_places')

const loadPlaces = async () => {
  if (!userId) {
    alert('尚未取得使用者資料，請先完成綁定')
    return
  }

  const q = query(
    placesRef,
    where('ownerId', '==', userId),
    orderBy('createdAt', 'desc')
  )

  const snap = await getDocs(q)

  places.value = snap.docs.map((docSnap) => ({
    id: docSnap.id,
    isPublic: false,
    ...docSnap.data(),
  }))
}

const addPlace = async () => {
  if (!form.value.name.trim()) {
    alert('請輸入地點名稱')
    return
  }

  if (!form.value.address.trim()) {
    alert('請輸入地址或關鍵字')
    return
  }

  await addDoc(placesRef, {
    ownerId: userId,
    name: form.value.name.trim(),
    address: form.value.address.trim(),
    category: form.value.category,
    note: form.value.note.trim(),
    isPublic: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  form.value = {
    name: '',
    address: '',
    category: '餐廳',
    note: '',
  }

  await loadPlaces()
}

const deletePlace = async (id) => {
  if (!confirm('確定要刪除這個收藏嗎？')) return

  await deleteDoc(doc(db, 'pocket_places', id))
  await loadPlaces()
}

const togglePublic = async (place) => {
  const nextValue = !place.isPublic

  await updateDoc(doc(db, 'pocket_places', place.id), {
    isPublic: nextValue,
    updatedAt: serverTimestamp(),
  })

  place.isPublic = nextValue
}

const filteredPlaces = computed(() => {
  const key = keyword.value.trim().toLowerCase()

  if (!key) return places.value

  return places.value.filter((place) => {
    return (
      place.name?.toLowerCase().includes(key) ||
      place.address?.toLowerCase().includes(key) ||
      place.category?.toLowerCase().includes(key) ||
      place.note?.toLowerCase().includes(key)
    )
  })
})

const publicPlaces = computed(() => {
  return places.value.filter((place) => place.isPublic)
})

const getSearchUrl = (place) => {
  const queryText = `${place.name} ${place.address}`
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(queryText)}`
}

const getNavigationUrl = (place) => {
  const destination = place.address || place.name
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`
}

const openMap = (place) => {
  window.open(getSearchUrl(place), '_blank')
}

const openNavigation = (place) => {
  window.open(getNavigationUrl(place), '_blank')
}

const sharePlace = async (place) => {
  const shareText = `${place.name}\n${place.address}\n${getSearchUrl(place)}`

  if (navigator.share) {
    await navigator.share({
      title: place.name,
      text: shareText,
      url: getSearchUrl(place),
    })
  } else {
    await navigator.clipboard.writeText(shareText)
    alert('分享連結已複製')
  }
}

const sharePublicList = async () => {
  if (publicPlaces.value.length === 0) {
    alert('請先勾選想分享的口袋名單')
    return
  }

  const listText = publicPlaces.value
    .map((place, index) => {
      return `${index + 1}. ${place.name}
${place.address}
${getSearchUrl(place)}`
    })
    .join('\n\n')

  const shareText = `我的口袋名單分享給你：\n\n${listText}`

  if (navigator.share) {
    await navigator.share({
      title: '我的口袋名單',
      text: shareText,
    })
  } else {
    await navigator.clipboard.writeText(shareText)
    alert('口袋名單已複製，可以貼到 LINE 分享')
  }
}

onMounted(loadPlaces)
</script>

<style scoped>
.page {
  min-height: 100vh;
  padding: 20px;
  background:
    radial-gradient(circle at top left, #dbeafe 0, transparent 35%),
    linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%);
  box-sizing: border-box;
}

.header,
.card,
.share-card,
.place-card {
  max-width: 720px;
  margin: 0 auto 16px;
}

.header {
  padding: 18px 4px 6px;
}

.tag {
  margin: 0 0 4px;
  color: #2563eb;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 1.5px;
}

h1 {
  margin: 0;
  font-size: 34px;
  font-weight: 900;
  color: #111827;
}

.sub {
  margin: 6px 0 0;
  color: #64748b;
}

.card,
.share-card,
.place-card {
  background: rgba(255, 255, 255, 0.92);
  border-radius: 22px;
  padding: 18px;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.08);
  backdrop-filter: blur(10px);
}

.share-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  background: linear-gradient(135deg, #111827, #1e3a8a);
  color: white;
}

h2 {
  margin: 0 0 12px;
  font-size: 20px;
}

.share-card h2 {
  margin-bottom: 6px;
}

.share-card p {
  margin: 0;
  color: #dbeafe;
  font-size: 14px;
}

input,
select,
textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 13px;
  margin-bottom: 10px;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  font-size: 16px;
  background: #f8fafc;
}

textarea {
  min-height: 84px;
  resize: vertical;
}

button {
  border: none;
  border-radius: 14px;
  padding: 11px 14px;
  background: #2563eb;
  color: white;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
}

button:hover {
  opacity: 0.92;
}

.primary-btn {
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
}

.share-main-btn {
  white-space: nowrap;
  background: white;
  color: #1e3a8a;
}

.place-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.place-card h3 {
  margin: 0 0 8px;
  font-size: 22px;
  color: #111827;
}

.category {
  display: inline-block;
  padding: 5px 10px;
  border-radius: 999px;
  background: #dbeafe;
  color: #1d4ed8;
  font-size: 13px;
  font-weight: 700;
}

.address,
.note {
  margin: 12px 0 0;
  color: #334155;
  line-height: 1.5;
}

.share-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  font-size: 14px;
  color: #475569;
  font-weight: 700;
}

.share-toggle input {
  width: auto;
  margin: 0;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
}

.delete {
  background: #dc2626;
}

.empty {
  max-width: 720px;
  margin: 0 auto;
  text-align: center;
  color: #777;
  padding: 30px 0;
}

@media (max-width: 520px) {
  .share-card,
  .place-top {
    flex-direction: column;
  }

  .share-main-btn {
    width: 100%;
  }

  .actions button {
    flex: 1 1 45%;
  }
}
</style>
