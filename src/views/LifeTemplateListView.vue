<template>
  <div class="page life-template-page">
    <header class="card page-header">
      <div>
        <p class="eyebrow">LIFE TEMPLATE</p>
        <h1 class="title">人物生活套版</h1>
        <p class="sub">選一個角色，直接套用成你的任務節奏。</p>
      </div>

      <button class="btn btn-small" type="button" @click="goCreateTemplate">
        ＋ 打造自己套版
      </button>
    </header>

    <section class="card-soft create-banner" @click="goCreateTemplate">
      <div class="banner-icon">＋</div>

      <div>
        <h2>打造自己的生活套版</h2>
        <p>建立你自己的工作、健身、學習或業務流程，之後可以一鍵套用。</p>
      </div>
    </section>

    <section class="template-grid">
      <div
        v-for="item in templates"
        :key="item.id"
        class="card template-card"
        @click="goDetail(item.id)"
      >
        <div class="cover">
          <img v-if="item.cover" :src="item.cover" alt="套版圖片" />

          <div v-else class="placeholder">
            {{ item.name.slice(0, 1) }}
          </div>
        </div>

        <div class="content">
          <div class="title-row">
            <h2>{{ item.name }}</h2>

            <span class="badge badge-yellow">
              {{ typeLabel(item.type) }}
            </span>
          </div>

          <p class="summary">
            {{ item.summary }}
          </p>

          <div class="tags">
            <span
              v-for="tag in item.tags"
              :key="tag"
              class="badge badge-blue"
            >
              #{{ tag }}
            </span>
          </div>

          <div class="action-grid">
            <button class="btn btn-green action-btn" @click.stop="quickApply(item)">
              <span>套用</span>
              <small>一鍵安排</small>
            </button>

            <button class="btn btn-blue action-btn" @click.stop="goDetail(item.id)">
              <span>查看</span>
              <small>任務內容</small>
            </button>

            <button class="btn btn-purple action-btn" @click.stop="goCreateTemplate">
              <span>打造</span>
              <small>自己套版</small>
            </button>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import {
  addDoc,
  collection,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { db } from '@/firebase'

const router = useRouter()

const templates = [
  {
    id: 'peng-yuyan',
    name: '彭于晏',
    type: 'fitness',
    summary: '高自律訓練型，控制飲食＋規律運動',
    tags: ['健身', '自律'],
    dailyFlow: ['起床', '運動', '飲食控制', '早睡'],
    actions: ['重訓', '高蛋白飲食', '記錄體重'],
  },
  {
    id: 'elon-musk',
    name: 'Elon Musk',
    type: 'business',
    summary: '高強度工作流，專注輸出',
    tags: ['創業', '效率'],
    dailyFlow: ['規劃任務', '執行', '檢查'],
    actions: ['只做最重要的事', '加速決策'],
  },
  {
    id: 'study',
    name: '高效學習者',
    type: 'study',
    summary: '專注＋複盤型學習',
    tags: ['學習'],
    dailyFlow: ['讀書', '測驗', '複盤'],
    actions: ['做筆記', '檢查錯誤'],
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

function goDetail(id) {
  router.push(`/life-templates/${id}`)
}

function goCreateTemplate() {
  router.push('/life-templates/create')
}

function getStart(index) {
  const d = new Date()
  d.setMinutes(d.getMinutes() + index * 30)
  return d
}

function getEnd(start) {
  return new Date(start.getTime() + 30 * 60000)
}

async function quickApply(item) {
  const userId = getUserId()

  if (!userId) {
    router.push('/bind')
    return
  }

  const tasks = [...item.dailyFlow, ...item.actions]

  await Promise.all(
    tasks.map((taskTitle, index) => {
      const start = getStart(index)
      const end = getEnd(start)

      return addDoc(collection(db, 'tasks'), {
        userId,
        ownerId: userId,

        title: taskTitle,
        note: `來自人物套版：${item.name}`,
        template: item.name,
        templateId: item.id,

        type: 'life_template',
        status: 'pending',

        startAt: Timestamp.fromDate(start),
        endAt: Timestamp.fromDate(end),

        isCurrent: index === 0,

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    })
  )

  router.push('/home')
}

function typeLabel(type) {
  if (type === 'fitness') return '健身'
  if (type === 'business') return '事業'
  if (type === 'study') return '學習'
  return '其他'
}
</script>

<style scoped>
.life-template-page {
  max-width: 920px;
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

.create-banner {
  display: flex;
  gap: 16px;
  align-items: center;
  cursor: pointer;
}

.banner-icon {
  width: 58px;
  height: 58px;
  flex: 0 0 58px;

  display: flex;
  align-items: center;
  justify-content: center;

  background: #ffd84d;
  border: 2px solid #1e1e1e;
  border-radius: 18px;

  font-size: 28px;
  font-weight: 900;

  box-shadow: 0 5px 0 #1e1e1e;
}

.create-banner h2 {
  margin: 0 0 6px;
  font-size: 22px;
  font-weight: 900;
}

.create-banner p {
  margin: 0;
  color: #666;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.6;
}

.template-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.template-card {
  overflow: hidden;
  padding: 0;
  cursor: pointer;
}

.cover {
  height: 150px;
  background: #fff1a8;
  border-bottom: 2px solid #1e1e1e;
}

.cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.placeholder {
  height: 100%;

  display: flex;
  align-items: center;
  justify-content: center;

  font-size: 46px;
  font-weight: 900;
}

.content {
  padding: 16px;
}

.title-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
}

.title-row h2 {
  margin: 0;
  font-size: 22px;
  font-weight: 900;
}

.summary {
  margin: 12px 0;
  color: #555;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.7;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.action-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin-top: 16px;
}

.action-btn {
  min-height: 66px;
  padding: 8px 4px;

  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;

  text-align: center;
}

.action-btn span {
  font-size: 14px;
  font-weight: 900;
}

.action-btn small {
  font-size: 11px;
  font-weight: 800;
  color: #333;
}

@media (max-width: 700px) {
  .life-template-page {
    max-width: 100%;
  }

  .page-header {
    flex-direction: column;
  }

  .page-header button {
    width: 100%;
  }

  .create-banner {
    align-items: flex-start;
  }

  .template-grid {
    grid-template-columns: 1fr;
  }

  .action-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
