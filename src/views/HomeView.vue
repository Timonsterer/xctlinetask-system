<template>
  <div class="home-page">
    <!-- 🔥 當前任務（大顯示） -->
    <div class="current-task">
      <h1>當前任務</h1>

      <div v-if="currentTask" class="task-box">
        <p class="task-content">{{ currentTask.content }}</p>

        <button @click="goNextTask">下一個任務</button>
      </div>

      <div v-else class="empty-task">
        <p>目前沒有任務</p>
        <button @click="goTaskForm">新增任務</button>
      </div>
    </div>

    <!-- 🔥 功能入口 -->
    <div class="menu">
      <button @click="goTaskForm">新增任務</button>
      <button @click="goTaskHistory">任務紀錄</button>
      <button @click="goIdleForm">我很閒</button>
      <button @click="goIdleMarket">我很閒市場</button>
      <button @click="goContacts">聯絡人</button>
      <button @click="goLifeTemplates">人物套版</button>

      <!-- ✅ 新增 -->
      <button class="pocket" @click="goPocketPlaces">
        口袋名單
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// 🔥 假資料（之後你可以接 firestore）
const currentTask = ref(null)

// ===== 導頁 =====
const goTaskForm = () => router.push('/task-form')
const goTaskHistory = () => router.push('/task-history')
const goIdleForm = () => router.push('/idle-form')
const goIdleMarket = () => router.push('/idle-market')
const goContacts = () => router.push('/contacts')
const goLifeTemplates = () => router.push('/life-templates')

// ✅ 新增
const goPocketPlaces = () => router.push('/pocket-places')

// ===== 任務流程 =====
const goNextTask = () => {
  // 這裡之後可以接你的任務邏輯
  currentTask.value = null
}

onMounted(() => {
  // 這裡之後接 Firestore 當前任務
  currentTask.value = null
})
</script>

<style scoped>
.home-page {
  max-width: 720px;
  margin: 0 auto;
  padding: 20px;
}

/* 🔥 當前任務 */
.current-task {
  margin-bottom: 30px;
}

.current-task h1 {
  font-size: 28px;
  margin-bottom: 16px;
}

.task-box {
  background: #111;
  color: white;
  padding: 24px;
  border-radius: 16px;
}

.task-content {
  font-size: 22px;
  margin-bottom: 16px;
}

.empty-task {
  background: #f3f4f6;
  padding: 20px;
  border-radius: 12px;
}

/* 🔥 功能區 */
.menu {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

button {
  flex: 1 1 45%;
  padding: 14px;
  border: none;
  border-radius: 12px;
  background: #2563eb;
  color: white;
  font-size: 16px;
  cursor: pointer;
}

button:hover {
  opacity: 0.9;
}

/* ✅ 口袋名單強調 */
.pocket {
  background: #059669;
}
</style>
