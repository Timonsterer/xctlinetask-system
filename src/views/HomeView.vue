<template>
  <div class="home-page">
    <h1 class="page-title">當前任務</h1>

    <!-- 當前任務 -->
    <section class="task-section">
      <p v-if="loading" class="status-text">載入中...</p>
      <p v-else-if="error" class="error-text">{{ error }}</p>

      <div v-else-if="currentTask" class="task-card current-task-card">
        <div class="task-type">
          {{ currentTask.type === 'key' ? '主線任務' : '任務' }}
        </div>

        <h2 class="task-title big-task-title">{{ currentTask.title }}</h2>

        <div class="task-meta big-task-meta">
          <p>預定時間：{{ formatTaskDate(currentTask.dueAt) }}</p>
          <p>需求時間：{{ durationMinutesToText(currentTask.durationMinutes || 30) }}</p>
        </div>

        <button class="complete-btn" @click="handleComplete" :disabled="submitting">
          {{ submitting ? '完成中...' : '完成任務' }}
        </button>
      </div>

      <div v-else class="task-card current-task-card empty-task-card">
        <h2 class="task-title big-task-title">目前沒有任務</h2>
        <p class="empty-text">請直接在下方新增下一個任務</p>
        <p class="empty-text">空白超過 {{ idleReminderMinutes }} 分鐘會提醒你</p>
        <p v-if="idleSinceText" class="empty-text">空白起始：{{ idleSinceText }}</p>
      </div>
    </section>

    <!-- 建立任務 -->
    <section class="create-card">
      <h2>建立任務</h2>

      <div class="form-group">
        <label>要做的事情</label>
        <input
          v-model.trim="taskTitle"
          type="text"
          placeholder="例如：打電話給客戶A"
        />
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>任務時間</label>
          <input
            v-model.trim="taskTimeInput"
            type="text"
            placeholder="HHMM 或 HHMM-MMDD"
          />
          <small>空白 = 30 分鐘後，例如 1430 或 1430-0408</small>
        </div>

        <div class="form-group">
          <label>需求時間</label>
          <input
            v-model.trim="taskDurationInput"
            type="text"
            placeholder="例如 0230"
          />
          <small>四碼，例如 0230 = 2 小時 30 分，空白 = 30 分鐘</small>
        </div>
      </div>

      <button class="primary-btn" @click="handleCreateTask" :disabled="creating">
        {{ creating ? '建立中...' : '建立任務' }}
      </button>
    </section>

    <!-- 提醒設定 -->
    <section class="setting-card">
      <h2>提醒設定</h2>

      <div class="form-row">
        <div class="form-group">
          <label>空白提醒分鐘數</label>
          <input
            v-model.number="idleReminderMinutes"
            type="number"
            min="1"
            step="1"
          />
        </div>

        <div class="form-group">
          <label>睡眠開始</label>
          <input
            v-model.trim="sleepStart"
            type="text"
            placeholder="2300"
          />
        </div>

        <div class="form-group">
          <label>睡眠結束</label>
          <input
            v-model.trim="sleepEnd"
            type="text"
            placeholder="0700"
          />
        </div>
      </div>

      <button class="secondary-btn" @click="saveReminderSettings" :disabled="savingSettings">
        {{ savingSettings ? '儲存中...' : '儲存提醒設定' }}
      </button>
    </section>

    <!-- 歷史紀錄 -->
    <section class="history-card">
      <div class="top-bar">
        <h2>歷史紀錄（1 個月）</h2>
        <button class="secondary-btn" @click="exportHistoryAsText" :disabled="exporting">
          {{ exporting ? '匯出中...' : '匯出文字檔' }}
        </button>
      </div>

      <div v-if="historyList.length === 0" class="empty-history">
        目前沒有歷史紀錄
      </div>

      <div v-else class="history-list">
        <div v-for="item in historyList" :key="item.id" class="history-item">
          <div class="history-title">{{ item.title }}</div>
          <div class="history-meta">
            <p>預定時間：{{ formatTaskDate(item.dueAt) }}</p>
            <p>完成時間：{{ formatTaskDate(item.completedAt) }}</p>
            <p>需求時間：{{ durationMinutesToText(item.durationMinutes || 30) }}</p>
          </div>
        </div>
      </div>
    </section>

    <p v-if="successText" class="success-text">{{ successText }}</p>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { Timestamp } from 'firebase/firestore'
import { getLiffProfile } from '../liff'
import {
  createTask,
  getCurrentTaskByOwner,
  completeTask,
  cleanupTaskHistoryOlderThan30Days,
  getTaskHistoryByOwner,
  updateUserIdleState,
  getUserProfile,
} from '../services/taskService'
import {
  parseTaskTimeInput,
  parseDurationInput,
  formatDateTime,
  durationMinutesToText,
  isInSleepTime,
} from '../utils/taskTime'

const loading = ref(true)
const creating = ref(false)
const submitting = ref(false)
const savingSettings = ref(false)
const exporting = ref(false)

const error = ref('')
const successText = ref('')

const currentUserId = ref('')
const currentUser = ref(null)
const currentTask = ref(null)
const historyList = ref([])

const taskTitle = ref('')
const taskTimeInput = ref('')
const taskDurationInput = ref('')

const idleReminderMinutes = ref(30)
const sleepStart = ref('2300')
const sleepEnd = ref('0700')
const idleSinceText = ref('')

let reminderTimer = null

function clearMessage() {
  successText.value = ''
  error.value = ''
}

function formatTaskDate(value) {
  if (!value) return '-'

  if (value instanceof Timestamp) {
    return formatDateTime(value.toDate())
  }

  if (value?.toDate) {
    return formatDateTime(value.toDate())
  }

  return formatDateTime(value)
}

async function loadHistory() {
  if (!currentUserId.value) return
  await cleanupTaskHistoryOlderThan30Days(currentUserId.value)
  historyList.value = await getTaskHistoryByOwner(currentUserId.value)
}

async function loadCurrentTask() {
  try {
    loading.value = true
    error.value = ''

    const profile = await getLiffProfile()
    currentUserId.value = profile.lineUserId

    const user = await getUserProfile(currentUserId.value)
    currentUser.value = user

    if (user?.idleReminderMinutes) {
      idleReminderMinutes.value = user.idleReminderMinutes
    }
    if (user?.sleepStart) {
      sleepStart.value = user.sleepStart
    }
    if (user?.sleepEnd) {
      sleepEnd.value = user.sleepEnd
    }

    const task = await getCurrentTaskByOwner(currentUserId.value)
    currentTask.value = task

    if (task) {
      idleSinceText.value = ''
      await updateUserIdleState(currentUserId.value, {
        idleSince: null,
        lastReminderAt: null,
      })
    } else {
      const freshUser = await getUserProfile(currentUserId.value)
      const idleSince = freshUser?.idleSince?.toDate ? freshUser.idleSince.toDate() : null

      if (!idleSince) {
        await updateUserIdleState(currentUserId.value, {
          idleSince: Timestamp.now(),
          lastReminderAt: null,
          idleReminderMinutes: idleReminderMinutes.value,
          sleepStart: sleepStart.value,
          sleepEnd: sleepEnd.value,
        })
        idleSinceText.value = formatDateTime(new Date())
      } else {
        idleSinceText.value = formatDateTime(idleSince)
      }
    }

    await loadHistory()
  } catch (err) {
    console.error(err)
    error.value = err?.message || '讀取任務失敗'
    currentTask.value = null
  } finally {
    loading.value = false
  }
}

async function handleCreateTask() {
  try {
    clearMessage()

    if (!taskTitle.value) {
      throw new Error('請先輸入要做的事情')
    }

    creating.value = true

    const dueAt = parseTaskTimeInput(taskTimeInput.value)
    const durationMinutes = parseDurationInput(taskDurationInput.value)

    await createTask({
      ownerId: currentUserId.value,
      title: taskTitle.value,
      dueAt,
      durationMinutes,
      rawTimeInput: taskTimeInput.value,
      rawDurationInput: taskDurationInput.value,
    })

    await updateUserIdleState(currentUserId.value, {
      idleSince: null,
      lastReminderAt: null,
      idleReminderMinutes: idleReminderMinutes.value,
      sleepStart: sleepStart.value,
      sleepEnd: sleepEnd.value,
    })

    taskTitle.value = ''
    taskTimeInput.value = ''
    taskDurationInput.value = ''
    successText.value = '任務已建立'
    await loadCurrentTask()
  } catch (err) {
    console.error(err)
    error.value = err?.message || '建立任務失敗'
  } finally {
    creating.value = false
  }
}

async function handleComplete() {
  if (!currentTask.value) return

  try {
    clearMessage()
    submitting.value = true

    await completeTask(currentTask.value)
    successText.value = '任務已完成'
    await loadCurrentTask()
  } catch (err) {
    console.error(err)
    error.value = err?.message || '完成任務失敗'
  } finally {
    submitting.value = false
  }
}

async function saveReminderSettings() {
  try {
    clearMessage()
    savingSettings.value = true

    if (!/^\d{4}$/.test(sleepStart.value) || !/^\d{4}$/.test(sleepEnd.value)) {
      throw new Error('睡眠時間請輸入四碼，例如 2300、0700')
    }

    await updateUserIdleState(currentUserId.value, {
      idleReminderMinutes: Number(idleReminderMinutes.value) || 30,
      sleepStart: sleepStart.value,
      sleepEnd: sleepEnd.value,
    })

    successText.value = '提醒設定已儲存'
  } catch (err) {
    console.error(err)
    error.value = err?.message || '儲存提醒設定失敗'
  } finally {
    savingSettings.value = false
  }
}

async function checkIdleReminder() {
  try {
    if (currentTask.value) return
    if (!currentUserId.value) return

    const user = await getUserProfile(currentUserId.value)
    if (!user?.idleSince?.toDate) return

    const now = new Date()
    const idleSince = user.idleSince.toDate()
    const minutes = Math.floor((now.getTime() - idleSince.getTime()) / 60000)

    const reminderMinutes = Number(user.idleReminderMinutes || idleReminderMinutes.value || 30)
    const start = user.sleepStart || sleepStart.value || '2300'
    const end = user.sleepEnd || sleepEnd.value || '0700'

    if (isInSleepTime(now, start, end)) return
    if (minutes < reminderMinutes) return

    const lastReminder = user.lastReminderAt?.toDate ? user.lastReminderAt.toDate() : null
    if (lastReminder) {
      const diff = Math.floor((now.getTime() - lastReminder.getTime()) / 60000)
      if (diff < reminderMinutes) return
    }

    alert(`你已經空白超過 ${reminderMinutes} 分鐘，請輸入下一個任務。`)

    await updateUserIdleState(currentUserId.value, {
      lastReminderAt: Timestamp.now(),
      idleReminderMinutes: reminderMinutes,
      sleepStart: start,
      sleepEnd: end,
    })
  } catch (err) {
    console.error(err)
  }
}

async function exportHistoryAsText() {
  try {
    exporting.value = true
    clearMessage()

    const profile = await getLiffProfile()
    const rows = historyList.value.map((item, index) => {
      return [
        `${index + 1}. ${item.title}`,
        `預定時間：${formatTaskDate(item.dueAt)}`,
        `完成時間：${formatTaskDate(item.completedAt)}`,
        `需求時間：${durationMinutesToText(item.durationMinutes || 30)}`,
        '',
      ].join('\n')
    })

    const content = [
      '【任務歷史紀錄】',
      `姓名：${profile.displayName || currentUser.value?.displayName || ''}`,
      `匯出時間：${formatDateTime(new Date())}`,
      '',
      ...rows,
    ].join('\n')

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `task-history-${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)

    successText.value = '歷史紀錄已匯出'
  } catch (err) {
    console.error(err)
    error.value = err?.message || '匯出失敗'
  } finally {
    exporting.value = false
  }
}

onMounted(async () => {
  await loadCurrentTask()
  reminderTimer = setInterval(checkIdleReminder, 60000)
})

onBeforeUnmount(() => {
  if (reminderTimer) {
    clearInterval(reminderTimer)
  }
})
</script>

<style scoped>
.home-page {
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;
}

.page-title {
  margin-bottom: 18px;
  font-size: 34px;
  font-weight: 800;
}

.task-section {
  margin-bottom: 18px;
}

.current-task-card {
  border: 2px solid #111;
  border-radius: 22px;
  padding: 28px;
  background: #fff;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
}

.big-task-title {
  font-size: 40px;
  font-weight: 800;
  line-height: 1.3;
  margin: 0 0 18px;
}

.big-task-meta {
  font-size: 18px;
  line-height: 1.8;
  color: #444;
  margin-bottom: 20px;
}

.create-card,
.setting-card,
.history-card {
  border: 1px solid #ddd;
  border-radius: 16px;
  padding: 18px;
  background: #fff;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.06);
  margin-bottom: 18px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 14px;
  flex: 1;
}

.form-group input {
  border: 1px solid #ccc;
  border-radius: 10px;
  padding: 12px;
  font-size: 15px;
}

.form-group small {
  color: #666;
}

.form-row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.primary-btn,
.secondary-btn,
.complete-btn {
  border: none;
  border-radius: 12px;
  padding: 12px 16px;
  cursor: pointer;
  font-size: 16px;
}

.primary-btn {
  background: #2563eb;
  color: #fff;
}

.secondary-btn {
  background: #222;
  color: #fff;
}

.complete-btn {
  width: 100%;
  background: #16a34a;
  color: #fff;
  margin-top: 12px;
  padding: 16px;
  font-size: 20px;
  font-weight: 700;
}

.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.status-text {
  color: #666;
}

.error-text {
  color: #c62828;
  margin-bottom: 12px;
}

.success-text {
  color: #15803d;
  margin-top: 12px;
}

.task-type {
  display: inline-block;
  margin-bottom: 12px;
  padding: 6px 12px;
  border-radius: 999px;
  background: #eef3ff;
  color: #3451b2;
  font-size: 14px;
  font-weight: 700;
}

.empty-task-card {
  text-align: center;
}

.empty-text {
  color: #666;
  line-height: 1.8;
  font-size: 18px;
}

.history-title {
  margin: 0 0 10px;
  font-weight: 700;
}

.history-meta,
.empty-history {
  color: #666;
  line-height: 1.7;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.history-item {
  border: 1px solid #eee;
  border-radius: 12px;
  padding: 14px;
}
</style>
