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
  max-width: 880px;
  margin: 0 auto;
}

.hero-card {
  overflow: hidden;
}

.hero-top {
  display: flex;

  gap: 16px;
}

.avatar {
  width: 84px;
  height: 84px;

  flex: 0 0 84px;

  border-radius: 24px;

  background: #fff1a8;

  border:
    2px solid #1e1e1e;

  display: flex;

  align-items: center;
  justify-content: center;

  font-size: 34px;
  font-weight: 900;

  box-shadow:
    0 5px 0 #1e1e1e;
}

.hero-info {
  flex: 1;
}

.eyebrow {
  margin: 0 0 6px;

  font-size: 12px;
  font-weight: 900;

  letter-spacing: 2px;

  color: #9b7b00;
}

.hero-info h1 {
  margin: 0;

  font-size: 28px;
  font-weight: 900;
}

.hero-sub {
  margin-top: 10px;

  color: #444;

  font-size: 15px;
  font-weight: 700;

  line-height: 1.7;
}

.info-box {
  margin-top: 18px;

  background: #fff8e8;

  border:
    2px solid #1e1e1e;

  border-radius: 18px;

  padding: 16px;
}

.info-box h2 {
  margin: 0 0 12px;

  font-size: 20px;
  font-weight: 900;
}

.info-list {
  display: flex;
  flex-direction: column;

  gap: 10px;
}

.info-item {
  color: #555;

  font-size: 14px;
  font-weight: 700;

  line-height: 1.6;
}

/* =========================
   橫3按鈕
========================= */

.action-grid {
  display: grid;

  grid-template-columns:
    repeat(3, minmax(0, 1fr));

  gap: 10px;

  margin-top: 20px;
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

@media (max-width: 768px) {
  .contact-detail-page {
    max-width: 100%;
  }

  .hero-top {
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
