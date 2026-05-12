<template>
  <div class="contact-list-page">
    <header class="page-header">
      <div>
        <h1>聯絡人列表</h1>
        <p>管理你的客戶、朋友、合作對象。</p>
      </div>

      <button class="add-btn" @click="goCreate">
        ＋ 新增聯絡人
      </button>
    </header>

    <section class="toolbar">
      <input
        v-model.trim="keyword"
        type="text"
        class="search-input"
        placeholder="搜尋姓名、電話、地址、備註"
      />

      <select v-model="sortType" class="sort-select">
        <option value="createdDesc">最新建立</option>
        <option value="createdAsc">最早建立</option>
        <option value="nameAsc">姓名 A → Z</option>
        <option value="nameDesc">姓名 Z → A</option>
      </select>

      <button class="refresh-btn" @click="loadContacts" :disabled="loading">
        {{ loading ? '載入中...' : '重新整理' }}
      </button>
    </section>

    <p v-if="errorMessage" class="error-msg">{{ errorMessage }}</p>
    <p v-if="successMessage" class="success-msg">{{ successMessage }}</p>

    <section v-if="loading" class="state-box">
      載入中...
    </section>

    <section v-else-if="filteredContacts.length === 0" class="state-box">
      目前沒有聯絡人
    </section>

    <section v-else class="contact-grid">
      <article
        v-for="item in filteredContacts"
        :key="item.id"
        class="contact-card"
      >
        <div class="card-top">
          <div class="avatar">
            {{ getInitial(item.name) }}
          </div>

          <div class="title-wrap">
            <h3>{{ item.name || '未命名聯絡人' }}</h3>
            <p v-if="item.company" class="sub-text">{{ item.company }}</p>
          </div>
        </div>

        <div class="card-body">
          <p v-if="item.phone"><strong>電話：</strong>{{ item.phone }}</p>
          <p v-if="item.address"><strong>地址：</strong>{{ item.address }}</p>
          <p v-if="item.note"><strong>備註：</strong>{{ item.note }}</p>
          <p class="time-text">
            建立時間：{{ formatDateTime(item.createdAt) }}
          </p>
        </div>

        <div class="card-actions">
          <button class="detail-btn" @click="goDetail(item.id)">詳細</button>
          <button class="edit-btn" @click="goEdit(item.id)">編輯</button>
          <button class="delete-btn" @click="removeContact(item.id)">刪除</button>
        </div>
      </article>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query
} from 'firebase/firestore'
import { db } from '../firebase'

const router = useRouter()

const loading = ref(false)
const keyword = ref('')
const sortType = ref('createdDesc')
const contacts = ref([])

const errorMessage = ref('')
const successMessage = ref('')

const currentUserId =
  localStorage.getItem('lineUserId') ||
  localStorage.getItem('userId') ||
  ''

const filteredContacts = computed(() => {
  const kw = keyword.value.toLowerCase()

  let list = contacts.value.filter((item) => {
    return (
      !kw ||
      (item.name || '').toLowerCase().includes(kw) ||
      (item.phone || '').toLowerCase().includes(kw) ||
      (item.address || '').toLowerCase().includes(kw) ||
      (item.note || '').toLowerCase().includes(kw) ||
      (item.company || '').toLowerCase().includes(kw)
    )
  })

  if (sortType.value === 'nameAsc') {
    list.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'zh-Hant'))
  } else if (sortType.value === 'nameDesc') {
    list.sort((a, b) => (b.name || '').localeCompare(a.name || '', 'zh-Hant'))
  } else if (sortType.value === 'createdAsc') {
    list.sort((a, b) => getTime(a.createdAt) - getTime(b.createdAt))
  } else {
    list.sort((a, b) => getTime(b.createdAt) - getTime(a.createdAt))
  }

  return list
})

function getTime(value) {
  if (!value) return 0
  if (value?.toDate) return value.toDate().getTime()
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? 0 : d.getTime()
}

function getInitial(name) {
  return (name || '?').slice(0, 1)
}

function formatDateTime(value) {
  if (!value) return '-'
  const date = value?.toDate ? value.toDate() : new Date(value)
  if (Number.isNaN(date.getTime())) return '-'

  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')

  return `${y}-${m}-${d} ${hh}:${mm}`
}

async function loadContacts() {
  loading.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    if (!currentUserId) {
      errorMessage.value = '找不到使用者，請先登入'
      contacts.value = []
      return
    }

    const q = query(
      collection(db, 'users', currentUserId, 'contacts'),
      orderBy('createdAt', 'desc')
    )

    const snapshot = await getDocs(q)

    contacts.value = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data()
    }))
  } catch (error) {
    console.error('loadContacts error:', error)
    errorMessage.value = '讀取聯絡人失敗'
  } finally {
    loading.value = false
  }
}

function goCreate() {
  router.push('/contacts/new')
}

function goDetail(id) {
  router.push(`/contacts/${id}`)
}

function goEdit(id) {
  router.push(`/contacts/${id}/edit`)
}

async function removeContact(id) {
  const ok = window.confirm('確定要刪除這位聯絡人嗎？')
  if (!ok) return

  errorMessage.value = ''
  successMessage.value = ''

  try {
    await deleteDoc(doc(db, 'users', currentUserId, 'contacts', id))
    successMessage.value = '已刪除聯絡人'
    await loadContacts()
  } catch (error) {
    console.error('removeContact error:', error)
    errorMessage.value = '刪除失敗'
  }
}

onMounted(() => {
  loadContacts()
})
</script>

<style scoped>
.contact-page {
  max-width: 920px;
  margin: 0 auto;
}

/* =========================
   Header
========================= */

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

.filter-box {
  margin-bottom: 18px;
}

/* =========================
   聯絡人列表
========================= */

.contact-list {
  display: flex;
  flex-direction: column;

  gap: 18px;
}

.contact-card {
  overflow: hidden;
}

.contact-top {
  display: flex;

  gap: 14px;
}

.avatar {
  width: 68px;
  height: 68px;

  flex: 0 0 68px;

  border-radius: 20px;

  background: #fff1a8;

  border: 2px solid #1e1e1e;

  display: flex;

  align-items: center;
  justify-content: center;

  font-size: 28px;
  font-weight: 900;

  box-shadow: 0 5px 0 #1e1e1e;
}

.contact-info {
  flex: 1;
  min-width: 0;
}

.name-row {
  display: flex;

  justify-content: space-between;

  align-items: flex-start;

  gap: 10px;
}

.name-row h2 {
  margin: 0;

  font-size: 24px;
  font-weight: 900;
}

.contact-title {
  margin: 10px 0 0;

  font-size: 15px;
  font-weight: 800;

  color: #333;
}

.contact-meta {
  margin-top: 10px;

  display: flex;
  flex-wrap: wrap;

  gap: 10px;

  color: #666;

  font-size: 13px;
  font-weight: 700;
}

.note-box {
  margin-top: 16px;

  background: #fff8e8;

  border: 2px solid #1e1e1e;

  border-radius: 16px;

  padding: 14px;

  font-size: 14px;
  font-weight: 700;

  line-height: 1.7;
}

/* =========================
   橫3按鈕
========================= */

.action-grid {
  display: grid;

  grid-template-columns:
    repeat(3, minmax(0, 1fr));

  gap: 10px;

  margin-top: 18px;

  width: 100%;
}

.action-grid button,
.action-grid .btn {
  width: 100%;
  min-width: 0;
}

.action-btn {
  min-height: 72px;

  padding: 10px 6px;

  display: flex;

  flex-direction: column;

  align-items: center;
  justify-content: center;

  gap: 4px;

  text-align: center;

  border-radius: 18px;
}

.action-btn span {
  font-size: 15px;
  font-weight: 900;
}

.action-btn small {
  font-size: 11px;
  font-weight: 800;

  color: #333;
}

/* =========================
   彩色按鈕
========================= */

.btn-blue {
  background: #bfe3ff;
}

.btn-green {
  background: #c8ffd8;
}

.btn-purple {
  background: #e2d4ff;
}

.btn-yellow {
  background: #fff1a8;
}

.btn-red {
  background: #ffc9c9;
}

.btn-secondary {
  background: #ececec;
}

/* =========================
   Empty
========================= */

.empty {
  text-align: center;

  padding: 40px 0;

  color: #666;

  font-size: 15px;
  font-weight: 800;
}

/* =========================
   狀態
========================= */

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* =========================
   手機版
========================= */

@media (max-width: 768px) {
  .contact-page {
    max-width: 100%;
  }

  .page-header {
    flex-direction: column;
  }

  .page-header button {
    width: 100%;
  }

  .contact-top {
    flex-direction: column;
  }

  .name-row {
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
    font-size: 10px;
  }
}
</style>
