<template>
  <div class="page pocket-page">
    <header class="card page-header">
      <div>
        <p class="eyebrow">POCKET</p>
        <h1 class="title">我的收藏地點</h1>
        <p class="sub">收藏想去的店家，快速導航、加入任務或發起多人副本。</p>
      </div>

      <button class="btn btn-small add-btn" @click="openCreateModal">
        ＋ 新增地點
      </button>
    </header>

    <section class="card-soft search-box">
      <label for="keyword">搜尋口袋名單</label>
      <input
        id="keyword"
        v-model="keyword"
        placeholder="搜尋地點名稱 / 地址"
      />
    </section>

    <section v-if="filteredPlaces.length === 0" class="empty">
      尚無口袋名單
    </section>

    <section v-else class="place-list">
      <div
        v-for="place in filteredPlaces"
        :key="place.id"
        class="card place-card"
      >
        <img
          v-if="place.imageUrl"
          :src="place.imageUrl"
          class="cover"
          alt="地點照片"
        />

        <div class="content">
          <div class="place-title-row">
            <div>
              <h2>{{ place.name }}</h2>
              <p class="address">
                {{ place.address || '無地址' }}
              </p>
            </div>

            <span class="badge badge-yellow">
              收藏
            </span>
          </div>

          <p class="description">
            {{ place.description || place.note || '無介紹' }}
          </p>

          <div class="action-grid">
            <button
              class="btn btn-blue action-btn"
              type="button"
              @click.stop="openMap(place)"
            >
              <span>地圖</span>
              <small>導航</small>
            </button>

            <button
              class="btn btn-green action-btn"
              type="button"
              @click.stop="addToTask(place)"
            >
              <span>任務</span>
              <small>加入</small>
            </button>

            <button
              class="btn btn-purple action-btn"
              type="button"
              @click.stop="createRaid(place)"
            >
              <span>副本</span>
              <small>揪團</small>
            </button>

            <button
              class="btn btn-yellow action-btn"
              type="button"
              @click.stop="sharePlace(place)"
            >
              <span>分享</span>
              <small>公開</small>
            </button>

            <button
              class="btn btn-secondary action-btn"
              type="button"
              @click.stop="editPlace(place)"
            >
              <span>編輯</span>
              <small>修改</small>
            </button>

            <button
              class="btn btn-red action-btn"
              type="button"
              @click.stop="deletePlace(place.id)"
            >
              <span>刪除</span>
              <small>移除</small>
            </button>
          </div>
        </div>
      </div>
    </section>

    <div v-if="showModal" class="modal">
      <div class="card modal-card">
        <div class="modal-header">
          <div>
            <p class="eyebrow">PLACE</p>
            <h2>{{ editingId ? '編輯地點' : '新增地點' }}</h2>
          </div>

          <button class="btn btn-small btn-secondary close-btn" @click="closeModal">
            ×
          </button>
        </div>

        <div class="form-grid">
          <div>
            <label>地點名稱</label>
            <input v-model="form.name" placeholder="例如：某某咖啡廳" />
          </div>

          <div>
            <label>地址</label>
            <input v-model="form.address" placeholder="地址，導航會優先用這個" />
          </div>

          <div>
            <label>圖片網址</label>
            <input v-model="form.imageUrl" placeholder="可留空，不使用預設圖片" />
          </div>

          <div>
            <label>介紹</label>
            <textarea v-model="form.description" placeholder="簡單寫一下這個地點的特色" />
          </div>
        </div>

        <div class="modal-actions">
          <button class="btn" type="button" @click="savePlace">
            {{ editingId ? '更新地點' : '新增地點' }}
          </button>

          <button class="btn btn-secondary" type="button" @click="closeModal">
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
  max-width: 860px;
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

.search-box {
  margin-bottom: 18px;
}

.place-list {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.place-card {
  overflow: hidden;
  padding: 0;
}

.cover {
  width: 100%;
  height: 220px;
  object-fit: cover;
  display: block;
  border-bottom: 2px solid #1e1e1e;
}

.content {
  padding: 18px;
}

.place-title-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.place-title-row h2 {
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

.description {
  margin: 14px 0 0;
  color: #333;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.7;
}

.action-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
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
  gap: 3px;

  text-align: center;
  line-height: 1.2;
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

.modal {
  position: fixed;
  inset: 0;
  background: rgba(30, 30, 30, 0.45);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 999;
  padding: 18px;
}

.modal-card {
  width: 100%;
  max-width: 540px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 14px;
  margin-bottom: 16px;
}

.modal-header h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 900;
}

.close-btn {
  width: 44px;
  height: 44px;
  padding: 0;
  flex: 0 0 44px;
}

.form-grid {
  display: grid;
  gap: 4px;
}

.modal-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 12px;
}

@media (max-width: 768px) {
  .pocket-page {
    max-width: 100%;
  }

  .page-header {
    flex-direction: column;
  }

  .add-btn {
    width: 100%;
  }

  .action-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
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

  .place-title-row {
    flex-direction: column;
  }

  .modal-actions {
    grid-template-columns: 1fr;
  }
}
</style>
