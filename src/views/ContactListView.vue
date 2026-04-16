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
.contact-list-page {
  max-width: 1080px;
  margin: 0 auto;
  padding: 20px;
  color: #1f2937;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}

.page-header h1 {
  margin: 0 0 8px;
  font-size: 28px;
}

.page-header p {
  margin: 0;
  color: #6b7280;
}

.add-btn,
.refresh-btn,
.card-actions button {
  border: none;
  border-radius: 12px;
  padding: 12px 14px;
  cursor: pointer;
  font-size: 14px;
}

.add-btn,
.refresh-btn {
  background: #111827;
  color: #fff;
}

.add-btn:disabled,
.refresh-btn:disabled,
.card-actions button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.toolbar {
  display: grid;
  grid-template-columns: 1.4fr 200px 140px;
  gap: 12px;
  margin-bottom: 16px;
}

.search-input,
.sort-select {
  width: 100%;
  padding: 12px;
  border: 1px solid #d1d5db;
  border-radius: 12px;
  font-size: 14px;
  box-sizing: border-box;
}

.error-msg,
.success-msg {
  margin: 0 0 16px;
  padding: 12px 14px;
  border-radius: 12px;
}

.error-msg {
  background: #fef2f2;
  color: #b91c1c;
}

.success-msg {
  background: #ecfdf5;
  color: #047857;
}

.state-box {
  padding: 28px;
  text-align: center;
  background: #f9fafb;
  border: 1px dashed #d1d5db;
  border-radius: 16px;
}

.contact-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.contact-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 18px;
  padding: 16px;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.04);
}

.card-top {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}

.avatar {
  width: 52px;
  height: 52px;
  border-radius: 999px;
  background: #e5e7eb;
  color: #111827;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: 700;
  flex-shrink: 0;
}

.title-wrap h3 {
  margin: 0 0 4px;
  font-size: 18px;
}

.sub-text {
  margin: 0;
  color: #6b7280;
  font-size: 14px;
}

.card-body p {
  margin: 0 0 8px;
  line-height: 1.5;
  word-break: break-word;
}

.time-text {
  color: #6b7280;
  font-size: 13px;
}

.card-actions {
  display: flex;
  gap: 8px;
  margin-top: 14px;
  flex-wrap: wrap;
}

.detail-btn {
  background: #111827;
  color: #fff;
}

.edit-btn {
  background: #2563eb;
  color: #fff;
}

.delete-btn {
  background: #dc2626;
  color: #fff;
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: stretch;
  }

  .toolbar {
    grid-template-columns: 1fr;
  }

  .contact-grid {
    grid-template-columns: 1fr;
  }
}
</style>
