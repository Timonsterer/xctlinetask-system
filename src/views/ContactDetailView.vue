<template>
  <div class="contact-detail-page">
    <header class="page-header">
      <div>
        <h1>聯絡人詳細</h1>
        <p>查看完整資料與快速操作</p>
      </div>

      <div class="header-actions">
        <button class="back-btn" @click="goBack">返回</button>
        <button class="edit-btn" @click="goEdit" :disabled="!contact">編輯</button>
      </div>
    </header>

    <section v-if="loading" class="state-box">
      載入中...
    </section>

    <section v-else-if="!contact" class="state-box">
      找不到此聯絡人
    </section>

    <section v-else class="detail-card">
      <div class="top-block">
        <div class="avatar">
          {{ getInitial(contact.name) }}
        </div>

        <div class="title-wrap">
          <h2>{{ contact.name || '未命名聯絡人' }}</h2>
          <p v-if="contact.company" class="sub-text">{{ contact.company }}</p>
        </div>
      </div>

      <div class="info-grid">
        <div v-if="contact.phone" class="info-item">
          <span>電話</span>
          <p>{{ contact.phone }}</p>
          <button @click="callPhone(contact.phone)">撥打</button>
        </div>

        <div v-if="contact.email" class="info-item">
          <span>Email</span>
          <p>{{ contact.email }}</p>
          <button @click="sendEmail(contact.email)">寄信</button>
        </div>

        <div v-if="contact.address" class="info-item full">
          <span>地址</span>
          <p>{{ contact.address }}</p>
          <button @click="openMap(contact.address)">開啟地圖</button>
        </div>

        <div v-if="contact.note" class="info-item full">
          <span>備註</span>
          <p>{{ contact.note }}</p>
        </div>

        <div class="info-item">
          <span>建立時間</span>
          <p>{{ formatDateTime(contact.createdAt) }}</p>
        </div>

        <div class="info-item">
          <span>更新時間</span>
          <p>{{ formatDateTime(contact.updatedAt) }}</p>
        </div>
      </div>

      <div class="bottom-actions">
        <button class="delete-btn" @click="removeContact">刪除聯絡人</button>
      </div>
    </section>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { deleteDoc, doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'

const router = useRouter()
const route = useRoute()

const loading = ref(false)
const contact = ref(null)

const currentUserId =
  localStorage.getItem('lineUserId') ||
  localStorage.getItem('userId') ||
  ''

const contactId = route.params.id

function goBack() {
  router.push('/contacts')
}

function goEdit() {
  router.push(`/contacts/${contactId}/edit`)
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

function callPhone(phone) {
  window.location.href = `tel:${phone}`
}

function sendEmail(email) {
  window.location.href = `mailto:${email}`
}

function openMap(address) {
  const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
  window.open(url, '_blank')
}

async function loadContact() {
  loading.value = true

  try {
    if (!currentUserId) return

    const refDoc = doc(db, 'users', currentUserId, 'contacts', String(contactId))
    const snap = await getDoc(refDoc)

    if (!snap.exists()) {
      contact.value = null
      return
    }

    contact.value = snap.data()
  } catch (error) {
    console.error('loadContact error:', error)
  } finally {
    loading.value = false
  }
}

async function removeContact() {
  const ok = window.confirm('確定要刪除這位聯絡人嗎？')
  if (!ok) return

  try {
    await deleteDoc(doc(db, 'users', currentUserId, 'contacts', String(contactId)))
    router.push('/contacts')
  } catch (error) {
    console.error('removeContact error:', error)
  }
}

onMounted(() => {
  loadContact()
})
</script>

<style scoped>
.contact-detail-page {
  max-width: 860px;
  margin: 0 auto;
  padding: 20px;
  color: #1f2937;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header h1 {
  margin: 0 0 6px;
  font-size: 26px;
}

.page-header p {
  margin: 0;
  color: #6b7280;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.back-btn,
.edit-btn,
.delete-btn,
.info-item button {
  border: none;
  border-radius: 12px;
  padding: 10px 14px;
  cursor: pointer;
  font-size: 14px;
}

.back-btn {
  background: #e5e7eb;
}

.edit-btn {
  background: #2563eb;
  color: #fff;
}

.delete-btn {
  background: #dc2626;
  color: #fff;
}

.state-box {
  padding: 30px;
  text-align: center;
  background: #f9fafb;
  border-radius: 16px;
}

.detail-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 20px;
  padding: 20px;
}

.top-block {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}

.avatar {
  width: 64px;
  height: 64px;
  border-radius: 999px;
  background: #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 700;
}

.title-wrap h2 {
  margin: 0 0 6px;
}

.sub-text {
  margin: 0;
  color: #6b7280;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.info-item {
  background: #f9fafb;
  padding: 14px;
  border-radius: 14px;
}

.info-item span {
  font-size: 13px;
  color: #6b7280;
}

.info-item p {
  margin: 6px 0 10px;
  word-break: break-word;
}

.info-item button {
  background: #111827;
  color: #fff;
}

.full {
  grid-column: 1 / -1;
}

.bottom-actions {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

@media (max-width: 768px) {
  .info-grid {
    grid-template-columns: 1fr;
  }

  .page-header {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }
}
</style>
