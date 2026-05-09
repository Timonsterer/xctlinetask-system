<template>
  <div class="admin-page">
    <header class="admin-header">
      <div>
        <p class="eyebrow">管理者模式</p>
        <h1>後台管理中心</h1>
        <p class="subtitle">管理使用者、任務、多人副本、人物套版</p>
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
          <span>人物套版</span>
          <strong>{{ lifeTemplates.length }}</strong>
        </div>
      </section>

      <section class="card">
        <h2>{{ editingTemplateId ? '編輯人物套版' : '新增人物套版' }}</h2>

        <div class="form-grid">
          <input v-model="templateForm.title" placeholder="套版名稱，例如：彭于晏訓練模式" />
          <input v-model="templateForm.category" placeholder="分類，例如：健身 / 學習 / 工作" />
          <input v-model="templateForm.imageUrl" placeholder="圖片網址，可空白" />
          <textarea v-model="templateForm.description" placeholder="套版介紹"></textarea>
          <textarea
            v-model="templateForm.tasksText"
            placeholder="任務內容，一行一個任務&#10;例如：&#10;晨間慢跑 30 分鐘&#10;高蛋白早餐&#10;重量訓練 60 分鐘"
          ></textarea>
        </div>

        <div class="actions">
          <button class="small-btn" @click="saveLifeTemplate">
            {{ editingTemplateId ? '更新套版' : '新增到人物套版' }}
          </button>

          <button v-if="editingTemplateId" class="small-btn gray" @click="resetTemplateForm">
            取消編輯
          </button>
        </div>
      </section>

      <section class="card">
        <h2>人物套版管理</h2>

        <div v-if="lifeTemplates.length === 0" class="empty">
          尚無人物套版
        </div>

        <div v-else class="list">
          <div v-for="item in lifeTemplates" :key="item.id" class="list-item">
            <div>
              <strong>{{ item.title || item.name || '未命名套版' }}</strong>
              <p>{{ item.description || '尚無介紹' }}</p>
              <small>分類：{{ item.category || '未分類' }}</small>
            </div>

            <div class="row-actions">
              <button class="small-btn" @click="editLifeTemplate(item)">
                編輯
              </button>
              <button class="small-btn danger" @click="deleteLifeTemplate(item.id)">
                刪除
              </button>
            </div>
          </div>
        </div>
      </section>

      <section class="card">
        <h2>使用者管理</h2>

        <div v-if="users.length === 0" class="empty">尚無使用者資料</div>

        <div v-else class="list">
          <div v-for="user in users" :key="user.id" class="list-item">
            <div>
              <strong>{{ user.displayName || '未命名使用者' }}</strong>
              <p>{{ user.lineUserId || user.id }}</p>
              <small>角色：{{ user.role || 'user' }}</small>
            </div>

            <button v-if="user.role !== 'admin'" class="small-btn" @click="setAdmin(user.id)">
              設為管理者
            </button>

            <button v-else class="small-btn danger" @click="removeAdmin(user.id)">
              移除管理者
            </button>
          </div>
        </div>
      </section>

      <section class="card">
        <h2>任務管理</h2>

        <div v-if="tasks.length === 0" class="empty">尚無任務資料</div>

        <div v-else class="list">
          <div v-for="task in tasks" :key="task.id" class="list-item">
            <div>
              <strong>{{ task.title || task.name || '未命名任務' }}</strong>
              <p>擁有者：{{ task.ownerId || task.userId || '未知' }}</p>
              <small>狀態：{{ task.status || '未設定' }}</small>
            </div>

            <button class="small-btn danger" @click="deleteTask(task.id)">刪除</button>
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
  deleteDoc,
  addDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/firebase'

const router = useRouter()

const loading = ref(true)
const isAdmin = ref(false)

const users = ref([])
const tasks = ref([])
const raids = ref([])
const lifeTemplates = ref([])

const editingTemplateId = ref(null)

const templateForm = ref({
  title: '',
  category: '',
  imageUrl: '',
  description: '',
  tasksText: '',
})

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

  isAdmin.value = userSnap.data().role === 'admin'
}

const loadUsers = async () => {
  const snap = await getDocs(collection(db, 'users'))
  users.value = snap.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  }))
}

const loadTasks = async () => {
  const snap = await getDocs(collection(db, 'tasks'))
  tasks.value = snap.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  }))
}

const loadRaids = async () => {
  const snap = await getDocs(collection(db, 'raids'))
  raids.value = snap.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  }))
}

const loadLifeTemplates = async () => {
  const snap = await getDocs(collection(db, 'life_templates'))
  lifeTemplates.value = snap.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  }))
}

const resetTemplateForm = () => {
  editingTemplateId.value = null
  templateForm.value = {
    title: '',
    category: '',
    imageUrl: '',
    description: '',
    tasksText: '',
  }
}

const buildTemplatePayload = () => {
  const tasks = templateForm.value.tasksText
    .split('\n')
    .map((text) => text.trim())
    .filter(Boolean)
    .map((text, index) => ({
      id: `task_${index + 1}`,
      title: text,
      order: index + 1,
      done: false,
    }))

  return {
    title: templateForm.value.title.trim(),
    name: templateForm.value.title.trim(),
    category: templateForm.value.category.trim(),
    imageUrl: templateForm.value.imageUrl.trim(),
    description: templateForm.value.description.trim(),
    tasks,
    updatedAt: serverTimestamp(),
  }
}

const saveLifeTemplate = async () => {
  if (!templateForm.value.title.trim()) {
    alert('請輸入套版名稱')
    return
  }

  const payload = buildTemplatePayload()

  if (editingTemplateId.value) {
    await setDoc(
      doc(db, 'life_templates', editingTemplateId.value),
      payload,
      { merge: true }
    )
  } else {
    await addDoc(collection(db, 'life_templates'), {
      ...payload,
      createdAt: serverTimestamp(),
      isPublic: true,
      source: 'admin',
    })
  }

  resetTemplateForm()
  await loadLifeTemplates()
}

const editLifeTemplate = (item) => {
  editingTemplateId.value = item.id

  templateForm.value = {
    title: item.title || item.name || '',
    category: item.category || '',
    imageUrl: item.imageUrl || '',
    description: item.description || '',
    tasksText: Array.isArray(item.tasks)
      ? item.tasks.map((task) => task.title || task.name || task.text || '').join('\n')
      : '',
  }

  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const deleteLifeTemplate = async (id) => {
  const ok = confirm('確定要刪除這個人物套版嗎？')
  if (!ok) return

  await deleteDoc(doc(db, 'life_templates', id))
  await loadLifeTemplates()

  if (editingTemplateId.value === id) {
    resetTemplateForm()
  }
}

const setAdmin = async (userId) => {
  await updateDoc(doc(db, 'users', userId), {
    role: 'admin',
  })
  await loadUsers()
}

const removeAdmin = async (userId) => {
  await updateDoc(doc(db, 'users', userId), {
    role: 'user',
  })
  await loadUsers()
}

const deleteTask = async (taskId) => {
  const ok = confirm('確定要刪除這個任務嗎？')
  if (!ok) return

  await deleteDoc(doc(db, 'tasks', taskId))
  await loadTasks()
}

onMounted(async () => {
  try {
    await checkAdmin()

    if (isAdmin.value) {
      await Promise.all([
        loadUsers(),
        loadTasks(),
        loadRaids(),
        loadLifeTemplates(),
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

.form-grid {
  display: grid;
  gap: 12px;
}

input,
textarea {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #d1d5db;
  border-radius: 14px;
  padding: 12px 14px;
  font-size: 15px;
  outline: none;
  background: #f9fafb;
}

textarea {
  min-height: 110px;
  resize: vertical;
}

input:focus,
textarea:focus {
  border-color: #2563eb;
  background: white;
}

.actions,
.row-actions {
  display: flex;
  gap: 10px;
  margin-top: 14px;
  flex-wrap: wrap;
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

.gray {
  background: #6b7280;
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

  .small-btn,
  .home-btn {
    width: 100%;
  }

  .row-actions {
    width: 100%;
  }
}
</style>
