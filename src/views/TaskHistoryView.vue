<template>
  <div class="task-history-page">
    <div class="page-header">
      <div>
        <h1>任務紀錄</h1>
        <p>查看你的待辦與已完成任務</p>
      </div>

      <button class="btn" type="button" @click="goHome">
        返回首頁
      </button>
    </div>

    <div class="toolbar card">
      <div class="filter-group">
        <button
          class="tab-btn"
          :class="{ active: filterStatus === 'all' }"
          @click="filterStatus = 'all'"
        >
          全部
        </button>
        <button
          class="tab-btn"
          :class="{ active: filterStatus === 'pending' }"
          @click="filterStatus = 'pending'"
        >
          未完成
        </button>
        <button
          class="tab-btn"
          :class="{ active: filterStatus === 'done' }"
          @click="filterStatus = 'done'"
        >
          已完成
        </button>
      </div>

      <div class="search-group">
        <input
          v-model.trim="keyword"
          type="text"
          placeholder="搜尋任務名稱或備註"
        />
      </div>
    </div>

    <div v-if="error" class="alert error">{{ error }}</div>
    <div v-if="success" class="alert success">{{ success }}</div>

    <div class="card">
      <div v-if="loading" class="loading">載入中...</div>

      <div v-else-if="filteredTasks.length === 0" class="empty-box">
        目前沒有符合條件的任務
      </div>

      <div v-else class="task-list">
        <div
          v-for="task in filteredTasks"
          :key="task.id"
          class="task-item"
        >
          <div class="task-main">
            <div class="task-top">
              <div class="task-title">
                {{ task.title || '未命名任務' }}
              </div>
              <div
                class="status-badge"
                :class="task.status === 'done' ? 'done' : 'pending'"
              >
                {{ task.status === 'done' ? '已完成' : '未完成' }}
              </div>
            </div>

            <div class="task-time">
              <span v-if="task.startText">開始：{{ task.startText }}</span>
              <span v-if="task.endText">結束：{{ task.endText }}</span>
              <span v-if="task.completedText">完成：{{ task.completedText }}</span>
            </div>

            <div v-if="task.note" class="task-note">
              {{ task.note }}
            </div>
          </div>

          <div class="task-actions">
            <button
              v-if="task.status !== 'done'"
              class="btn primary"
              type="button"
              @click="editTask(task.id)"
            >
              編輯
            </button>

            <button
              v-if="task.status !== 'done'"
              class="btn success"
              type="button"
              @click="completeTask(task)"
              :disabled="actingId === task.id"
            >
              {{ actingId === task.id ? '處理中...' : '完成' }}
            </button>

            <button
              class="btn danger"
              type="button"
              @click="deleteTask(task)"
              :disabled="actingId === task.id"
            >
              {{ actingId === task.id ? '處理中...' : '刪除' }}
            </button>
          </div>
        </div>
      </div>
    </div>
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
  orderBy,
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

const getUserId = () => {
  return (
    localStorage.getItem('userId') ||
    localStorage.getItem('lineUserId') ||
    localStorage.getItem('line_user_id') ||
    ''
  )
}

const resetMessage = () => {
  error.value = ''
  success.value = ''
}

const formatDateTime = (value) => {
  if (!value) return ''

  let date = null

  if (typeof value?.toDate === 'function') {
    date = value.toDate()
  } else if (value instanceof Date) {
    date = value
  } else {
    date = new Date(value)
  }

  if (Number.isNaN(date.getTime())) return ''

  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const mi = String(date.getMinutes()).padStart(2, '0')

  return `${yyyy}/${mm}/${dd} ${hh}:${mi}`
}

const filteredTasks = computed(() => {
  return tasks.value.filter((task) => {
    const matchStatus =
      filterStatus.value === 'all' || task.status === filterStatus.value

    const text = `${task.title || ''} ${task.note || ''}`.toLowerCase()
    const matchKeyword =
      !keyword.value || text.includes(keyword.value.toLowerCase())

    return matchStatus && matchKeyword
  })
})

const loadTasks = async () => {
  loading.value = true
  resetMessage()

  try {
    const userId = getUserId()

    if (!userId) {
      router.push('/bind')
      return
    }

    const q = query(
      collection(db, 'tasks'),
      where('userId', '==', userId),
      orderBy('updatedAt', 'desc')
    )

    const snap = await getDocs(q)

    tasks.value = snap.docs.map((item) => {
      const data = item.data()
      return {
        id: item.id,
        ...data,
        startText: formatDateTime(data.startAt || data.startText),
        endText: formatDateTime(data.endAt || data.endText),
        completedText: formatDateTime(data.completedAt),
      }
    })
  } catch (err) {
    console.error(err)
    error.value = '讀取任務紀錄失敗，請檢查 Firestore 索引'
  } finally {
    loading.value = false
  }
}

const completeTask = async (task) => {
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
      taskId: task.id,
      title: task.title || '',
      note: task.note || '',
      startAt: task.startAt || null,
      endAt: task.endAt || null,
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

const deleteTask = async (task) => {
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

const editTask = (id) => {
  router.push(`/task/new?id=${id}`)
}

const goHome = () => {
  router.push('/home')
}

onMounted(() => {
  loadTasks()
})
</script>

<style scoped>
.task-history-page {
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.page-header h1 {
  margin: 0 0 8px;
  font-size: 28px;
  font-weight: 800;
}

.page-header p {
  margin: 0;
  color: #666;
}

.card {
  background: #fff;
  border-radius: 18px;
  padding: 18px;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.06);
  margin-bottom: 16px;
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.filter-group {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.search-group input {
  width: 260px;
  max-width: 100%;
  border: 1px solid #dcdcdc;
  border-radius: 12px;
  padding: 12px 14px;
  font-size: 14px;
  outline: none;
}

.search-group input:focus {
  border-color: #111;
}

.tab-btn {
  border: none;
  border-radius: 999px;
  padding: 10px 14px;
  background: #ececec;
  color: #333;
  cursor: pointer;
  font-size: 14px;
}

.tab-btn.active {
  background: #111;
  color: #fff;
}

.loading,
.empty-box {
  padding: 28px 0;
  text-align: center;
  color: #666;
}

.task-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.task-item {
  border: 1px solid #ececec;
  border-radius: 16px;
  padding: 16px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.task-main {
  flex: 1;
  min-width: 0;
}

.task-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.task-title {
  font-size: 18px;
  font-weight: 800;
  color: #111;
}

.status-badge {
  flex-shrink: 0;
  border-radius: 999px;
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 700;
}

.status-badge.pending {
  background: #fff4e5;
  color: #b54708;
}

.status-badge.done {
  background: #eefbf3;
  color: #067647;
}

.task-time {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 10px;
  font-size: 13px;
  color: #666;
}

.task-note {
  margin-top: 10px;
  font-size: 14px;
  color: #444;
  line-height: 1.6;
}

.task-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.alert {
  margin-bottom: 14px;
  padding: 12px 14px;
  border-radius: 12px;
  font-size: 14px;
}

.alert.error {
  background: #fff1f1;
  color: #b42318;
}

.alert.success {
  background: #eefbf3;
  color: #067647;
}

.btn {
  border: none;
  border-radius: 12px;
  padding: 10px 14px;
  font-size: 14px;
  cursor: pointer;
  background: #ececec;
  color: #222;
}

.btn.primary {
  background: #111;
  color: #fff;
}

.btn.success {
  background: #eafaf0;
  color: #067647;
}

.btn.danger {
  background: #ffe7e7;
  color: #b42318;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 640px) {
  .task-history-page {
    padding: 16px;
  }

  .page-header {
    flex-direction: column;
  }

  .task-item {
    flex-direction: column;
  }

  .search-group input {
    width: 100%;
  }
}
</style>
