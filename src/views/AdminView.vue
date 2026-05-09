<template>
  <div class="admin-page">
    <header class="admin-header">
      <div>
        <p class="eyebrow">管理者模式</p>
        <h1>後台管理中心</h1>
        <p class="subtitle">管理使用者、任務、多人副本與系統狀態</p>
      </div>

      <button class="home-btn" @click="goHome">回首頁</button>
    </header>

    <section v-if="loading" class="card">
      <p>讀取管理者資料中...</p>
    </section>

    <section v-else-if="!isAdmin" class="card denied">
      <h2>無權限進入</h2>
      <p>你目前不是管理者，無法使用此頁面。</p>
      <button @click="goHome">返回首頁</button>
    </section>

    <main v-else class="admin-content">
      <section class="stats-grid">
        <div class="stat-card">
          <span>使用者數</span>
          <strong>{{ users.length }}</strong>
        </div>

        <div class="stat-card">
          <span>任務數</span>
          <strong>{{ tasks.length }}</strong>
        </div>

        <div class="stat-card">
          <span>多人副本</span>
          <strong>{{ raids.length }}</strong>
        </div>
      </section>

      <section class="card">
        <h2>使用者管理</h2>

        <div v-if="users.length === 0" class="empty">
          尚無使用者資料
        </div>

        <div v-else class="list">
          <div v-for="user in users" :key="user.id" class="list-item">
            <div>
              <strong>{{ user.displayName || '未命名使用者' }}</strong>
              <p>{{ user.lineUserId || user.id }}</p>
              <small>角色：{{ user.role || 'user' }}</small>
            </div>

            <button
              v-if="user.role !== 'admin'"
              class="small-btn"
              @click="setAdmin(user.id)"
            >
              設為管理者
            </button>

            <button
              v-else
              class="small-btn danger"
              @click="removeAdmin(user.id)"
            >
              移除管理者
            </button>
          </div>
        </div>
      </section>

      <section class="card">
        <h2>任務管理</h2>

        <div v-if="tasks.length === 0" class="empty">
          尚無任務資料
        </div>

        <div v-else class="list">
          <div v-for="task in tasks" :key="task.id" class="list-item">
            <div>
              <strong>{{ task.title || task.name || '未命名任務' }}</strong>
              <p>擁有者：{{ task.ownerId || task.userId || '未知' }}</p>
              <small>狀態：{{ task.status || '未設定' }}</small>
            </div>

            <button class="small-btn danger" @click="deleteTask(task.id)">
              刪除
            </button>
          </div>
        </div>
      </section>

      <section class="card">
        <h2>多人副本管理</h2>

        <div v-if="raids.length === 0" class="empty">
          尚無多人副本資料
        </div>

        <div v-else class="list">
          <div v-for="raid in raids" :key="raid.id" class="list-item">
            <div>
              <strong>{{ raid.title || raid.name || '未命名副本' }}</strong>
              <p>發布者：{{ raid.ownerId || raid.creatorId || '未知' }}</p>
              <small>狀態：{{ raid.status || '未設定' }}</small>
            </div>

            <button class="small-btn danger" @click="deleteRaid(raid.id)">
              刪除
            </button>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  deleteDoc
} from 'firebase/firestore'
import { db } from '@/firebase'

const router = useRouter()

const loading = ref(true)
const isAdmin = ref(false)

const users = ref([])
const tasks = ref([])
const raids = ref([])

const goHome = () => {
  router.push('/home')
}

const checkAdmin = async () => {
  const lineUserId = localStorage.getItem('lineUserId')

  if (!lineUserId) {
    isAdmin.value = false
    return
  }

  const userRef = doc(db, 'users', lineUserId)
  const userSnap = await getDoc(userRef)

  if (!userSnap.exists()) {
    isAdmin.value = false
    return
  }

  const userData = userSnap.data()
  isAdmin.value = userData.role === 'admin'
}

const loadUsers = async () => {
  const snap = await getDocs(collection(db, 'users'))
  users.value = snap.docs.map(docSnap => ({
    id: docSnap.id,
    ...docSnap.data()
  }))
}

const loadTasks = async () => {
  const snap = await getDocs(collection(db, 'tasks'))
  tasks.value = snap.docs.map(docSnap => ({
    id: docSnap.id,
    ...docSnap.data()
  }))
}

const loadRaids = async () => {
  const snap = await getDocs(collection(db, 'raids'))
  raids.value = snap.docs.map(docSnap => ({
    id: docSnap.id,
    ...docSnap.data()
  }))
}

const setAdmin = async (userId) => {
  await updateDoc(doc(db, 'users', userId), {
    role: 'admin'
  })
  await loadUsers()
}

const removeAdmin = async (userId) => {
  await updateDoc(doc(db, 'users', userId), {
    role: 'user'
  })
  await loadUsers()
}

const deleteTask = async (taskId) => {
  const ok = confirm('確定要刪除這個任務嗎？')
  if (!ok) return

  await deleteDoc(doc(db, 'tasks', taskId))
  await loadTasks()
}

const deleteRaid = async (raidId) => {
  const ok = confirm('確定要刪除這個多人副本嗎？')
  if (!ok) return

  await deleteDoc(doc(db, 'raids', raidId))
  await loadRaids()
}

onMounted(async () => {
  try {
    await checkAdmin()

    if (isAdmin.value) {
      await Promise.all([
        loadUsers(),
        loadTasks(),
        loadRaids()
      ])
    }
  } catch (err) {
    console.error('讀取管理者資料失敗：', err)
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.admin-page {
  min-height: 100vh;
  padding: 24px;
  background: linear-gradient(180deg, #f5f7fb 0%, #eaf0f8 100%);
  color: #1f2937;
}

.admin-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.eyebrow {
  margin: 0 0 6px;
  font-size: 13px;
  color: #2563eb;
  font-weight: 700;
}

h1 {
  margin: 0;
  font-size: 30px;
}

.subtitle {
  margin-top: 8px;
  color: #6b7280;
}

.home-btn,
.small-btn,
.card button {
  border: none;
  border-radius: 12px;
  padding: 10px 14px;
  background: #2563eb;
  color: white;
  font-weight: 700;
  cursor: pointer;
}

.home-btn:hover,
.small-btn:hover,
.card button:hover {
  opacity: 0.9;
}

.admin-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
}

.stat-card,
.card {
  background: white;
  border-radius: 20px;
  padding: 20px;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
}

.stat-card span {
  display: block;
  color: #6b7280;
  margin-bottom: 8px;
}

.stat-card strong {
  font-size: 32px;
}

.card h2 {
  margin-top: 0;
  margin-bottom: 16px;
}

.denied {
  text-align: center;
}

.empty {
  padding: 16px;
  border-radius: 14px;
  background: #f3f4f6;
  color: #6b7280;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.list-item {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  padding: 14px;
  border-radius: 16px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
}

.list-item p {
  margin: 6px 0;
  color: #6b7280;
  font-size: 14px;
}

.list-item small {
  color: #9ca3af;
}

.small-btn {
  white-space: nowrap;
  font-size: 14px;
}

.danger {
  background: #dc2626;
}

@media (max-width: 768px) {
  .admin-page {
    padding: 16px;
  }

  .admin-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 14px;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .list-item {
    flex-direction: column;
    align-items: flex-start;
  }

  .small-btn {
    width: 100%;
  }
}
</style>
