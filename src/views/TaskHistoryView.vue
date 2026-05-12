<template>
  <div class="page task-history-page">
    <header class="card page-header">
      <div>
        <p class="eyebrow">WEEK TASKS</p>
        <h1 class="title">任務紀錄</h1>
        <p class="sub">以週為單位查看任務，也可以直接預排新任務。</p>
      </div>

      <div class="header-actions">
        <button class="btn btn-small btn-secondary" type="button" @click="goHome">
          首頁
        </button>

        <button class="btn btn-small" type="button" @click="goCreateTask">
          ＋ 新增任務
        </button>
      </div>
    </header>

    <section class="card-soft week-toolbar">
      <button class="btn btn-small btn-secondary" type="button" @click="changeWeek(-1)">
        ← 上週
      </button>

      <div class="week-title">
        <strong>{{ weekRangeText }}</strong>
        <small>早 / 中 / 晚 / 半夜 四時段</small>
      </div>

      <button class="btn btn-small btn-secondary" type="button" @click="changeWeek(1)">
        下週 →
      </button>
    </section>

    <section class="stats-grid">
      <div class="card stat-card">
        <span>本週全部</span>
        <strong>{{ weekTasks.length }}</strong>
      </div>

      <div class="card stat-card">
        <span>未完成</span>
        <strong>{{ pendingCount }}</strong>
      </div>

      <div class="card stat-card">
        <span>已完成</span>
        <strong>{{ doneCount }}</strong>
      </div>
    </section>

    <section class="card toolbar">
      <div class="filter-group">
        <button
          class="chip"
          :class="{ active: filterStatus === 'all' }"
          type="button"
          @click="filterStatus = 'all'"
        >
          全部
        </button>

        <button
          class="chip"
          :class="{ active: filterStatus === 'pending' }"
          type="button"
          @click="filterStatus = 'pending'"
        >
          未完成
        </button>

        <button
          class="chip"
          :class="{ active: filterStatus === 'done' }"
          type="button"
          @click="filterStatus = 'done'"
        >
          已完成
        </button>
      </div>

      <input
        v-model.trim="keyword"
        class="search-input"
        type="text"
        placeholder="搜尋任務名稱或備註"
      />
    </section>

    <div v-if="error" class="alert alert-error">{{ error }}</div>
    <div v-if="success" class="alert alert-success">{{ success }}</div>

    <section class="card week-board">
      <div class="board-header">
        <h2>本週排程表</h2>

        <button class="btn btn-small btn-blue" type="button" @click="goCreateTask">
          預排任務
        </button>
      </div>

      <div v-if="loading" class="empty">載入中...</div>

      <div v-else class="week-grid">
        <div
          v-for="day in weekDays"
          :key="day.key"
          class="day-card"
        >
          <div class="day-head">
            <strong>{{ day.weekday }}</strong>
            <span>{{ day.dateText }}</span>
          </div>

          <div
            v-for="period in periods"
            :key="period.key"
            class="period-box"
          >
            <div class="period-title">
              <span>{{ period.icon }} {{ period.label }}</span>
              <small>{{ period.time }}</small>
            </div>

            <div
              v-if="tasksByDayPeriod[day.key]?.[period.key]?.length"
              class="period-list"
            >
              <div
                v-for="task in tasksByDayPeriod[day.key][period.key]"
                :key="task.key"
                class="mini-task"
                :class="{ done: task.status === 'done' }"
              >
                <div>
                  <strong>{{ task.title || '未命名任務' }}</strong>
                  <small>{{ task.shortTime || '未設定時間' }}</small>
                </div>

                <button
                  v-if="task.status !== 'done' && task.source === 'tasks'"
                  class="mini-done"
                  type="button"
                  @click="completeTask(task)"
                >
                  ✓
                </button>
              </div>
            </div>

            <button
              v-else
              class="empty-period"
              type="button"
              @click="goCreateTask(day.dateInput, period.defaultTime)"
            >
              ＋ 預排
            </button>
          </div>
        </div>
      </div>
    </section>

    <section class="card">
      <div class="board-header">
        <h2>任務列表</h2>
        <small>{{ filteredTasks.length }} 筆</small>
      </div>

      <div v-if="loading" class="empty">載入中...</div>

      <div v-else-if="filteredTasks.length === 0" class="empty">
        目前沒有符合條件的任務
      </div>

      <div v-else class="task-list">
        <div
          v-for="task in filteredTasks"
          :key="task.key"
          class="list-item task-item"
        >
          <div class="task-main">
            <div class="task-top">
              <h3>{{ task.title || '未命名任務' }}</h3>

              <span
                class="badge"
                :class="task.status === 'done' ? 'badge-green' : 'badge-yellow'"
              >
                {{ task.status === 'done' ? '已完成' : '未完成' }}
              </span>
            </div>

            <div class="task-meta">
              <span v-if="task.type === 'life_template'">人物套版</span>
              <span v-if="task.startText">開始：{{ task.startText }}</span>
              <span v-if="task.endText">結束：{{ task.endText }}</span>
              <span v-if="task.completedText">完成：{{ task.completedText }}</span>
              <span v-if="task.durationLabel">時長：{{ task.durationLabel }}</span>
            </div>

            <p v-if="task.note" class="task-note">
              {{ task.note }}
            </p>
          </div>

          <div class="action-grid">
            <button
              v-if="task.status !== 'done' && task.source === 'tasks'"
              class="btn btn-blue action-btn"
              type="button"
              @click="editTask(task.id)"
            >
              編輯
            </button>

            <button
              v-if="task.status !== 'done' && task.source === 'tasks'"
              class="btn btn-green action-btn"
              type="button"
              :disabled="actingId === task.id"
              @click="completeTask(task)"
            >
              完成
            </button>

            <button
              class="btn btn-purple action-btn"
              type="button"
              @click="copyTask(task)"
            >
              複製
            </button>

            <button
              v-if="task.source === 'tasks'"
              class="btn btn-red action-btn"
              type="button"
              :disabled="actingId === task.id"
              @click="deleteTask(task)"
            >
              刪除
            </button>

            <button
              v-if="task.source === 'task_history'"
              class="btn btn-red action-btn"
              type="button"
              :disabled="actingId === task.id"
              @click="deleteHistory(task)"
            >
              刪紀錄
            </button>

            <button
              class="btn btn-secondary action-btn"
              type="button"
              @click="goCreateTask"
            >
              新增
            </button>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { db } from '@/firebase'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore'

const router = useRouter()

const loading = ref(true)
const error = ref('')
const success = ref('')
const actingId = ref('')
const keyword = ref('')
const filterStatus = ref('all')
const tasks = ref([])
const weekBase = ref(getStartOfWeek(new Date()))

const periods = [
  {
    key: 'morning',
    label: '早上',
    time: '06:00 - 11:59',
    icon: '☀',
    start: 6,
    end: 12,
    defaultTime: '09:00',
  },
  {
    key: 'afternoon',
    label: '中午',
    time: '12:00 - 17:59',
    icon: '🍱',
    start: 12,
    end: 18,
    defaultTime: '13:00',
  },
  {
    key: 'evening',
    label: '晚上',
    time: '18:00 - 23:59',
    icon: '🌙',
    start: 18,
    end: 24,
    defaultTime: '19:00',
  },
  {
    key: 'midnight',
    label: '半夜',
    time: '00:00 - 05:59',
    icon: '⭐',
    start: 0,
    end: 6,
    defaultTime: '01:00',
  },
]

function getUserId() {
  return (
    localStorage.getItem('lineUserId') ||
    localStorage.getItem('userId') ||
    localStorage.getItem('line_user_id') ||
    ''
  )
}

function resetMessage() {
  error.value = ''
  success.value = ''
}

function getStartOfWeek(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(date, days) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function toDateInput(date) {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function formatMonthDay(date) {
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${mm}/${dd}`
}

function getTaskDate(task) {
  const value =
    task.startAt ||
    task.dueAt ||
    task.completedAt ||
    task.createdAt ||
    null

  if (!value) return null
  if (typeof value?.toDate === 'function') return value.toDate()
  if (value instanceof Date) return value

  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

function formatDateTime(value) {
  const date = value?.toDate?.() || (value instanceof Date ? value : new Date(value))
  if (!date || Number.isNaN(date.getTime())) return ''

  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const mi = String(date.getMinutes()).padStart(2, '0')

  return `${yyyy}/${mm}/${dd} ${hh}:${mi}`
}

function formatShortTime(value) {
  const date = getDateFromValue(value)
  if (!date) return ''

  const hh = String(date.getHours()).padStart(2, '0')
  const mi = String(date.getMinutes()).padStart(2, '0')
  return `${hh}:${mi}`
}

function getDateFromValue(value) {
  if (!value) return null
  if (typeof value?.toDate === 'function') return value.toDate()
  if (value instanceof Date) return value

  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

function getTimeValue(value) {
  const date = getDateFromValue(value)
  return date ? date.getTime() : 0
}

function getDurationLabel(task) {
  if (task.durationText) return task.durationText
  if (task.rawDurationInput) return task.rawDurationInput

  const mins = Number(task.durationMinutes || 0)
  if (!mins) return ''

  const hh = String(Math.floor(mins / 60)).padStart(2, '0')
  const mm = String(mins % 60).padStart(2, '0')
  return `${hh}:${mm}`
}

function getPeriodKey(date) {
  if (!date) return 'morning'
  const hour = date.getHours()

  const period = periods.find((item) => hour >= item.start && hour < item.end)
  return period?.key || 'morning'
}

function normalizeTask(id, data, source = 'tasks') {
  const status =
    data.status === 'completed' || data.status === 'done'
      ? 'done'
      : 'pending'

  const mainDate =
    data.startAt ||
    data.dueAt ||
    data.completedAt ||
    data.createdAt ||
    null

  return {
    id,
    key: `${source}-${id}`,
    source,
    status,

    userId: data.userId || '',
    ownerId: data.ownerId || '',
    taskId: data.taskId || '',

    title: data.title || data.content || data.name || '',
    note: data.note || data.description || '',
    type: data.type || data.source || 'manual',

    startAt: data.startAt || null,
    endAt: data.endAt || null,
    dueAt: data.dueAt || null,
    completedAt: data.completedAt || null,
    createdAt: data.createdAt || null,
    updatedAt: data.updatedAt || null,

    startText: formatDateTime(data.startAt),
    endText: formatDateTime(data.endAt),
    dueText: formatDateTime(data.dueAt),
    completedText: formatDateTime(data.completedAt),

    shortTime: formatShortTime(mainDate),

    durationText: data.durationText || '',
    rawDurationInput: data.rawDurationInput || '',
    durationMinutes: data.durationMinutes || 0,
    durationLabel: getDurationLabel(data),
  }
}

const weekDays = computed(() => {
  const names = ['週一', '週二', '週三', '週四', '週五', '週六', '週日']

  return Array.from({ length: 7 }).map((_, index) => {
    const date = addDays(weekBase.value, index)

    return {
      key: toDateInput(date),
      date,
      dateInput: toDateInput(date),
      dateText: formatMonthDay(date),
      weekday: names[index],
    }
  })
})

const weekRangeText = computed(() => {
  const start = weekBase.value
  const end = addDays(start, 6)

  return `${formatMonthDay(start)} - ${formatMonthDay(end)}`
})

const weekTasks = computed(() => {
  const start = weekBase.value.getTime()
  const end = addDays(weekBase.value, 7).getTime()

  return tasks.value.filter((task) => {
    const date = getTaskDate(task)
    if (!date) return false

    const time = date.getTime()
    return time >= start && time < end
  })
})

const filteredTasks = computed(() => {
  return weekTasks.value.filter((task) => {
    const matchStatus =
      filterStatus.value === 'all' || task.status === filterStatus.value

    const text = `${task.title || ''} ${task.note || ''}`.toLowerCase()
    const matchKeyword =
      !keyword.value || text.includes(keyword.value.toLowerCase())

    return matchStatus && matchKeyword
  })
})

const pendingCount = computed(() => {
  return weekTasks.value.filter((task) => task.status !== 'done').length
})

const doneCount = computed(() => {
  return weekTasks.value.filter((task) => task.status === 'done').length
})

const tasksByDayPeriod = computed(() => {
  const result = {}

  weekDays.value.forEach((day) => {
    result[day.key] = {}

    periods.forEach((period) => {
      result[day.key][period.key] = []
    })
  })

  filteredTasks.value.forEach((task) => {
    const date = getTaskDate(task)
    if (!date) return

    const dayKey = toDateInput(date)
    const periodKey = getPeriodKey(date)

    if (!result[dayKey]) return

    result[dayKey][periodKey].push(task)
  })

  Object.keys(result).forEach((dayKey) => {
    Object.keys(result[dayKey]).forEach((periodKey) => {
      result[dayKey][periodKey].sort((a, b) => {
        return getTimeValue(a.startAt || a.dueAt || a.createdAt) -
          getTimeValue(b.startAt || b.dueAt || b.createdAt)
      })
    })
  })

  return result
})

async function runSafeQuery(builder) {
  try {
    const q = builder()
    const snap = await getDocs(q)
    return snap.docs
  } catch (err) {
    console.warn('query failed:', err)
    return []
  }
}

async function loadTasks() {
  loading.value = true
  resetMessage()

  try {
    const userId = getUserId()

    if (!userId) {
      router.push('/bind')
      return
    }

    const taskDocs = new Map()
    const historyDocs = new Map()

    ;(
      await runSafeQuery(() =>
        query(collection(db, 'tasks'), where('userId', '==', userId))
      )
    ).forEach((item) => taskDocs.set(item.id, item))

    ;(
      await runSafeQuery(() =>
        query(collection(db, 'tasks'), where('ownerId', '==', userId))
      )
    ).forEach((item) => taskDocs.set(item.id, item))

    ;(
      await runSafeQuery(() =>
        query(collection(db, 'task_history'), where('userId', '==', userId))
      )
    ).forEach((item) => historyDocs.set(item.id, item))

    ;(
      await runSafeQuery(() =>
        query(collection(db, 'task_history'), where('ownerId', '==', userId))
      )
    ).forEach((item) => historyDocs.set(item.id, item))

    const normalizedTasks = [...taskDocs.values()].map((item) =>
      normalizeTask(item.id, item.data(), 'tasks')
    )

    const normalizedHistory = [...historyDocs.values()].map((item) =>
      normalizeTask(item.id, item.data(), 'task_history')
    )

    const completedTaskIdsInHistory = new Set(
      normalizedHistory.map((item) => item.taskId).filter(Boolean)
    )

    const pendingFromTasks = normalizedTasks.filter((item) => item.status !== 'done')
    const doneFromTasksOnly = normalizedTasks.filter(
      (item) => item.status === 'done' && !completedTaskIdsInHistory.has(item.id)
    )

    const merged = [
      ...pendingFromTasks,
      ...normalizedHistory,
      ...doneFromTasksOnly,
    ]

    merged.sort((a, b) => {
      const aTime =
        getTimeValue(a.startAt) ||
        getTimeValue(a.dueAt) ||
        getTimeValue(a.completedAt) ||
        getTimeValue(a.createdAt)

      const bTime =
        getTimeValue(b.startAt) ||
        getTimeValue(b.dueAt) ||
        getTimeValue(b.completedAt) ||
        getTimeValue(b.createdAt)

      return bTime - aTime
    })

    tasks.value = merged
  } catch (err) {
    console.error(err)
    error.value = '讀取任務紀錄失敗'
  } finally {
    loading.value = false
  }
}

async function completeTask(task) {
  resetMessage()
  actingId.value = task.id

  try {
    await updateDoc(doc(db, 'tasks', task.id), {
      status: 'done',
      isCurrent: false,
      completedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    await addDoc(collection(db, 'task_history'), {
      userId: getUserId(),
      ownerId: getUserId(),
      taskId: task.id,
      title: task.title || '',
      note: task.note || '',
      type: task.type || 'manual',
      startAt: task.startAt || null,
      endAt: task.endAt || null,
      dueAt: task.dueAt || task.startAt || null,
      durationText: task.durationText || '',
      rawDurationInput: task.rawDurationInput || '',
      durationMinutes: task.durationMinutes || 0,
      completedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    })

    success.value = '任務已完成'
    await loadTasks()
  } catch (err) {
    console.error(err)
    error.value = '完成任務失敗'
  } finally {
    actingId.value = ''
  }
}

async function copyTask(task) {
  resetMessage()

  try {
    await addDoc(collection(db, 'tasks'), {
      userId: getUserId(),
      ownerId: getUserId(),
      title: `${task.title || '未命名任務'} 複製`,
      note: task.note || '',
      type: task.type || 'manual',
      status: 'pending',
      startAt: null,
      endAt: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    success.value = '已複製成新的待排任務'
    await loadTasks()
  } catch (err) {
    console.error(err)
    error.value = '複製任務失敗'
  }
}

async function deleteTask(task) {
  resetMessage()
  actingId.value = task.id

  try {
    await deleteDoc(doc(db, 'tasks', task.id))
    success.value = '任務已刪除'
    await loadTasks()
  } catch (err) {
    console.error(err)
    error.value = '刪除任務失敗'
  } finally {
    actingId.value = ''
  }
}

async function deleteHistory(task) {
  resetMessage()
  actingId.value = task.id

  try {
    await deleteDoc(doc(db, 'task_history', task.id))
    success.value = '任務紀錄已刪除'
    await loadTasks()
  } catch (err) {
    console.error(err)
    error.value = '刪除任務紀錄失敗'
  } finally {
    actingId.value = ''
  }
}

function changeWeek(step) {
  weekBase.value = addDays(weekBase.value, step * 7)
}

function goCreateTask(date = '', time = '') {
  const query = {}

  if (date) query.date = date
  if (time) query.time = time

  router.push({
    path: '/task-form',
    query,
  })
}

function editTask(id) {
  router.push(`/task-form?id=${id}`)
}

function goHome() {
  router.push('/home')
}

onMounted(() => {
  loadTasks()
})
</script>

<style scoped>
.task-history-page {
  max-width: 1180px;
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

.header-actions {
  display: flex;
  gap: 10px;
  flex-shrink: 0;
}

.week-toolbar {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 12px;
}

.week-title {
  text-align: center;
}

.week-title strong {
  display: block;
  font-size: 20px;
  font-weight: 900;
}

.week-title small {
  color: #666;
  font-size: 13px;
  font-weight: 800;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
}

.stat-card {
  margin-bottom: 0;
}

.stat-card span {
  display: block;
  color: #666;
  font-size: 13px;
  font-weight: 800;
}

.stat-card strong {
  display: block;
  margin-top: 6px;
  font-size: 30px;
  font-weight: 900;
}

.toolbar {
  display: grid;
  grid-template-columns: 1fr 280px;
  align-items: center;
  gap: 14px;
}

.filter-group {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.chip {
  width: auto;
  min-width: 84px;
  background: #ffffff;
  border-radius: 999px;
  padding: 10px 14px;
  font-size: 14px;
}

.chip.active {
  background: var(--primary);
}

.search-input {
  margin: 0;
}

.alert {
  margin-bottom: 14px;
  padding: 12px 14px;
  border: 2px solid #1e1e1e;
  border-radius: 16px;
  font-size: 14px;
  font-weight: 800;
}

.alert-error {
  background: #ffdcdc;
  color: #9f1239;
}

.alert-success {
  background: #dff8df;
  color: #166534;
}

.board-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}

.board-header h2 {
  margin: 0;
  font-size: 22px;
  font-weight: 900;
}

.board-header small {
  color: #666;
  font-size: 14px;
  font-weight: 800;
}

.week-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(140px, 1fr));
  gap: 12px;
  overflow-x: auto;
  padding-bottom: 8px;
}

.day-card {
  min-width: 140px;
  background: #fff8e8;
  border: 2px solid #1e1e1e;
  border-radius: 18px;
  padding: 12px;
}

.day-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.day-head strong {
  font-size: 16px;
  font-weight: 900;
}

.day-head span {
  color: #666;
  font-size: 13px;
  font-weight: 800;
}

.period-box {
  background: #ffffff;
  border: 2px solid #1e1e1e;
  border-radius: 16px;
  padding: 10px;
  margin-bottom: 10px;
}

.period-title {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-bottom: 8px;
}

.period-title span {
  font-size: 14px;
  font-weight: 900;
}

.period-title small {
  color: #666;
  font-size: 11px;
  font-weight: 800;
}

.period-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mini-task {
  display: flex;
  justify-content: space-between;
  gap: 6px;
  background: #d8f8d8;
  border: 2px solid #1e1e1e;
  border-radius: 12px;
  padding: 8px;
}

.mini-task.done {
  background: #eeeeee;
  opacity: 0.75;
}

.mini-task strong {
  display: block;
  font-size: 13px;
  font-weight: 900;
  line-height: 1.4;
}

.mini-task small {
  display: block;
  color: #555;
  font-size: 11px;
  font-weight: 800;
}

.mini-done {
  width: 28px;
  height: 28px;
  flex: 0 0 28px;
  padding: 0;
  border-radius: 10px;
  font-size: 13px;
}

.empty-period {
  width: 100%;
  padding: 9px 6px;
  border-radius: 12px;
  background: #ffffff;
  color: #666;
  font-size: 13px;
  box-shadow: none;
}

.task-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.task-item {
  display: grid;
  grid-template-columns: 1fr 260px;
  gap: 14px;
  align-items: start;
}

.task-main {
  min-width: 0;
}

.task-top {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

.task-top h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 900;
}

.task-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  margin-top: 10px;
  color: #666;
  font-size: 13px;
  font-weight: 800;
}

.task-note {
  margin: 10px 0 0;
  color: #333;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.6;
}

.action-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.action-btn {
  min-width: 0;
  padding: 10px 6px;
  font-size: 13px;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 900px) {
  .toolbar {
    grid-template-columns: 1fr;
  }

  .task-item {
    grid-template-columns: 1fr;
  }

  .action-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .page-header,
  .header-actions {
    flex-direction: column;
    width: 100%;
  }

  .header-actions button {
    width: 100%;
  }

  .week-toolbar {
    grid-template-columns: 1fr;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .week-grid {
    grid-template-columns: repeat(7, 150px);
  }
}
</style>
