<template>
  <div class="page home-page">
    <section class="hero-task">
      <div class="hero-top">
        <div>
          <p class="eyebrow">TODAY</p>
          <h1 class="title">當前任務</h1>
        </div>

        <button class="btn btn-small hero-add-btn" @click="goTaskForm">
          ＋ 新增
        </button>
      </div>

      <div v-if="loading" class="card-soft state-box">
        <h2>任務載入中...</h2>
      </div>

      <div v-else-if="currentTask" class="card-soft state-box">
        <p class="badge badge-yellow">
          現在要做
          <span
            v-if="
              currentTask.source === 'template' ||
              currentTask.type === 'life_template'
            "
          >
            ・人物套版
          </span>
        </p>

        <h2 class="hero-task-title">{{ taskTitle(currentTask) }}</h2>

        <p class="hero-task-time">
          {{ taskTimeText(currentTask) }}
        </p>

        <p v-if="currentTask.note" class="hero-task-time">
          {{ currentTask.note }}
        </p>

        <button class="btn" @click="goNextTask">
          ✓ 完成，下一個任務
        </button>
      </div>

      <div v-else class="card-soft state-box">
        <div class="icon">✓</div>
        <h2 class="hero-task-title">目前沒有當前時段任務</h2>
        <p class="hero-task-time">只會顯示今天且現在時段內的任務。</p>

        <button class="btn" @click="goTaskForm">
          ＋ 新增任務
        </button>
      </div>
    </section>

    <section class="quick-section">
      <h3 class="subtitle">快速功能</h3>

      <div class="grid">
        <button class="menu-card btn-blue" @click="goTaskForm">
          <span class="icon">＋</span>
          <strong>新增任務</strong>
          <small>安排下一件事</small>
        </button>

        <button class="menu-card btn-purple" @click="goTaskHistory">
          <span class="icon">✓</span>
          <strong>任務紀錄</strong>
          <small>查看完成紀錄</small>
        </button>

        <button class="menu-card btn-yellow" @click="goExploreShops">
          <span class="icon">券</span>
          <strong>探店媒合</strong>
          <small>查看商家優惠與探店任務</small>
        </button>

        <button class="menu-card btn-green" @click="goPocketPlaces">
          <span class="icon">地</span>
          <strong>口袋名單</strong>
          <small>收藏地點導航</small>
        </button>

        <button class="menu-card btn-orange" @click="goIdleForm">
          <span class="icon">閒</span>
          <strong>我是閒置村民</strong>
          <small>發布自己為可邀約狀態</small>
        </button>

        <button class="menu-card btn-teal" @click="goIdleMarket">
          <span class="icon">約</span>
          <strong>閒置村民邀約</strong>
          <small>看看誰有空</small>
        </button>

        <button class="menu-card btn-secondary" @click="goContacts">
          <span class="icon">人</span>
          <strong>聯絡人</strong>
          <small>客戶與朋友資料</small>
        </button>

        <button class="menu-card btn-red" @click="goLifeTemplates">
          <span class="icon">版</span>
          <strong>人物套版</strong>
          <small>模仿高手生活</small>
        </button>

        <button class="menu-card btn-yellow full" @click="goRaid">
          <span class="icon">副</span>
          <strong>多人副本</strong>
          <small>一起完成任務</small>
        </button>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/firebase'

const router = useRouter()

const loading = ref(false)
const currentTask = ref(null)
const taskList = ref([])

function getUserId() {
  return (
    localStorage.getItem('lineUserId') ||
    localStorage.getItem('userId') ||
    localStorage.getItem('line_user_id') ||
    ''
  )
}

function checkLogin() {
  const userId = getUserId()

  if (!userId) {
    router.replace('/bind')
    return false
  }

  return true
}

function taskTitle(task) {
  return task?.content || task?.title || task?.name || '未命名任務'
}

function toDate(value) {
  if (!value) return null
  if (typeof value.toDate === 'function') return value.toDate()
  if (typeof value.toMillis === 'function') return new Date(value.toMillis())
  if (value instanceof Date) return value

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function safeTime(value) {
  const date = toDate(value)
  return date ? date.getTime() : 0
}

function isSameDate(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function parseTimeToMinutes(value) {
  if (!value) return null

  const text = String(value).trim()

  if (/^\d{1,2}:\d{2}$/.test(text)) {
    const [h, m] = text.split(':').map(Number)
    return h * 60 + m
  }

  if (/^\d{3,4}$/.test(text)) {
    const padded = text.padStart(4, '0')
    const h = Number(padded.slice(0, 2))
    const m = Number(padded.slice(2, 4))
    return h * 60 + m
  }

  return null
}

function getTaskStartDate(task) {
  return (
    toDate(task.startAt) ||
    toDate(task.startTimeAt) ||
    toDate(task.scheduledAt) ||
    toDate(task.date) ||
    toDate(task.taskDate) ||
    null
  )
}

function getTaskEndDate(task, startDate) {
  const endDate =
    toDate(task.endAt) ||
    toDate(task.endTimeAt) ||
    toDate(task.dueAt) ||
    null

  if (endDate) return endDate

  const duration =
    Number(task.durationMinutes) ||
    Number(task.duration) ||
    Number(task.minutes) ||
    30

  return new Date(startDate.getTime() + duration * 60 * 1000)
}

function isTaskActiveNow(task) {
  const now = new Date()
  const startDate = getTaskStartDate(task)

  if (!startDate) return false
  if (!isSameDate(startDate, now)) return false

  let start = startDate
  let end = getTaskEndDate(task, start)

  const startMinutes = parseTimeToMinutes(task.startTime)
  const endMinutes = parseTimeToMinutes(task.endTime)

  if (startMinutes !== null) {
    start = new Date(startDate)
    start.setHours(Math.floor(startMinutes / 60), startMinutes % 60, 0, 0)
  }

  if (endMinutes !== null) {
    end = new Date(startDate)
    end.setHours(Math.floor(endMinutes / 60), endMinutes % 60, 0, 0)
  }

  return now >= start && now < end
}

function taskTimeText(task) {
  const start = getTaskStartDate(task)
  if (!start) return '未設定時間'

  const end = getTaskEndDate(task, start)

  const startText = start.toLocaleTimeString('zh-TW', {
    hour: '2-digit',
    minute: '2-digit',
  })

  const endText = end.toLocaleTimeString('zh-TW', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return `${startText} - ${endText}`
}

async function loadTasks() {
  const userId = getUserId()

  if (!userId) {
    router.replace('/bind')
    return
  }

  loading.value = true

  try {
    const q = query(collection(db, 'tasks'), where('userId', '==', userId))
    const snap = await getDocs(q)

    const list = snap.docs
      .map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }))
      .filter((task) => task.status !== 'done' && task.status !== 'completed')
      .sort((a, b) => {
        const aTime = safeTime(a.startAt) || safeTime(a.createdAt)
        const bTime = safeTime(b.startAt) || safeTime(b.createdAt)
        return aTime - bTime
      })

    taskList.value = list
    currentTask.value = list.find((task) => isTaskActiveNow(task)) || null
  } catch (err) {
    console.error('讀取任務失敗:', err)
    alert('讀取任務失敗，請檢查 Firestore 權限')
  } finally {
    loading.value = false
  }
}

async function goNextTask() {
  if (!currentTask.value?.id) return

  try {
    await updateDoc(doc(db, 'tasks', currentTask.value.id), {
      status: 'done',
      isCurrent: false,
      completedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    await loadTasks()
  } catch (err) {
    console.error('完成任務失敗:', err)
    alert('完成任務失敗')
  }
}

const goTaskForm = () => router.push('/task-form')
const goTaskHistory = () => router.push('/task-history')
const goExploreShops = () => router.push('/explore-shops')
const goIdleForm = () => router.push('/idle-form')
const goIdleMarket = () => router.push('/idle-market')
const goContacts = () => router.push('/contacts')
const goLifeTemplates = () => router.push('/life-templates')
const goPocketPlaces = () => router.push('/pocket-places')
const goRaid = () => router.push('/raid')

onMounted(() => {
  if (!checkLogin()) return
  loadTasks()
})
</script>

<style scoped>
.home-page {
  max-width: 920px;
  margin: 0 auto;
}

.hero-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.eyebrow {
  margin: 0 0 4px;

  font-size: 12px;
  font-weight: 900;

  letter-spacing: 2px;

  color: #8a6d00;
}

.hero-add-btn {
  white-space: nowrap;
}

.state-box {
  margin-top: 20px;
}

.state-box h2 {
  margin: 14px 0 12px;
}

.quick-section {
  margin-top: 24px;
}

/* =========================
   改成橫3
========================= */

.grid {
  display: grid;

  grid-template-columns:
    repeat(3, minmax(0, 1fr));

  gap: 12px;
}

/* =========================
   功能卡
========================= */

.menu-card {
  width: 100%;

  min-height: 96px;

  padding: 12px 10px;

  text-align: center;

  display: flex;

  flex-direction: column;

  align-items: center;
  justify-content: center;

  gap: 6px;

  border-radius: 20px;
}

/* icon */

.menu-card .icon {
  width: 34px;
  height: 34px;

  font-size: 14px;
}

/* 標題 */

.menu-card strong {
  font-size: 14px;
  font-weight: 900;

  line-height: 1.2;
}

/* 副標 */

.menu-card small {
  color: #333;

  font-size: 11px;
  font-weight: 700;

  line-height: 1.3;
}

/* 滿版按鈕 */

.full {
  grid-column: auto;
}

/* 顏色 */

.btn-yellow {
  background: var(--primary);
}

.btn-orange {
  background: #ffd0a6;
}

.btn-teal {
  background: #b8f3e8;
}

/* =========================
   手機版
========================= */

@media (max-width: 768px) {
  .home-page {
    max-width: 100%;
  }

  .hero-top {
    align-items: flex-start;
  }

  .grid {
    grid-template-columns:
      repeat(3, minmax(0, 1fr));

    gap: 8px;
  }

  .menu-card {
    min-height: 88px;

    padding: 10px 6px;

    border-radius: 18px;
  }

  .menu-card strong {
    font-size: 12px;
  }

  .menu-card small {
    font-size: 10px;
  }

  .menu-card .icon {
    width: 30px;
    height: 30px;

    font-size: 12px;
  }
}
</style>
