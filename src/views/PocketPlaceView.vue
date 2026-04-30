<template>
  <div class="page">
    <h1>口袋名單</h1>

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

      <textarea v-model="form.note" placeholder="備註"></textarea>

      <button @click="addPlace">加入口袋名單</button>
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
        <h3>{{ place.name }}</h3>
        <p>分類：{{ place.category }}</p>
        <p>地址：{{ place.address }}</p>
        <p v-if="place.note">備註：{{ place.note }}</p>

        <div class="actions">
          <button @click="openMap(place)">開啟地圖</button>
          <button @click="openNavigation(place)">開始導航</button>
          <button @click="sharePlace(place)">分享</button>
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
    createdAt: serverTimestamp(),
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

onMounted(loadPlaces)
</script>

<style scoped>
.page {
  max-width: 720px;
  margin: 0 auto;
  padding: 20px;
}

h1 {
  font-size: 28px;
  margin-bottom: 20px;
}

.card,
.place-card {
  background: white;
  border-radius: 14px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
}

h2 {
  font-size: 20px;
  margin-bottom: 12px;
}

input,
select,
textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 12px;
  margin-bottom: 10px;
  border: 1px solid #ddd;
  border-radius: 10px;
  font-size: 16px;
}

textarea {
  min-height: 80px;
  resize: vertical;
}

button {
  border: none;
  border-radius: 10px;
  padding: 10px 14px;
  background: #2563eb;
  color: white;
  font-size: 15px;
  cursor: pointer;
}

button:hover {
  opacity: 0.9;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.delete {
  background: #dc2626;
}

.empty {
  text-align: center;
  color: #777;
  padding: 30px 0;
}

.place-card h3 {
  margin: 0 0 8px;
  font-size: 20px;
}

.place-card p {
  margin: 6px 0;
  color: #333;
}
</style>
