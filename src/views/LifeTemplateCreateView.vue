<template>
  <div class="page life-create-page">
    <section class="card">
      <div class="page-header">
        <div>
          <p class="eyebrow">CREATE</p>
          <h1 class="title">打造自己套版</h1>
          <p class="sub">建立自己的生活流程，之後可以一鍵套用。</p>
        </div>

        <button class="btn btn-small btn-secondary" @click="goBack">
          返回
        </button>
      </div>

      <label>套版名稱</label>
      <input v-model.trim="form.title" placeholder="例如：我的高效工作日" />

      <label>分類</label>
      <input v-model.trim="form.category" placeholder="例如：工作 / 健身 / 學習" />

      <label>套版介紹</label>
      <textarea v-model.trim="form.description" rows="3" placeholder="說明這套流程適合什麼情境" />

      <div class="section-head">
        <h2>任務內容</h2>
        <button class="btn btn-small btn-blue" type="button" @click="addTask">
          ＋ 新增任務
        </button>
      </div>

      <div
        v-for="(task, index) in form.tasks"
        :key="index"
        class="card-soft task-box"
      >
        <label>任務 {{ index + 1 }}</label>
        <input v-model.trim="task.title" placeholder="例如：整理今日目標" />

        <label>時間長度（分鐘）</label>
        <input v-model.number="task.durationMinutes" type="number" min="15" step="15" />

        <button
          v-if="form.tasks.length > 1"
          class="btn btn-red"
          type="button"
          @click="removeTask(index)"
        >
          刪除這個任務
        </button>
      </div>

      <label class="switch-row">
        <input v-model="form.isShared" type="checkbox" />
        <span>
          <strong>公開分享這個套版</strong>
          <small>其他人可以看到並套用你的套版。</small>
        </span>
      </label>

      <div class="actions">
        <button class="btn" :disabled="saving" @click="saveTemplate">
          {{ saving ? '建立中...' : '建立套版' }}
        </button>

        <button class="btn btn-secondary" @click="goBack">
          取消
        </button>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  addDoc,
  collection,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/firebase'

const router = useRouter()
const saving = ref(false)

const form = ref({
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

function getUserId() {
  return (
    localStorage.getItem('lineUserId') ||
    localStorage.getItem('userId') ||
    localStorage.getItem('line_user_id') ||
    ''
  )
}

function addTask() {
  form.value.tasks.push({
    title: '',
    durationMinutes: 90,
  })
}

function removeTask(index) {
  form.value.tasks.splice(index, 1)
}

async function saveTemplate() {
  const userId = getUserId()

  if (!userId) {
    router.push('/bind')
    return
  }

  if (!form.value.title) {
    alert('請輸入套版名稱')
    return
  }

  const cleanTasks = form.value.tasks
    .filter((task) => task.title)
    .map((task) => ({
      title: task.title,
      name: task.title,
      durationMinutes: Number(task.durationMinutes || 90),
    }))

  if (cleanTasks.length === 0) {
    alert('請至少新增一個任務')
    return
  }

  saving.value = true

  try {
    const docRef = await addDoc(collection(db, 'life_templates'), {
      title: form.value.title,
      name: form.value.title,
      category: form.value.category || '自訂套版',
      description: form.value.description,
      tasks: cleanTasks,

      ownerId: userId,
      userId,

      isCustom: true,
      isShared: form.value.isShared,
      visibility: form.value.isShared ? 'public' : 'private',

      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    alert('已建立自己的套版')
    router.push(`/life-templates/${docRef.id}`)
  } catch (err) {
    console.error(err)
    alert('建立失敗')
  } finally {
    saving.value = false
  }
}

function goBack() {
  router.push('/life-templates')
}
</script>

<style scoped>
.life-create-page {
  max-width: 760px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 20px;
}

.eyebrow {
  margin: 0 0 6px;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 2px;
  color: #9b7b00;
}

.section-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin: 18px 0 12px;
}

.section-head h2 {
  margin: 0;
  font-size: 22px;
  font-weight: 900;
}

.task-box {
  margin-bottom: 14px;
}

.switch-row {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  background: #fff8e8;
  border: 2px solid #1e1e1e;
  border-radius: 18px;
  padding: 14px;
  margin: 16px 0;
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

@media (max-width: 700px) {
  .life-create-page {
    max-width: 100%;
  }

  .page-header,
  .section-head {
    flex-direction: column;
  }

  .page-header button,
  .section-head button {
    width: 100%;
  }
}
</style>
