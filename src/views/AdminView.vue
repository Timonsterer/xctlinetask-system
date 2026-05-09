<template>
  <div class="admin-page">
    <header class="admin-header">
      <div>
        <p class="eyebrow">管理者模式</p>
        <h1>後台管理中心</h1>
        <p class="subtitle">
          管理使用者、任務、人物生活套版
        </p>
      </div>

      <button class="home-btn" @click="goHome">
        回首頁
      </button>
    </header>

    <section v-if="loading" class="card">
      <p>讀取管理者資料中...</p>
    </section>

    <section v-else-if="!isAdmin" class="card denied">
      <h2>無權限進入</h2>
      <p>你目前不是管理者</p>
    </section>

    <main v-else class="admin-content">

      <!-- 統計 -->
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

      <!-- 人物套版新增 -->
      <section class="card">
        <h2>
          {{ editingTemplateId ? '編輯人物套版' : '新增人物套版' }}
        </h2>

        <div class="form-grid">

          <input
            v-model="templateForm.title"
            placeholder="人物名稱，例如：彭于晏"
          />

          <input
            v-model="templateForm.category"
            placeholder="分類，例如：健身"
          />

          <input
            v-model="templateForm.imageUrl"
            placeholder="圖片網址"
          />

          <textarea
            v-model="templateForm.description"
            placeholder="人物介紹"
          />

          <textarea
            v-model="templateForm.tasksText"
            placeholder="任務內容，一行一個&#10;例如：&#10;晨跑30分鐘&#10;高蛋白早餐&#10;重訓60分鐘"
          />

        </div>

        <div class="actions">
          <button
            class="small-btn"
            @click="saveLifeTemplate"
          >
            {{ editingTemplateId ? '更新套版' : '新增套版' }}
          </button>

          <button
            v-if="editingTemplateId"
            class="small-btn gray"
            @click="resetTemplateForm"
          >
            取消編輯
          </button>
        </div>
      </section>

      <!-- 套版列表 -->
      <section class="card">
        <h2>人物套版管理</h2>

        <div
          v-if="lifeTemplates.length === 0"
          class="empty"
        >
          尚無人物套版
        </div>

        <div v-else class="list">
          <div
            v-for="item in lifeTemplates"
            :key="item.id"
            class="list-item"
          >

            <div class="left">
              <strong>
                {{ item.title || item.name }}
              </strong>

              <p>
                {{ item.description || '無介紹' }}
              </p>

              <small>
                分類：
                {{ item.category || '未分類' }}
              </small>

              <div
                v-if="item.tasks?.length"
                class="task-preview"
              >
                <div
                  v-for="task in item.tasks"
                  :key="task.id"
                >
                  • {{ task.name || task.title || task.text }}
                </div>
              </div>
            </div>

            <div class="row-actions">
              <button
                class="small-btn"
                @click="editLifeTemplate(item)"
              >
                編輯
              </button>

              <button
                class="small-btn danger"
                @click="deleteLifeTemplate(item.id)"
              >
                刪除
              </button>
            </div>

          </div>
        </div>
      </section>

      <!-- 使用者 -->
      <section class="card">
        <h2>使用者管理</h2>

        <div
          v-if="users.length === 0"
          class="empty"
        >
          尚無使用者
        </div>

        <div v-else class="list">
          <div
            v-for="user in users"
            :key="user.id"
            class="list-item"
          >
            <div>
              <strong>
                {{ user.displayName || '未命名使用者' }}
              </strong>

              <p>
                {{ user.lineUserId || user.id }}
              </p>

              <small>
                角色：
                {{ user.role || 'user' }}
              </small>
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
  const lineUserId =
    localStorage.getItem('lineUserId')

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

  isAdmin.value =
    userSnap.data().role === 'admin'
}

const loadUsers = async () => {
  const snap = await getDocs(
    collection(db, 'users')
  )

  users.value = snap.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  }))
}

const loadTasks = async () => {
  const snap = await getDocs(
    collection(db, 'tasks')
  )

  tasks.value = snap.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  }))
}

const loadLifeTemplates = async () => {
  const snap = await getDocs(
    collection(db, 'life_templates')
  )

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

  // ⭐ 完全兼容前台格式
  const tasks = templateForm.value.tasksText
    .split('\n')
    .map((text) => text.trim())
    .filter(Boolean)
    .map((text, index) => ({
      id: `task_${index + 1}`,

      // ⭐ 全部都存
      name: text,
      title: text,
      text: text,

      done: false,
      order: index + 1,
    }))

  return {
    title: templateForm.value.title.trim(),
    name: templateForm.value.title.trim(),

    category:
      templateForm.value.category.trim(),

    imageUrl:
      templateForm.value.imageUrl.trim(),

    description:
      templateForm.value.description.trim(),

    // ⭐ 關鍵
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
      doc(
        db,
        'life_templates',
        editingTemplateId.value
      ),
      payload,
      { merge: true }
    )

  } else {

    await addDoc(
      collection(db, 'life_templates'),
      {
        ...payload,

        createdAt: serverTimestamp(),

        isPublic: true,

        source: 'admin',
      }
    )
  }

  resetTemplateForm()

  await loadLifeTemplates()
}

const editLifeTemplate = (item) => {

  editingTemplateId.value = item.id

  templateForm.value = {
    title:
      item.title || item.name || '',

    category:
      item.category || '',

    imageUrl:
      item.imageUrl || '',

    description:
      item.description || '',

    tasksText: Array.isArray(item.tasks)
      ? item.tasks
          .map(
            (task) =>
              task.name ||
              task.title ||
              task.text ||
              ''
          )
          .join('\n')
      : '',
  }

  window.scrollTo({
    top: 0,
    behavior: 'smooth',
  })
}

const deleteLifeTemplate = async (id) => {

  const ok = confirm(
    '確定刪除這個人物套版？'
  )

  if (!ok) return

  await deleteDoc(
    doc(db, 'life_templates', id)
  )

  await loadLifeTemplates()

  if (editingTemplateId.value === id) {
    resetTemplateForm()
  }
}

const setAdmin = async (userId) => {

  await updateDoc(
    doc(db, 'users', userId),
    {
      role: 'admin',
    }
  )

  await loadUsers()
}

const removeAdmin = async (userId) => {

  await updateDoc(
    doc(db, 'users', userId),
    {
      role: 'user',
    }
  )

  await loadUsers()
}

onMounted(async () => {

  try {

    await checkAdmin()

    if (isAdmin.value) {

      await Promise.all([
        loadUsers(),
        loadTasks(),
        loadLifeTemplates(),
      ])
    }

  } catch (err) {

    console.error(err)

  } finally {

    loading.value = false
  }
})
</script>

<style scoped>
.admin-page {
  min-height: 100vh;
  padding: 24px;
  background: #f4f7fb;
}

.admin-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.eyebrow {
  color: #2563eb;
  font-size: 13px;
  font-weight: 700;
}

.subtitle {
  color: #6b7280;
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
  margin-bottom: 20px;
}

.stat-card strong {
  font-size: 30px;
}

.form-grid {
  display: grid;
  gap: 12px;
}

input,
textarea {
  width: 100%;
  padding: 12px;
  border-radius: 14px;
  border: 1px solid #ddd;
  box-sizing: border-box;
}

textarea {
  min-height: 120px;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.list-item {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  align-items: flex-start;
  padding: 14px;
  border-radius: 16px;
  background: #f9fafb;
}

.task-preview {
  margin-top: 10px;
  color: #374151;
  font-size: 14px;
}

.actions,
.row-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.small-btn,
.home-btn {
  border: none;
  padding: 10px 14px;
  border-radius: 12px;
  background: #2563eb;
  color: white;
  font-weight: bold;
}

.danger {
  background: #dc2626;
}

.gray {
  background: #6b7280;
}

.empty {
  color: #6b7280;
}

.denied {
  text-align: center;
}

@media (max-width: 768px) {

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .list-item {
    flex-direction: column;
  }

  .small-btn,
  .home-btn {
    width: 100%;
  }
}
</style>
