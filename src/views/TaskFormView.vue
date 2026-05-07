<template>
  <div class="page">
    <div class="header">
      <h1>任務紀錄</h1>
      <button class="btn secondary" @click="goHome">返回首頁</button>
    </div>

    <div v-if="loading" class="card">
      載入中...
    </div>

    <div v-else-if="tasks.length === 0" class="card empty">
      目前沒有任務紀錄
    </div>

    <div v-else class="list">
      <div v-for="task in tasks" :key="task.id" class="card">
        <div class="row">
          <h2>{{ getTitle(task) }}</h2>

          <span class="status" :class="task.status">
            {{ statusText(task.status) }}
          </span>
        </div>

        <p v-if="task.note" class="note">
          {{ task.note }}
        </p>

        <div class="meta">
          <span v-if="task.type === 'life_template'">
            🔥 套版任務
          </span>

          <span v-if="task.source === 'template'">
            🔥 套版任務
          </span>

          <span v-if="task.createdAt">
            建立時間：{{ formatTime(task.createdAt) }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  collection,
  getDocs,
  query,
  where
} from 'firebase/firestore'
import { db } from '@/firebase'

const router = useRouter()

const loading = ref(false)
const tasks = ref([])

function getUserId() {
  return (
    localStorage.getItem('lineUserId') ||
    localStorage.getItem('userId') ||
    ''
  )
}

function getTitle(task) {
  return task?.content || task?.title || '未命名任務'
}

function formatTime(ts) {
  if (!ts) return ''

  if (typeof ts.toDate === 'function') {
    return ts.toDate().toLocaleString()
  }

  return ''
}

function statusText(status) {
  if (status === 'done') return '已完成'
  if (status === 'pending') return '待處理'
  return status || '未知'
}

async function loadTasks() {
  const userId = getUserId()

  if (!userId) {
    router.push('/bind')
    return
  }

  loading.value = true

  try {
    const q = query(
      collection(db, 'tasks'),
      where('userId', '==', userId)
    )

    const snap = await getDocs(q)

    tasks.value = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  } catch (err) {
    console.error('讀取任務紀錄失敗:', err)
    alert('讀取任務紀錄失敗')
  } finally {
    loading.value = false
  }
}

function goHome() {
  router.push('/home')
}

onMounted(loadTasks)
</script>

<style scoped>
.page {
  padding: 20px;
  max-width: 720px;
  margin: 0 auto;
}

.header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.card {
  background: white;
  padding: 16px;
  border-radius: 14px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
}

.row {
  display: flex;
  justify-content: space-between;
}

.status {
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 8px;
}

.status.done {
  background: #dcfce7;
  color: #166534;
}

.status.pending {
  background: #e0f2fe;
  color: #0369a1;
}

.note {
  margin: 6px 0;
  color: #555;
}

.meta {
  font-size: 12px;
  color: #888;
  display: flex;
  gap: 10px;
}

.empty {
  text-align: center;
}

.btn.secondary {
  background: #eee;
}
</style>
