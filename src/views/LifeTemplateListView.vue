<template>
  <div class="life-template-page">
    <header class="page-header">
      <h1>人物生活套版</h1>
      <p>選一個角色，直接套用成你的任務節奏</p>
    </header>

    <div class="grid">
      <div
        v-for="item in templates"
        :key="item.id"
        class="card"
        @click="goDetail(item.id)"
      >
        <div class="cover">
          <img v-if="item.cover" :src="item.cover" />
          <div v-else class="placeholder">
            {{ item.name.slice(0, 1) }}
          </div>
        </div>

        <div class="content">
          <div class="title-row">
            <h2>{{ item.name }}</h2>
            <span class="type">{{ typeLabel(item.type) }}</span>
          </div>

          <p class="summary">
            {{ item.summary }}
          </p>

          <div class="tags">
            <span v-for="tag in item.tags" :key="tag">
              #{{ tag }}
            </span>
          </div>

          <button class="apply-btn" @click.stop="quickApply(item)">
            ⚡ 一鍵直接套用
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { addDoc, collection, serverTimestamp, Timestamp } from 'firebase/firestore'
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
    actions: ['重訓', '高蛋白飲食', '記錄體重']
  },
  {
    id: 'elon-musk',
    name: 'Elon Musk',
    type: 'business',
    summary: '高強度工作流，專注輸出',
    tags: ['創業', '效率'],
    dailyFlow: ['規劃任務', '執行', '檢查'],
    actions: ['只做最重要的事', '加速決策']
  },
  {
    id: 'study',
    name: '高效學習者',
    type: 'study',
    summary: '專注＋複盤型學習',
    tags: ['學習'],
    dailyFlow: ['讀書', '測驗', '複盤'],
    actions: ['做筆記', '檢查錯誤']
  }
]

function getUserId() {
  return localStorage.getItem('lineUserId')
}

function goDetail(id) {
  router.push(`/life-templates/${id}`)
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
    tasks.map((t, i) => {
      const s = getStart(i)
      const e = getEnd(s)

      return addDoc(collection(db, 'tasks'), {
        userId,
        title: t,
        template: item.name,

        startAt: Timestamp.fromDate(s),
        endAt: Timestamp.fromDate(e),

        isCurrent: i === 0,
        status: 'pending',

        createdAt: serverTimestamp()
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
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.card {
  background: white;
  border-radius: 16px;
  overflow: hidden;
  cursor: pointer;
  box-shadow: 0 6px 16px rgba(0,0,0,0.1);
}

.cover {
  height: 140px;
  background: #eee;
}

.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  font-size: 40px;
}

.content {
  padding: 14px;
}

.title-row {
  display: flex;
  justify-content: space-between;
}

.summary {
  font-size: 14px;
  color: #666;
}

.tags span {
  margin-right: 6px;
  font-size: 12px;
}

.apply-btn {
  margin-top: 10px;
  width: 100%;
  padding: 10px;
  border: none;
  background: #2563eb;
  color: white;
  border-radius: 10px;
}
</style>
