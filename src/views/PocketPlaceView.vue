<template>
  <div class="pocket-page">
    <header class="header">
      <div>
        <p class="eyebrow">口袋名單</p>
        <h1>我的收藏地點</h1>
      </div>

      <button class="add-btn" @click="openCreateModal">
        新增地點
      </button>
    </header>

    <section class="search-box">
      <input v-model="keyword" placeholder="搜尋地點名稱 / 地址" />
    </section>

    <section v-if="filteredPlaces.length === 0" class="empty">
      尚無口袋名單
    </section>

    <section v-else class="place-list">
      <div
        v-for="place in filteredPlaces"
        :key="place.id"
        class="place-card"
      >
        <img v-if="place.imageUrl" :src="place.imageUrl" class="cover" />

        <div class="content">
          <h2>{{ place.name }}</h2>
          <p class="address">{{ place.address || '無地址' }}</p>

          <p class="description">
            {{ place.description || place.note || '無介紹' }}
          </p>

          <div class="action-grid">
            <button class="action-btn" type="button" @click.stop="openMap(place)">
              地圖導航
            </button>

            <button class="action-btn blue" type="button" @click.stop="addToTask(place)">
              一鍵加入任務
            </button>

            <button class="action-btn purple" type="button" @click.stop="createRaid(place)">
              發起多人副本
            </button>

            <button class="action-btn green" type="button" @click.stop="sharePlace(place)">
              分享
            </button>

            <button class="action-btn" type="button" @click.stop="editPlace(place)">
              編輯
            </button>

            <button class="action-btn red" type="button" @click.stop="deletePlace(place.id)">
              刪除
            </button>
          </div>
        </div>
      </div>
    </section>

    <div v-if="showModal" class="modal">
      <div class="modal-card">
        <h2>{{ editingId ? '編輯地點' : '新增地點' }}</h2>

        <div class="form-grid">
          <input v-model="form.name" placeholder="地點名稱" />
          <input v-model="form.address" placeholder="地址，導航會優先用這個" />
          <input v-model="form.imageUrl" placeholder="圖片網址" />
          <textarea v-model="form.description" placeholder="介紹" />
        </div>

        <div class="modal-actions">
          <button class="action-btn blue" type="button" @click="savePlace">
            {{ editingId ? '更新' : '新增' }}
          </button>

          <button class="action-btn" type="button" @click="closeModal">
            取消
          </button>
        </div>
      </div>
    </div>
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
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore'

import { db } from '@/firebase'

const places = ref([])
const keyword = ref('')
const showModal = ref(false)
const editingId = ref(null)

const form = ref({
  name: '',
  address: '',
  imageUrl: '',
  description: '',
})

const lineUserId =
  localStorage.getItem('lineUserId') ||
  localStorage.getItem('userId') ||
  ''

const makePlaceKey = (place) => {
  if (place.merchantId) {
    return `merchant:${place.merchantId}`
  }

  const name = String(place.name || place.merchantName || '')
    .trim()
    .toLowerCase()

  const address = String(place.address || '')
    .trim()
    .toLowerCase()

  return `${name}__${address}`
}

const buildGoogleMapsUrl = (place) => {
  const address = String(place.address || '').trim()
  const name = String(place.name || place.merchantName || '').trim()

  const queryText = address || name

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(queryText)}`
}

const uniquePlaces = computed(() => {
  const map = new Map()

  const sorted = [...places.value].sort((a, b) => {
    const aTime = a.createdAt?.seconds || 0
    const bTime = b.createdAt?.seconds || 0
    return bTime - aTime
  })

  sorted.forEach((place) => {
    const key = makePlaceKey(place)
    if (!key.trim()) return

    if (!map.has(key)) {
      map.set(key, place)
    }
  })

  return Array.from(map.values())
})

const filteredPlaces = computed(() => {
  return uniquePlaces.value.filter((place) => {
    const text = `
      ${place.name || ''}
      ${place.merchantName || ''}
      ${place.address || ''}
      ${place.description || ''}
      ${place.note || ''}
    `.toLowerCase()

    return text.includes(keyword.value.toLowerCase())
  })
})

const loadPlaces = async () => {
  const snap = await getDocs(collection(db, 'pocket_places'))

  const list = snap.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  }))

  places.value = list.filter((place) => {
    if (!lineUserId) return false

    return (
      place.ownerId === lineUserId ||
      place.userId === lineUserId
    )
  })
}

const resetForm = () => {
  editingId.value = null

  form.value = {
    name: '',
    address: '',
    imageUrl: '',
    description: '',
  }
}

const openCreateModal = () => {
  resetForm()
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  resetForm()
}

const editPlace = (place) => {
  editingId.value = place.id

  form.value = {
    name: place.name || '',
    address: place.address || '',
    imageUrl: place.imageUrl || '',
    description: place.description || place.note || '',
  }

  showModal.value = true
}

const savePlace = async () => {
  if (!form.value.name.trim()) {
    alert('請輸入地點名稱')
    return
  }

  if (!lineUserId) {
    alert('尚未登入')
    return
  }

  const newKey = makePlaceKey(form.value)

  const duplicated = uniquePlaces.value.find((place) => {
    if (editingId.value && place.id === editingId.value) {
      return false
    }

    return makePlaceKey(place) === newKey
  })

  if (duplicated) {
    alert('這個地點已經在口袋名單內')
    return
  }

  const payload = {
    name: form.value.name.trim(),
    address: form.value.address.trim(),
    imageUrl: form.value.imageUrl.trim(),
    description: form.value.description.trim(),

    ownerId: lineUserId,
    userId: lineUserId,

    isShared: false,
    visibility: 'private',

    updatedAt: serverTimestamp(),
  }

  if (editingId.value) {
    await updateDoc(
      doc(db, 'pocket_places', editingId.value),
      payload
    )
  } else {
    await addDoc(collection(db, 'pocket_places'), {
      ...payload,
      createdAt: serverTimestamp(),
    })
  }

  closeModal()
  await loadPlaces()
}

const deletePlace = async (id) => {
  const ok = confirm('確定刪除？')
  if (!ok) return

  await deleteDoc(doc(db, 'pocket_places', id))
  await loadPlaces()
}

const openMap = (place) => {
  const queryText = String(place.address || place.name || '').trim()

  if (!queryText) {
    alert('這筆地點沒有地址或名稱，無法導航')
    return
  }

  const url = buildGoogleMapsUrl(place)

  window.location.assign(url)
}

const addToTask = async (place) => {
  try {
    if (!lineUserId) {
      alert('尚未登入')
      return
    }

    await addDoc(collection(db, 'tasks'), {
      title: `前往：${place.name}`,
      description: place.description || place.note || '',
      address: place.address || '',
      mapUrl: buildGoogleMapsUrl(place),
      type: 'pocket_place',
      pocketPlaceId: place.id,
      pocketPlaceName: place.name,
      userId: lineUserId,
      ownerId: lineUserId,
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    alert('已新增到任務')
  } catch (err) {
    console.error(err)
    alert('新增任務失敗')
  }
}

const createRaid = async (place) => {
  try {
    if (!lineUserId) {
      alert('尚未登入')
      return
    }

    await addDoc(collection(db, 'multi_raids'), {
      title: `${place.name} 揪團`,
      description: place.description || place.note || '',
      address: place.address || '',
      imageUrl: place.imageUrl || '',
      mapUrl: buildGoogleMapsUrl(place),
      ownerId: lineUserId,
      pocketPlaceId: place.id,
      status: 'recruiting',
      requiredPeople: 5,
      joinedUsers: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    alert('已建立多人副本')
  } catch (err) {
    console.error(err)
    alert('建立多人副本失敗')
  }
}

const sharePlace = async (place) => {
  try {
    const text =
      `${place.name}\n` +
      `${place.address || ''}\n` +
      `${buildGoogleMapsUrl(place)}`

    if (navigator.share) {
      await navigator.share({
        title: place.name,
        text,
      })
    } else {
      await navigator.clipboard.writeText(text)
      alert('已複製分享內容')
    }

    await updateDoc(
      doc(db, 'pocket_places', place.id),
      {
        isShared: true,
        visibility: 'public',
        sharedAt: serverTimestamp(),
      }
    )
  } catch (err) {
    console.error(err)
  }
}

onMounted(() => {
  loadPlaces()
})
</script>

<style scoped>
.pocket-page {
  min-height: 100vh;
  background: #f4f7fb;
  padding: 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.eyebrow {
  color: #2563eb;
  font-size: 13px;
  font-weight: bold;
}

.search-box {
  margin-bottom: 20px;
}

.search-box input,
input,
textarea {
  width: 100%;
  padding: 12px;
  border-radius: 14px;
  border: 1px solid #ddd;
  box-sizing: border-box;
}

textarea {
  min-height: 100px;
}

.place-list {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.place-card {
  overflow: hidden;
  border-radius: 24px;
  background: white;
}

.cover {
  width: 100%;
  height: 220px;
  object-fit: cover;
}

.content {
  padding: 20px;
}

.address {
  color: #6b7280;
}

.description {
  margin-top: 12px;
  color: #374151;
}

.action-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  margin-top: 18px;
}

.action-btn,
.add-btn {
  border: none;
  border-radius: 14px;
  padding: 12px;
  color: white;
  font-weight: bold;
  cursor: pointer;
  background: #374151;
}

.blue {
  background: #2563eb;
}

.green {
  background: #059669;
}

.red {
  background: #dc2626;
}

.purple {
  background: #7c3aed;
}

.empty {
  text-align: center;
  color: #6b7280;
  padding: 40px;
}

.modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, .45);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 999;
}

.modal-card {
  width: 92%;
  max-width: 520px;
  background: white;
  border-radius: 24px;
  padding: 24px;
}

.form-grid {
  display: grid;
  gap: 12px;
}

.modal-actions {
  display: flex;
  gap: 10px;
  margin-top: 18px;
}

@media (max-width: 768px) {
  .action-grid {
    grid-template-columns: 1fr;
  }

  .header {
    flex-direction: column;
    align-items: flex-start;
    gap: 14px;
  }

  .add-btn {
    width: 100%;
  }
}
</style>
