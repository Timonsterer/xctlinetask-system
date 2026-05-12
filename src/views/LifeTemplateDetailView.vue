<template>
  <div class="page life-template-detail-page">
    <div v-if="loading" class="card-soft empty">
      讀取中...
    </div>

    <div v-else-if="!templateData" class="card-soft empty">
      找不到人物套版
    </div>

    <div v-else>
      <section class="card hero">
        <img
          v-if="templateData.imageUrl"
          :src="templateData.imageUrl"
          class="hero-image"
          alt="套版圖片"
        />

        <div class="hero-content">
          <div class="hero-top">
            <div>
              <p class="eyebrow">LIFE TEMPLATE</p>

              <h1 class="title">
                {{ templateData.title || templateData.name }}
              </h1>

              <p class="sub hero-desc">
                {{ templateData.description || '尚無介紹' }}
              </p>
            </div>

            <span class="badge badge-yellow">
              {{ templateData.category || '人物套版' }}
            </span>
          </div>

          <div class="action-grid">
            <button class="btn btn-green action-btn" :disabled="applying" @click="applyTemplate">
              <span>{{ applying ? '套用中' : '套用' }}</span>
              <small>安排任務</small>
            </button>

            <button class="btn btn-blue action-btn" @click="openCreateModal">
              <span>打造</span>
              <small>自己套版</small>
            </button>

            <button class="btn btn-purple action-btn" @click="copyAsMyTemplate">
              <span>複製</span>
              <small>改成我的</small>
            </button>

            <button class="btn btn-yellow action-btn" @click="shareTemplate">
              <span>分享</span>
              <small>公開套版</small>
            </button>

            <button class="btn btn-secondary action-btn" @click="goBack">
              <span>返回</span>
              <small>套版列表</small>
            </button>

            <button class="btn btn-red action-btn" @click="goTaskHistory">
              <span>紀錄</span>
              <small>週排程</small>
            </button>
          </div>
        </div>
      </section>

      <section class="stats-grid">
        <div class="card stat-card">
          <span>任務數</span>
          <strong>{{ templateTasks.length }}</strong>
        </div>

        <div class="card stat-card">
          <span>預估時間</span>
          <strong>{{ totalHours }}</strong>
        </div>

        <div class="card stat-card">
          <span>狀態</span>
          <strong>{{ templateData.isShared ? '公開' : '私人' }}</strong>
        </div>
      </section>

      <section class="card task-section">
        <div class="section-head">
          <div>
            <h2>人物任務內容</h2>
            <p class="sub">套用時會自動避開你已經有任務的時間，最多安排 5 個任務。</p>
          </div>

          <button class="btn btn-small" @click="openCreateModal">
            ＋ 自訂套版
          </button>
        </div>

        <div v-if="templateTasks.length === 0" class="empty">
          尚無任務
        </div>

        <div v-else class="task-list">
          <div
            v-for="(task, index) in templateTasks"
            :key="index"
            class="list-item task-item"
          >
            <div class="task-index">
              {{ index + 1 }}
            </div>

            <div>
              <h3>
                {{ task.name || task.title || task.text || '未命名任務' }}
              </h3>

              <p v-if="task.note || task.description" class="task-note">
                {{ task.note || task.description }}
              </p>

              <div class="task-meta">
                <span class="badge badge-blue">
                  {{ task.durationMinutes || 90 }} 分鐘
                </span>

                <span v-if="task.period" class="badge badge-green">
                  {{ task.period }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>

    <div v-if="showCreateModal" class="modal">
      <div class="card modal-card">
        <div class="modal-header">
          <div>
            <p class="eyebrow">CREATE</p>
            <h2>打造自己的套版</h2>
            <p class="sub">建立你自己的生活模式，之後可以一鍵套用。</p>
          </div>

          <button class="btn btn-small btn-secondary close-btn" @click="closeCreateModal">
            ×
          </button>
        </div>

        <label>套版名稱</label>
        <input v-model.trim="customForm.title" placeholder="例如：我的高效工作日" />

        <label>分類</label>
        <input v-model.trim="customForm.category" placeholder="例如：工作 / 健身 / 業務 / 學習" />

        <label>套版介紹</label>
        <textarea
          v-model.trim="customForm.description"
          rows="3"
          placeholder="簡單說明這套生活模式適合什麼情境"
        />

        <div class="custom-task-head">
          <h3>任務內容</h3>

          <button class="btn btn-small btn-blue" type="button" @click="addCustomTask">
            ＋ 加一個
          </button>
        </div>

        <div
          v-for="(task, index) in customForm.tasks"
          :key="index"
          class="custom-task-card"
        >
          <label>任務 {{ index + 1 }}</label>

          <input
            v-model.trim="task.title"
            placeholder="例如：整理今日目標"
          />

          <div class="mini-row">
            <input
              v-model.number="task.durationMinutes"
              type="number"
              min="15"
              step="15"
              placeholder="分鐘"
            />

            <button
              class="btn btn-red"
              type="button"
              @click="removeCustomTask(index)"
            >
              刪除
            </button>
          </div>
        </div>

        <label class="switch-row">
          <input v-model="customForm.isShared" type="checkbox" />
          <span>
            <strong>建立後公開分享</strong>
            <small>其他人可以看到並套用你的套版。</small>
          </span>
        </label>

        <div class="modal-actions">
          <button class="btn" :disabled="savingCustom" @click="saveCustomTemplate">
            {{ savingCustom ? '儲存中...' : '建立套版' }}
          </button>

          <button class="btn btn-secondary" @click="closeCreateModal">
            取消
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import {
  ref,
  computed,
  onMounted,
} from 'vue'

import {
  useRoute,
  useRouter,
} from 'vue-router'

import {
  doc,
  getDoc,
  collection,
  getDocs,
  addDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore'

import { db } from '@/firebase'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const applying = ref(false)
const savingCustom = ref(false)
const showCreateModal = ref(false)

const templateData = ref(null)

const customForm = ref({
  title: '',
  category: '',
  description: '',
  isShared: false,
  tasks: [
    {
      title: '',
      durationMinutes: 90,
    },
  ],
})

const templateTasks = computed(() => {
  if (!templateData.value) return []
  return templateData.value.tasks || []
})

const totalHours = computed(() => {
  const minutes = templateTasks.value.reduce((sum, task) => {
    return sum + Number(task.durationMinutes || 90)
  }, 0)

  const hour = Math.round((minutes / 60) * 10) / 10

  return `${hour}h`
})

const getUserId = () => {
  return (
    localStorage.getItem('lineUserId') ||
    localStorage.getItem('userId') ||
    localStorage.getItem('line_user_id') ||
    ''
  )
}

const loadTemplate = async () => {
  try {
    const id = route.params.id

    const refDoc = doc(db, 'life_templates', id)
    const snap = await getDoc(refDoc)

    if (!snap.exists()) {
      templateData.value = null
      return
    }

    templateData.value = {
      id: snap.id,
      ...snap.data(),
    }
  } catch (err) {
    console.error(err)
    alert('讀取套版失敗')
  } finally {
    loading.value = false
  }
}

const toMinutes = (timeStr) => {
  if (!timeStr) return 0

  const [h, m] = timeStr
    .split(':')
    .map(Number)

  return h * 60 + m
}

const toTimeString = (minutes) => {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60

  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

const todayAtMinutes = (minutes) => {
  const date = new Date()
  date.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0)
  return date
}

const findAvailableSlots = (existingTasks) => {
  const maxTasks = 5
  const duration = 90
  const startDay = 8 * 60
  const endDay = 23 * 60

  const occupied = existingTasks
    .filter((task) => task.startTime && task.endTime)
    .map((task) => ({
      start: toMinutes(task.startTime),
      end: toMinutes(task.endTime),
    }))
    .sort((a, b) => a.start - b.start)

  const slots = []
  let cursor = startDay

  for (const item of occupied) {
    if (item.start - cursor >= duration) {
      slots.push({
        start: cursor,
        end: cursor + duration,
      })
    }

    cursor = Math.max(cursor, item.end)
  }

  while (
    endDay - cursor >= duration &&
    slots.length < maxTasks
  ) {
    slots.push({
      start: cursor,
      end: cursor + duration,
    })

    cursor += duration
  }

  return slots.slice(0, maxTasks)
}

const applyTemplate = async () => {
  try {
    applying.value = true

    const lineUserId = getUserId()

    if (!lineUserId) {
      alert('尚未登入')
      return
    }

    const taskSnap = await getDocs(collection(db, 'tasks'))

    const myTasks = taskSnap.docs
      .map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }))
      .filter((task) => {
        return (
          task.userId === lineUserId ||
          task.ownerId === lineUserId
        )
      })

    const availableSlots = findAvailableSlots(myTasks)

    if (availableSlots.length === 0) {
      alert('今天已無空白時段')
      return
    }

    const tasksToInsert = templateTasks.value.slice(0, availableSlots.length)

    for (let i = 0; i < tasksToInsert.length; i++) {
      const task = tasksToInsert[i]
      const slot = availableSlots[i]

      await addDoc(collection(db, 'tasks'), {
        title:
          task.name ||
          task.title ||
          task.text ||
          `人物任務 ${i + 1}`,

        note:
          task.note ||
          task.description ||
          `來自人物套版：${templateData.value.title || templateData.value.name}`,

        description:
          `來自人物套版：${templateData.value.title || templateData.value.name}`,

        userId: lineUserId,
        ownerId: lineUserId,

        status: 'pending',
        type: 'life_template',

        templateId: templateData.value.id,
        templateName: templateData.value.title || templateData.value.name,

        autoScheduled: true,

        startTime: toTimeString(slot.start),
        endTime: toTimeString(slot.end),

        startAt: todayAtMinutes(slot.start),
        endAt: todayAtMinutes(slot.end),

        durationMinutes: task.durationMinutes || 90,

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    }

    alert(`已自動安排 ${tasksToInsert.length} 個人物任務`)
    router.push('/task-history')
  } catch (err) {
    console.error(err)
    alert('套用失敗')
  } finally {
    applying.value = false
  }
}

const openCreateModal = () => {
  customForm.value = {
    title: '',
    category: '',
    description: '',
    isShared: false,
    tasks: [
      {
        title: '',
        durationMinutes: 90,
      },
    ],
  }

  showCreateModal.value = true
}

const closeCreateModal = () => {
  showCreateModal.value = false
}

const addCustomTask = () => {
  customForm.value.tasks.push({
    title: '',
    durationMinutes: 90,
  })
}

const removeCustomTask = (index) => {
  if (customForm.value.tasks.length <= 1) {
    alert('至少保留一個任務')
    return
  }

  customForm.value.tasks.splice(index, 1)
}

const saveCustomTemplate = async () => {
  const userId = getUserId()

  if (!userId) {
    alert('尚未登入')
    return
  }

  if (!customForm.value.title.trim()) {
    alert('請輸入套版名稱')
    return
  }

  const cleanTasks = customForm.value.tasks
    .filter((task) => task.title.trim())
    .map((task) => ({
      title: task.title.trim(),
      name: task.title.trim(),
      durationMinutes: Number(task.durationMinutes || 90),
    }))

  if (cleanTasks.length === 0) {
    alert('請至少輸入一個任務')
    return
  }

  savingCustom.value = true

  try {
    const docRef = await addDoc(collection(db, 'life_templates'), {
      title: customForm.value.title.trim(),
      name: customForm.value.title.trim(),
      category: customForm.value.category.trim() || '自訂套版',
      description: customForm.value.description.trim(),
      tasks: cleanTasks,

      ownerId: userId,
      userId,
      isCustom: true,
      isShared: !!customForm.value.isShared,
      visibility: customForm.value.isShared ? 'public' : 'private',

      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    alert('已建立自己的套版')
    showCreateModal.value = false
    router.push(`/life-templates/${docRef.id}`)
  } catch (err) {
    console.error(err)
    alert('建立失敗')
  } finally {
    savingCustom.value = false
  }
}

const copyAsMyTemplate = async () => {
  const userId = getUserId()

  if (!userId) {
    alert('尚未登入')
    return
  }

  try {
    const docRef = await addDoc(collection(db, 'life_templates'), {
      title: `${templateData.value.title || templateData.value.name}｜我的版本`,
      name: `${templateData.value.title || templateData.value.name}｜我的版本`,
      category: templateData.value.category || '自訂套版',
      description: templateData.value.description || '',
      imageUrl: templateData.value.imageUrl || '',
      tasks: templateTasks.value,

      ownerId: userId,
      userId,
      isCustom: true,
      isShared: false,
      visibility: 'private',
      copiedFrom: templateData.value.id,

      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    alert('已複製成你的套版')
    router.push(`/life-templates/${docRef.id}`)
  } catch (err) {
    console.error(err)
    alert('複製失敗')
  }
}

const shareTemplate = async () => {
  try {
    await updateDoc(doc(db, 'life_templates', templateData.value.id), {
      isShared: true,
      visibility: 'public',
      sharedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    templateData.value.isShared = true
    templateData.value.visibility = 'public'

    const shareText =
      `${templateData.value.title || templateData.value.name}\n` +
      `${templateData.value.description || ''}`

    if (navigator.share) {
      await navigator.share({
        title: templateData.value.title || templateData.value.name,
        text: shareText,
      })
    } else {
      await navigator.clipboard.writeText(shareText)
      alert('已公開套版，並複製分享文字')
    }
  } catch (err) {
    console.error(err)
    alert('分享失敗')
  }
}

const goBack = () => {
  router.push('/life-templates')
}

const goTaskHistory = () => {
  router.push('/task-history')
}

onMounted(() => {
  loadTemplate()
})
</script>

<style scoped>
.life-template-detail-page {
  max-width: 920px;
  margin: 0 auto;
}

.hero {
  padding: 0;
  overflow: hidden;
}

.hero-image {
  width: 100%;
  height: 260px;
  object-fit: cover;
  display: block;
  border-bottom: 2px solid #1e1e1e;
}

.hero-content {
  padding: 20px;
}

.hero-top {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  align-items: flex-start;
}

.eyebrow {
  margin: 0 0 6px;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 2px;
  color: #9b7b00;
}

.hero-desc {
  line-height: 1.7;
  margin-bottom: 0;
}

.action-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-top: 18px;
}

.action-btn {
  min-height: 72px;
  padding: 10px 6px;
  display: flex;
  flex-direction: column;
  gap: 3px;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.action-btn span {
  font-size: 15px;
  font-weight: 900;
}

.action-btn small {
  font-size: 12px;
  font-weight: 800;
  color: #333;
}

.btn-yellow {
  background: var(--primary);
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
  font-size: 28px;
  font-weight: 900;
}

.task-section h2 {
  margin: 0;
  font-size: 22px;
  font-weight: 900;
}

.section-head {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  align-items: flex-start;
  margin-bottom: 16px;
}

.task-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.task-item {
  display: grid;
  grid-template-columns: 44px 1fr;
  gap: 12px;
}

.task-index {
  width: 36px;
  height: 36px;
  background: #fff1a8;
  border: 2px solid #1e1e1e;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 900;
}

.task-item h3 {
  margin: 0;
  font-size: 17px;
  font-weight: 900;
}

.task-note {
  margin: 8px 0 0;
  color: #555;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.6;
}

.task-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.modal {
  position: fixed;
  inset: 0;
  z-index: 999;
  padding: 18px;
  background: rgba(30, 30, 30, 0.45);
  display: flex;
  justify-content: center;
  align-items: center;
}

.modal-card {
  width: 100%;
  max-width: 560px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  align-items: flex-start;
  margin-bottom: 16px;
}

.modal-header h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 900;
}

.close-btn {
  width: 44px;
  height: 44px;
  padding: 0;
  flex: 0 0 44px;
}

.custom-task-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

.custom-task-head h3 {
  font-size: 18px;
  font-weight: 900;
}

.custom-task-card {
  background: #fff8e8;
  border: 2px solid #1e1e1e;
  border-radius: 18px;
  padding: 14px;
  margin-bottom: 12px;
}

.mini-row {
  display: grid;
  grid-template-columns: 1fr 90px;
  gap: 10px;
}

.switch-row {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  background: #fff8e8;
  border: 2px solid #1e1e1e;
  border-radius: 18px;
  padding: 14px;
  margin: 12px 0;
}

.switch-row input {
  width: 22px;
  height: 22px;
  flex: 0 0 22px;
  margin: 2px 0 0;
  padding: 0;
  accent-color: #ffd84d;
}

.switch-row span {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.switch-row strong {
  font-size: 15px;
  font-weight: 900;
}

.switch-row small {
  color: #666;
  font-size: 13px;
  font-weight: 700;
}

.modal-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 700px) {
  .life-template-detail-page {
    max-width: 100%;
  }

  .hero-top,
  .section-head {
    flex-direction: column;
  }

  .action-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
  }

  .action-btn {
    min-height: 66px;
    padding: 8px 4px;
  }

  .action-btn span {
    font-size: 14px;
  }

  .action-btn small {
    font-size: 11px;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .modal-actions {
    grid-template-columns: 1fr;
  }
}
</style>
