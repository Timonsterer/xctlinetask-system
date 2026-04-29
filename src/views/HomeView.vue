<template>
  <div class="home-page">
    <div class="card">
      <template v-if="loading">
        <h1>載入中...</h1>
        <p>正在確認 LINE 登入狀態</p>
      </template>

      <template v-else-if="error">
        <h1>發生錯誤</h1>
        <p class="error">{{ error }}</p>
        <button class="primary-btn" @click="initPage">重新載入</button>
      </template>

      <template v-else-if="!isBound">
        <h1>歡迎使用</h1>

        <div v-if="profile" class="profile-box">
          <img
            v-if="profile.pictureUrl"
            :src="profile.pictureUrl"
            alt="avatar"
            class="avatar"
          />
          <p class="line-name">LINE 名稱：{{ profile.displayName }}</p>
        </div>

        <div class="bind-box">
          <label class="label">請輸入你的暱稱</label>
          <input
            v-model.trim="nickname"
            type="text"
            class="input"
            placeholder="例如：Tim"
            maxlength="20"
          />

          <button
            class="primary-btn"
            :disabled="binding || !nickname"
            @click="bindAccount"
          >
            {{ binding ? '綁定中...' : '完成綁定' }}
          </button>
        </div>
      </template>

      <template v-else>
        <div class="current-task-hero">
          <div class="hero-top">
            <div>
              <div class="hero-label">現在任務</div>
              <h1 class="hero-title">
                {{ currentTask ? currentTask.title || '未命名任務' : '目前沒有任務' }}
              </h1>
            </div>

            <button
              class="next-task-btn"
              :disabled="switchingTask"
              @click="goNextTask"
            >
              {{
                switchingTask
                  ? '切換中...'
                  : hasNextTask
                    ? '下一個任務'
                    : '新增任務'
              }}
            </button>
          </div>

          <div v-if="currentTask" class="hero-body">
            <p v-if="currentTask.note" class="hero-note">
              {{ currentTask.note }}
            </p>

            <div class="hero-meta">
              <span v-if="currentTask.startText">開始：{{ currentTask.startText }}</span>
              <span v-if="currentTask.endText">結束：{{ currentTask.endText }}</span>
              <span v-if="currentTask.durationLabel">時長：{{ currentTask.durationLabel }}</span>
            </div>
          </div>

          <div v-else class="hero-empty">
            你目前沒有待做任務，直接新增一筆即可。
          </div>

          <div v-if="nextTask" class="next-preview">
            <div class="next-preview-label">接下來</div>
            <div class="next-preview-title">
              {{ nextTask.title || '未命名任務' }}
            </div>
            <div v-if="nextTask.startText" class="next-preview-time">
              {{ nextTask.startText }}
            </div>
          </div>
        </div>

        <div class="notify-wrap">
          <button
            class="notify-card"
            :class="{ active: idlePublishedActive }"
            @click="goIdleForm"
          >
            <div class="notify-icon-wrap">
              <span class="notify-icon">🔔</span>
              <span v-if="idlePublishedActive" class="notify-dot"></span>
            </div>

            <div class="notify-text">
              <div class="notify-title">我很閒已發布狀態</div>
              <div class="notify-desc">
                {{ idlePublishedActive ? '你目前正在我很閒市場上架中' : '目前尚未上架' }}
              </div>
            </div>
          </button>

          <button
            class="notify-card"
            :class="{ active: pendingInviteCount > 0 }"
            @click="goIdleMarket"
          >
            <div class="notify-icon-wrap">
              <span class="notify-icon">🔔</span>
              <span v-if="pendingInviteCount > 0" class="notify-dot"></span>
            </div>

            <div class="notify-text">
              <div class="notify-title">我很閒受邀狀態</div>
              <div class="notify-desc">
                {{
                  pendingInviteCount > 0
                    ? `你有 ${pendingInviteCount} 筆待處理邀請`
                    : '目前沒有新的邀請'
                }}
              </div>
            </div>

            <span v-if="pendingInviteCount > 0" class="notify-count">
              {{ pendingInviteCount }}
            </span>
          </button>
        </div>

        <div class="profile-box compact">
          <img
            v-if="userData.pictureUrl"
            :src="userData.pictureUrl"
            alt="avatar"
            class="avatar small"
          />
          <div class="profile-text">
            <p><strong>暱稱：</strong>{{ userData.nickname || userData.displayName }}</p>
            <p><strong>LINE 名稱：</strong>{{ userData.displayName }}</p>
          </div>
        </div>

        <div class="action-list">
          <button class="primary-btn" @click="goTaskForm">新增任務</button>
          <button class="secondary-btn" @click="goTaskHistory">任務紀錄</button>
          <button class="secondary-btn" @click="goIdleForm">我很閒</button>
          <button class="secondary-btn" @click="goIdleMarket">閒置列表</button>
          <button class="home-btn" @click="router.push('/raid')">👥 多人副本</button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db } from '@/firebase'
import { initLiff, getLiffProfile, loginLiff, isLiffLoggedIn } from '@/liff'

const router = useRouter()

const loading = ref(true)
const binding = ref(false)
const switchingTask = ref(false)
const error = ref('')

const profile = ref(null)
const isBound = ref(false)
const nickname = ref('')
const userData = ref(null)

const currentTask = ref(null)
const nextTask = ref(null)
const pendingTasks = ref([])

const idlePublishedActive = ref(false)
const pendingInviteCount = ref(0)

function getUserId() {
  return (
    localStorage.getItem('userId') ||
    localStorage.getItem('lineUserId') ||
    localStorage.getItem('line_user_id') ||
    ''
  )
}

function formatDateTime(value) {
  if (!value) return ''

  let date = null

  if (typeof value?.toDate === 'function') {
    date = value.toDate()
  } else if (value instanceof Date) {
    date = value
  } else {
    date = new Date(value)
  }

  if (!date || Number.isNaN(date.getTime())) return ''

  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const mi = String(date.getMinutes()).padStart(2, '0')

  return `${yyyy}/${mm}/${dd} ${hh}:${mi}`
}

function getDurationLabel(task) {
  if (task.durationText) return task.durationText
  if (task.rawDurationInput) return task.rawDurationInput

  const mins = Number(task.durationMinutes || 0)
  if (!mins) return ''

  const hh = String(Math.floor(mins / 60)).padStart(2, '0')
  const mm = String(mins % 60).padStart(2, '0')
  return `${hh}${mm}`
}

function getComparableTime(task) {
  const source =
    task.startAt ||
    task.dueAt ||
    task.createdAt ||
    task.updatedAt ||
    null

  if (!source) return Number.MAX_SAFE_INTEGER

  if (typeof source?.toDate === 'function') {
    return source.toDate().getTime()
  }

  const date = new Date(source)
  if (Number.isNaN(date.getTime())) return Number.MAX_SAFE_INTEGER

  return date.getTime()
}

function normalizeTask(id, data) {
  return {
    id,
    title: data.title || '',
    note: data.note || '',
    status: data.status || 'pending',
    isCurrent: !!data.isCurrent,
    userId: data.userId || data.ownerId || '',
    startAt: data.startAt || null,
    endAt: data.endAt || null,
    dueAt: data.dueAt || null,
    createdAt: data.createdAt || null,
    updatedAt: data.updatedAt || null,
    completedAt: data.completedAt || null,
    durationText: data.durationText || '',
    rawDurationInput: data.rawDurationInput || '',
    durationMinutes: data.durationMinutes || 0,
    startText: formatDateTime(data.startAt || data.dueAt),
    endText: formatDateTime(data.endAt),
    durationLabel: getDurationLabel(data),
  }
}

const hasNextTask = computed(() => !!nextTask.value)

async function loadTasks() {
  const userId = getUserId()

  currentTask.value = null
  nextTask.value = null
  pendingTasks.value = []

  if (!userId) return

  try {
    const q1 = query(
      collection(db, 'tasks'),
      where('userId', '==', userId),
      where('status', '==', 'pending')
    )

    const q2 = query(
      collection(db, 'tasks'),
      where('ownerId', '==', userId),
      where('status', '==', 'pending')
    )

    const [snap1, snap2] = await Promise.all([
      getDocs(q1).catch(() => null),
      getDocs(q2).catch(() => null),
    ])

    const map = new Map()

    if (snap1) {
      snap1.docs.forEach((item) => {
        map.set(item.id, normalizeTask(item.id, item.data()))
      })
    }

    if (snap2) {
      snap2.docs.forEach((item) => {
        map.set(item.id, normalizeTask(item.id, item.data()))
      })
    }

    const list = [...map.values()].sort((a, b) => {
      if (a.isCurrent && !b.isCurrent) return -1
      if (!a.isCurrent && b.isCurrent) return 1
      return getComparableTime(a) - getComparableTime(b)
    })

    pendingTasks.value = list

    const pinned = list.find((item) => item.isCurrent)
    if (pinned) {
      currentTask.value = pinned
      nextTask.value = list.find((item) => item.id !== pinned.id) || null
      return
    }

    if (list.length > 0) {
      currentTask.value = list[0]
      nextTask.value = list[1] || null

      await updateDoc(doc(db, 'tasks', list[0].id), {
        isCurrent: true,
        updatedAt: serverTimestamp(),
      })

      currentTask.value.isCurrent = true
      return
    }

    currentTask.value = null
    nextTask.value = null
  } catch (err) {
    console.error('loadTasks error:', err)
    error.value = err?.message || '讀取任務失敗'
  }
}

async function loadIdleNotifications() {
  const userId = getUserId()

  idlePublishedActive.value = false
  pendingInviteCount.value = 0

  if (!userId) return

  try {
    const idleUserSnap = await getDoc(doc(db, 'idle_users', userId)).catch(() => null)

    if (idleUserSnap?.exists()) {
      const data = idleUserSnap.data()
      if (data?.isActive === true) {
        idlePublishedActive.value = true
      }
    }

    if (!idlePublishedActive.value) {
      const postQ1 = query(
        collection(db, 'idle_posts'),
        where('ownerId', '==', userId),
        where('isActive', '==', true)
      )

      const postQ2 = query(
        collection(db, 'idle_posts'),
        where('userId', '==', userId),
        where('isActive', '==', true)
      )

      const [postSnap1, postSnap2] = await Promise.all([
        getDocs(postQ1).catch(() => null),
        getDocs(postQ2).catch(() => null),
      ])

      if ((postSnap1 && !postSnap1.empty) || (postSnap2 && !postSnap2.empty)) {
        idlePublishedActive.value = true
      }
    }

    const inviteQ = query(
      collection(db, 'idle_invites'),
      where('toUserId', '==', userId),
      where('status', '==', 'pending')
    )

    const inviteSnap = await getDocs(inviteQ).catch(() => null)
    pendingInviteCount.value = inviteSnap?.size || 0
  } catch (err) {
    console.error('loadIdleNotifications error:', err)
  }
}

async function initPage() {
  loading.value = true
  error.value = ''

  try {
    await initLiff()

    if (!isLiffLoggedIn()) {
      loginLiff()
      return
    }

    const lineProfile = await getLiffProfile()

    if (!lineProfile) {
      throw new Error('LINE 使用者資料取得失敗')
    }

    profile.value = lineProfile

    const userId = lineProfile.userId || lineProfile.lineUserId

    if (!userId) {
      throw new Error('抓不到 LINE userId')
    }

    localStorage.setItem('userId', userId)
    localStorage.setItem('lineUserId', userId)
    localStorage.setItem('line_user_id', userId)

    if (lineProfile.displayName) {
      localStorage.setItem('displayName', lineProfile.displayName)
      localStorage.setItem('userName', lineProfile.displayName)
    }

    if (lineProfile.pictureUrl) {
      localStorage.setItem('pictureUrl', lineProfile.pictureUrl)
    }

    const userRef = doc(db, 'users', userId)
    const userSnap = await getDoc(userRef)

    if (userSnap.exists()) {
      isBound.value = true
      userData.value = userSnap.data()
      await Promise.all([loadTasks(), loadIdleNotifications()])
    } else {
      isBound.value = false
      nickname.value = lineProfile.displayName || ''
    }
  } catch (err) {
    console.error('Home init error:', err)
    error.value = err?.message || '初始化失敗，請稍後再試'
  } finally {
    loading.value = false
  }
}

async function bindAccount() {
  const userId = profile.value?.userId || profile.value?.lineUserId

  if (!userId) {
    error.value = '找不到 LINE 使用者資料'
    return
  }

  localStorage.setItem('userId', userId)
  localStorage.setItem('lineUserId', userId)
  localStorage.setItem('line_user_id', userId)

  if (!nickname.value) {
    error.value = '請先輸入暱稱'
    return
  }

  binding.value = true
  error.value = ''

  try {
    const userRef = doc(db, 'users', userId)

    const payload = {
      userId,
      lineUserId: userId,
      displayName: profile.value.displayName || '',
      pictureUrl: profile.value.pictureUrl || '',
      nickname: nickname.value,
      statusMessage: profile.value.statusMessage || '',
      updatedAt: serverTimestamp(),
    }

    const userSnap = await getDoc(userRef)

    if (!userSnap.exists()) {
      payload.createdAt = serverTimestamp()
    }

    await setDoc(userRef, payload, { merge: true })

    const latestSnap = await getDoc(userRef)

    isBound.value = true
    userData.value = latestSnap.data()

    await Promise.all([loadTasks(), loadIdleNotifications()])
  } catch (err) {
    console.error('Bind account error:', err)
    error.value = err?.message || '綁定失敗，請稍後再試'
  } finally {
    binding.value = false
  }
}

async function goNextTask() {
  if (switchingTask.value) return

  if (!currentTask.value && !nextTask.value) {
    router.push({ name: 'task-form' })
    return
  }

  if (!nextTask.value) {
    router.push({ name: 'task-form' })
    return
  }

  switchingTask.value = true
  error.value = ''

  try {
    const userId = getUserId()

    if (currentTask.value?.id) {
      await updateDoc(doc(db, 'tasks', currentTask.value.id), {
        status: 'done',
        isCurrent: false,
        completedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })

      await addDoc(collection(db, 'task_history'), {
        userId,
        ownerId: userId,
        taskId: currentTask.value.id,
        title: currentTask.value.title || '',
        note: currentTask.value.note || '',
        type: 'key',
        startAt: currentTask.value.startAt || null,
        endAt: currentTask.value.endAt || null,
        dueAt: currentTask.value.dueAt || currentTask.value.startAt || null,
        durationText: currentTask.value.durationText || '',
        durationMinutes: currentTask.value.durationMinutes || 0,
        rawDurationInput: currentTask.value.rawDurationInput || '',
        completedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      })
    }

    await updateDoc(doc(db, 'tasks', nextTask.value.id), {
      isCurrent: true,
      updatedAt: serverTimestamp(),
    })

    await Promise.all([loadTasks(), loadIdleNotifications()])
  } catch (err) {
    console.error('goNextTask error:', err)
    error.value = err?.message || '切換下一個任務失敗'
  } finally {
    switchingTask.value = false
  }
}

function goTaskForm() {
  router.push({ name: 'task-form' })
}

function goTaskHistory() {
  router.push({ name: 'task-history' })
}

function goIdleForm() {
  router.push({ name: 'idle-form' })
}

function goIdleMarket() {
  router.push({ name: 'idle-market' })
}

initPage()
</script>

<style scoped>
.home-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #f5f7fb 0%, #eef4ff 100%);
  display: flex;
  justify-content: center;
  padding: 20px;
  box-sizing: border-box;
}

.card {
  width: 100%;
  max-width: 760px;
  background: #ffffff;
  border-radius: 24px;
  box-shadow: 0 12px 40px rgba(15, 23, 42, 0.08);
  padding: 24px;
  box-sizing: border-box;
}

h1 {
  margin: 0 0 12px;
  color: #111827;
}

.error {
  color: #dc2626;
  margin-bottom: 16px;
}

.profile-box {
  margin: 20px 0;
  padding: 16px;
  border-radius: 18px;
  background: #f8fafc;
  display: flex;
  align-items: center;
  gap: 14px;
}

.profile-box.compact {
  margin-top: 18px;
  margin-bottom: 18px;
}

.profile-text p,
.line-name {
  margin: 4px 0;
  color: #334155;
}

.avatar {
  width: 68px;
  height: 68px;
  border-radius: 999px;
  object-fit: cover;
  background: #e5e7eb;
}

.avatar.small {
  width: 52px;
  height: 52px;
}

.bind-box {
  margin-top: 20px;
  display: grid;
  gap: 12px;
}

.label {
  font-weight: 600;
  color: #334155;
}

.input {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid #cbd5e1;
  border-radius: 14px;
  font-size: 16px;
  box-sizing: border-box;
}

.current-task-hero {
  background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 60%, #3b82f6 100%);
  color: #ffffff;
  border-radius: 24px;
  padding: 22px;
  margin-bottom: 18px;
}

.hero-top {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}

.hero-label {
  font-size: 13px;
  opacity: 0.88;
  margin-bottom: 8px;
}

.hero-title {
  font-size: 28px;
  line-height: 1.25;
  margin: 0;
  color: #ffffff;
}

.hero-body {
  margin-top: 16px;
}

.hero-note {
  margin: 0 0 12px;
  line-height: 1.7;
  color: rgba(255, 255, 255, 0.92);
}

.hero-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.92);
}

.hero-empty {
  margin-top: 14px;
  color: rgba(255, 255, 255, 0.92);
}

.next-preview {
  margin-top: 18px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.22);
}

.next-preview-label {
  font-size: 12px;
  opacity: 0.84;
  margin-bottom: 6px;
}

.next-preview-title {
  font-weight: 700;
  font-size: 17px;
}

.next-preview-time {
  margin-top: 4px;
  font-size: 13px;
  opacity: 0.88;
}

.next-task-btn,
.primary-btn,
.secondary-btn {
  border: none;
  border-radius: 14px;
  padding: 12px 18px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: 0.2s ease;
}

.next-task-btn {
  background: rgba(255, 255, 255, 0.18);
  color: #ffffff;
  backdrop-filter: blur(6px);
}

.next-task-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.28);
}

.next-task-btn:disabled,
.primary-btn:disabled,
.secondary-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.notify-wrap {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 18px;
}

.notify-card {
  width: 100%;
  border: 1px solid #e5e7eb;
  background: #ffffff;
  border-radius: 18px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  text-align: left;
  position: relative;
  transition: 0.2s ease;
}

.notify-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06);
}

.notify-card.active {
  border-color: #f59e0b;
  background: #fffbeb;
}

.notify-icon-wrap {
  position: relative;
  width: 42px;
  height: 42px;
  border-radius: 999px;
  background: #f3f4f6;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.notify-icon {
  font-size: 20px;
}

.notify-dot {
  position: absolute;
  right: 0;
  top: 0;
  width: 11px;
  height: 11px;
  border-radius: 999px;
  background: #ef4444;
  border: 2px solid #ffffff;
}

.notify-text {
  min-width: 0;
}

.notify-title {
  font-size: 15px;
  font-weight: 800;
  color: #111827;
  margin-bottom: 4px;
}

.notify-desc {
  font-size: 13px;
  color: #6b7280;
  line-height: 1.5;
}

.notify-count {
  margin-left: auto;
  min-width: 26px;
  height: 26px;
  padding: 0 8px;
  border-radius: 999px;
  background: #ef4444;
  color: #ffffff;
  font-size: 13px;
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.action-list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.primary-btn {
  background: #2563eb;
  color: #ffffff;
}

.primary-btn:hover:not(:disabled) {
  background: #1d4ed8;
}

.secondary-btn {
  background: #e2e8f0;
  color: #0f172a;
}

.secondary-btn:hover:not(:disabled) {
  background: #cbd5e1;
}

@media (max-width: 640px) {
  .home-page {
    padding: 14px;
  }

  .card {
    padding: 18px;
    border-radius: 20px;
  }

  .hero-top {
    flex-direction: column;
  }

  .hero-title {
    font-size: 24px;
  }

  .notify-wrap {
    grid-template-columns: 1fr;
  }

  .action-list {
    grid-template-columns: 1fr;
  }
}
</style>
