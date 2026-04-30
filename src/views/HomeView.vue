<template>
  <div class="home-page">
    <section class="hero-card">
      <div class="hero-top">
        <div>
          <p class="eyebrow">TODAY</p>
          <h1>當前任務</h1>
        </div>

        <button class="icon-btn" @click="goTaskForm">
          ＋
        </button>
      </div>

      <div v-if="currentTask" class="current-box">
        <p class="task-label">現在要做</p>
        <h2>{{ currentTask.content }}</h2>

        <button class="main-btn" @click="goNextTask">
          完成，下一個任務
        </button>
      </div>

      <div v-else class="empty-box">
        <div class="empty-icon">✓</div>
        <h2>目前沒有任務</h2>
        <p>先新增一個任務，讓今天不要空轉。</p>

        <button class="main-btn" @click="goTaskForm">
          新增任務
        </button>
      </div>
    </section>

    <section class="quick-section">
      <h3>快速功能</h3>

      <div class="grid">
        <button class="menu-card blue" @click="goTaskForm">
          <span class="emoji">＋</span>
          <strong>新增任務</strong>
          <small>安排下一件事</small>
        </button>

        <button class="menu-card purple" @click="goTaskHistory">
          <span class="emoji">📋</span>
          <strong>任務紀錄</strong>
          <small>查看完成紀錄</small>
        </button>

        <button class="menu-card green" @click="goPocketPlaces">
          <span class="emoji">📍</span>
          <strong>口袋名單</strong>
          <small>收藏地點導航</small>
        </button>

        <button class="menu-card orange" @click="goIdleForm">
          <span class="emoji">🙋</span>
          <strong>我很閒</strong>
          <small>發布可約狀態</small>
        </button>

        <button class="menu-card teal" @click="goIdleMarket">
          <span class="emoji">🧑‍🤝‍🧑</span>
          <strong>我很閒市場</strong>
          <small>看看誰有空</small>
        </button>

        <button class="menu-card gray" @click="goContacts">
          <span class="emoji">☎️</span>
          <strong>聯絡人</strong>
          <small>客戶與朋友資料</small>
        </button>

        <button class="menu-card pink" @click="goLifeTemplates">
          <span class="emoji">🔥</span>
          <strong>人物套版</strong>
          <small>模仿高手生活</small>
        </button>

        <button class="menu-card dark" @click="goRaid">
          <span class="emoji">⚔️</span>
          <strong>多人副本</strong>
          <small>一起完成任務</small>
        </button>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const currentTask = ref(null)

const goTaskForm = () => router.push('/task-form')
const goTaskHistory = () => router.push('/task-history')
const goIdleForm = () => router.push('/idle-form')
const goIdleMarket = () => router.push('/idle-market')
const goContacts = () => router.push('/contacts')
const goLifeTemplates = () => router.push('/life-templates')
const goPocketPlaces = () => router.push('/pocket-places')
const goRaid = () => router.push('/raid')

const goNextTask = () => {
  currentTask.value = null
}

onMounted(() => {
  currentTask.value = null
})
</script>

<style scoped>
.home-page {
  min-height: 100vh;
  padding: 22px;
  background:
    radial-gradient(circle at top left, #dbeafe 0, transparent 32%),
    linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%);
  box-sizing: border-box;
}

.hero-card {
  max-width: 760px;
  margin: 0 auto 22px;
  padding: 24px;
  border-radius: 28px;
  background: linear-gradient(135deg, #111827, #1e3a8a);
  color: white;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.25);
}

.hero-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.eyebrow {
  margin: 0 0 4px;
  font-size: 12px;
  letter-spacing: 2px;
  color: #bfdbfe;
}

h1 {
  margin: 0;
  font-size: 32px;
  font-weight: 900;
}

.icon-btn {
  width: 48px;
  height: 48px;
  border: none;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.16);
  color: white;
  font-size: 28px;
  cursor: pointer;
}

.current-box,
.empty-box {
  margin-top: 26px;
  padding: 22px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(10px);
}

.task-label {
  margin: 0 0 8px;
  color: #bfdbfe;
  font-size: 14px;
}

.current-box h2,
.empty-box h2 {
  margin: 0 0 16px;
  font-size: 26px;
  line-height: 1.35;
}

.empty-box p {
  margin: -6px 0 18px;
  color: #dbeafe;
}

.empty-icon {
  width: 52px;
  height: 52px;
  margin-bottom: 14px;
  display: grid;
  place-items: center;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.18);
  font-size: 26px;
}

.main-btn {
  width: 100%;
  padding: 15px;
  border: none;
  border-radius: 16px;
  background: white;
  color: #1e3a8a;
  font-size: 16px;
  font-weight: 800;
  cursor: pointer;
}

.quick-section {
  max-width: 760px;
  margin: 0 auto;
}

.quick-section h3 {
  margin: 0 0 14px;
  font-size: 20px;
  color: #111827;
}

.grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.menu-card {
  min-height: 116px;
  padding: 16px;
  border: none;
  border-radius: 22px;
  text-align: left;
  color: white;
  cursor: pointer;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.12);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.menu-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 14px 30px rgba(15, 23, 42, 0.18);
}

.emoji {
  display: block;
  font-size: 28px;
  margin-bottom: 12px;
}

.menu-card strong {
  display: block;
  font-size: 17px;
  margin-bottom: 5px;
}

.menu-card small {
  display: block;
  font-size: 13px;
  opacity: 0.85;
}

.blue {
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
}

.purple {
  background: linear-gradient(135deg, #7c3aed, #5b21b6);
}

.green {
  background: linear-gradient(135deg, #059669, #047857);
}

.orange {
  background: linear-gradient(135deg, #f97316, #c2410c);
}

.teal {
  background: linear-gradient(135deg, #0d9488, #0f766e);
}

.gray {
  background: linear-gradient(135deg, #475569, #334155);
}

.pink {
  background: linear-gradient(135deg, #db2777, #be185d);
}

.dark {
  background: linear-gradient(135deg, #111827, #020617);
}

@media (max-width: 480px) {
  .home-page {
    padding: 16px;
  }

  .hero-card {
    padding: 20px;
    border-radius: 24px;
  }

  h1 {
    font-size: 28px;
  }

  .grid {
    grid-template-columns: 1fr;
  }

  .menu-card {
    min-height: 100px;
  }
}
</style>
