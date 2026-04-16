<template>
  <div class="home-page">
    <header class="hero-card">
      <div class="hero-left">
        <p class="hello-text">嗨，{{ displayName }}</p>
        <h1>當前任務</h1>
        <p class="hero-desc">只專注下一件最重要的事</p>
      </div>

      <div class="hero-right">
        <button class="ghost-btn" @click="goBind">個人資料</button>
      </div>
    </header>

    <section class="current-task-card">
      <div class="section-head">
        <h2>現在要做的事</h2>
        <button class="small-btn" @click="loadCurrentTask" :disabled="loadingTask">
          {{ loadingTask ? '讀取中...' : '重新整理' }}
        </button>
      </div>

      <div v-if="loadingTask" class="task-box empty-box">
        載入中...
      </div>

      <div v-else-if="currentTask" class="task-box">
        <div class="task-main">
          <h3>{{ currentTask.title || '未命名任務' }}</h3>
          <p v-if="currentTask.note" class="task-note">{{ currentTask.note }}</p>
        </div>

        <div class="task-meta">
          <div class="meta-item">
            <span>開始時間</span>
            <strong>{{ formatDateTime(currentTask.startAt || currentTask.scheduledAt) }}</strong>
          </div>

          <div class="meta-item">
            <span>結束時間</span>
            <strong>{{ formatDateTime(currentTask.endAt) }}</strong>
          </div>

          <div class="meta-item">
            <span>狀態</span>
            <strong>{{ statusLabel(currentTask.status) }}</strong>
          </div>
        </div>

        <div class="task-actions">
          <button class="primary-btn" @click="goTaskNew">新增任務</button>
          <button
            class="success-btn"
            @click="completeTask(currentTask.id)"
            :disabled="finishingTask"
          >
            {{ finishingTask ? '處理中...' : '完成這個任務' }}
          </button>
        </div>
      </div>

      <div v-else class="task-box empty-box">
        <p>目前沒有任務</p>
        <button class="primary-btn" @click="goTaskNew">立即新增任務</button>
      </div>
    </section>

    <section class="menu-section">
      <div class="section-head">
        <h2>功能入口</h2>
      </div>

      <div class="menu-grid">
        <button class="menu-card" @click="goTaskNew">
          <div class="menu-title">新增任務</div>
          <div class="menu-desc">建立下一個要做的事</div>
        </button>

        <button class="menu-card" @click="goTaskHistory">
          <div class="menu-title">任務紀錄</div>
          <div class="menu-desc">查看完成與過往任務</div>
        </button>

        <button class="menu-card" @click="goIdleForm">
          <div class="menu-title">我很閒設定</div>
          <div class="menu-desc">設定你現在可被邀請</div>
        </button>

        <button class="menu-card" @click="goIdleMarket">
          <div class="menu-title">我很閒市場</div>
          <div class="menu-desc">看看現在誰有空</div>
        </button>

        <button class="menu-card" @click="goContacts">
          <div class="menu-title">聯絡人列表</div>
          <div class="menu-desc">管理客戶、朋友、合作對象</div>
        </button>

        <button class="menu-card" @click="goLifeTemplates">
          <div class="menu-title">人物套版列表</div>
          <div class="menu-desc">挑一個你想模仿的模式</div>
        </button>
      </div>
    </section>

    <p v-if="errorMessage" class="error-msg">{{ errorMessage }}</p>
    <p v-if="successMessage" class="success-msg">{{ successMessage }}</p>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc
} from 'firebase/firestore'
import { db } from '@/firebase'

const router = useRouter()

const loadingTask = ref(false)
const finishingTask = ref(false)
const currentTask = ref(null)
const errorMessage = ref('')
const successMessage = ref('')

const userId =
  localStorage.getItem('userId') ||
  localStorage.getItem('lineUserId') ||
  localStorage.getItem('line_user_id') ||
  ''

const displayName = computed(() => {
  return (
    localStorage.getItem('name') ||
    localStorage.getItem('displayName') ||
    localStorage.getItem('nickname') ||
    '使用者'
  )
})

function goBind() {
  router.push('/bind')
}

function goTaskNew() {
  router.push('/task/new')
}

function goTaskHistory() {
  router.push('/task/history')
}

function goIdleForm() {
  router.push('/idle')
}

function goIdleMarket() {
  router.push('/idle/market')
}

function goContacts() {
  router.push('/contacts')
}

function goLifeTemplates() {
  router.push('/life-templates')
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

function getTime(value) {
  if (!value) return Number.MAX_SAFE_INTEGER
  if (value?.toDate) return value.toDate().getTime()

  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? Number.MAX_SAFE_INTEGER : d.getTime()
}

function statusLabel(status) {
  if (status === 'pending') return '待處理'
  if (status === 'doing') return '進行中'
  if (status === 'done') return '已完成'
  return status || '-'
}

async function loadCurrentTask() {
  loadingTask.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    if (!userId) {
      errorMessage.value = '找不到使用者，請先重新綁定'
      currentTask.value = null
      return
    }

    const q = query(
      collection(db, 'users', userId, 'tasks'),
      orderBy('startAt', 'asc'),
      limit(20)
    )

    const snapshot = await getDocs(q)

    if (snapshot.empty) {
      currentTask.value = null
      return
    }

    const taskList = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }))

    const activeTasks = taskList
      .filter((item) => item.status === 'pending' || item.status === 'doing')
      .sort((a, b) => {
        return getTime(a.startAt || a.scheduledAt) - getTime(b.startAt || b.scheduledAt)
      })

    currentTask.value = activeTasks[0] || null
  } catch (error) {
    console.error('loadCurrentTask error:', error)
    errorMessage.value = '讀取當前任務失敗'
    currentTask.value = null
  } finally {
    loadingTask.value = false
  }
}

async function completeTask(taskId) {
  if (!taskId || !userId) return

  finishingTask.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    await updateDoc(doc(db, 'users', userId, 'tasks', taskId), {
      status: 'done',
      finishedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    successMessage.value = '任務已完成'
    await loadCurrentTask()
  } catch (error) {
    console.error('completeTask error:', error)
    errorMessage.value = '完成任務失敗'
  } finally {
    finishingTask.value = false
  }
}

onMounted(() => {
  loadCurrentTask()
})
</script>

<style scoped>
.home-page {
  max-width: 1100px;
  margin: 0 auto;
  padding: 20px;
  color: #1f2937;
}

.hero-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  background: linear-gradient(135deg, #111827, #1f2937);
  color: #fff;
  border-radius: 24px;
  padding: 24px;
  margin-bottom: 20px;
}

.hello-text {
  margin: 0 0 8px;
  font-size: 14px;
  opacity: 0.85;
}

.hero-card h1 {
  margin: 0 0 8px;
  font-size: 34px;
}

.hero-desc {
  margin: 0;
  opacity: 0.9;
}

.current-task-card,
.menu-section {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 22px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.04);
}

.section-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.section-head h2 {
  margin: 0;
  font-size: 22px;
}

.task-box {
  border-radius: 18px;
  background: #f9fafb;
  padding: 18px;
}

.empty-box {
  text-align: center;
  border: 1px dashed #d1d5db;
}

.task-main h3 {
  margin: 0 0 8px;
  font-size: 28px;
}

.task-note {
  margin: 0 0 14px;
  color: #4b5563;
  line-height: 1.7;
}

.task-meta {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.meta-item {
  background: #fff;
  border-radius: 14px;
  padding: 12px;
  border: 1px solid #e5e7eb;
}

.meta-item span {
  display: block;
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 6px;
}

.task-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.menu-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
}

.menu-card {
  text-align: left;
  border: 1px solid #e5e7eb;
  background: #fff;
  border-radius: 18px;
  padding: 18px;
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.menu-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.06);
}

.menu-title {
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 8px;
  color: #111827;
}

.menu-desc {
  color: #6b7280;
  line-height: 1.6;
  font-size: 14px;
}

.ghost-btn,
.small-btn,
.primary-btn,
.success-btn {
  border: none;
  border-radius: 12px;
  padding: 11px 14px;
  cursor: pointer;
  font-size: 14px;
}

.ghost-btn {
  background: rgba(255, 255, 255, 0.14);
  color: #fff;
}

.small-btn {
  background: #e5e7eb;
  color: #111827;
}

.primary-btn {
  background: #111827;
  color: #fff;
}

.success-btn {
  background: #16a34a;
  color: #fff;
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

@media (max-width: 900px) {
  .menu-grid {
    grid-template-columns: 1fr 1fr;
  }

  .task-meta {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .hero-card {
    flex-direction: column;
    align-items: stretch;
  }

  .menu-grid {
    grid-template-columns: 1fr;
  }

  .task-main h3 {
    font-size: 22px;
  }
}
</style>
