<template>
  <div class="life-template-detail-page">
    <header class="page-header">
      <button class="back-btn" @click="goBack">返回列表</button>
    </header>

    <section v-if="!templateData" class="state-box">
      找不到此套版
    </section>

    <section v-else class="detail-card">
      <div class="hero-section">
        <div class="cover-wrap">
          <img
            v-if="templateData.cover"
            :src="templateData.cover"
            :alt="templateData.name"
            class="cover-img"
          />
          <div v-else class="cover-placeholder">
            {{ getInitial(templateData.name) }}
          </div>
        </div>

        <div class="hero-info">
          <div class="title-row">
            <h1>{{ templateData.name }}</h1>
            <span class="type-badge">{{ typeLabel(templateData.type) }}</span>
          </div>

          <p class="summary-text">
            {{ templateData.summary || '暫無介紹' }}
          </p>

          <div class="tag-row" v-if="templateData.tags?.length">
            <span
              v-for="tag in templateData.tags"
              :key="tag"
              class="tag-chip"
            >
              #{{ tag }}
            </span>
          </div>
        </div>
      </div>

      <div class="content-grid">
        <section class="content-block">
          <h2>人物特徵</h2>
          <ul>
            <li v-for="item in templateData.features" :key="item">
              {{ item }}
            </li>
          </ul>
        </section>

        <section class="content-block">
          <h2>每日節奏</h2>
          <ul>
            <li v-for="item in templateData.dailyFlow" :key="item">
              {{ item }}
            </li>
          </ul>
        </section>

        <section class="content-block">
          <h2>執行重點</h2>
          <ul>
            <li v-for="item in templateData.actions" :key="item">
              {{ item }}
            </li>
          </ul>
        </section>

        <section class="content-block">
          <h2>適合的人</h2>
          <ul>
            <li v-for="item in templateData.fitFor" :key="item">
              {{ item }}
            </li>
          </ul>
        </section>

        <section class="content-block full-width" v-if="templateData.warning">
          <h2>注意事項</h2>
          <p class="warning-text">{{ templateData.warning }}</p>
        </section>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const router = useRouter()
const route = useRoute()

const templates = [
  {
    id: 'peng-yuyan',
    name: '彭于晏',
    type: 'fitness',
    summary: '高自律訓練型，重視體態、飲食控制、規律作息。',
    cover: '',
    tags: ['自律', '健身', '體態', '飲食'],
    features: [
      '自我要求高',
      '願意長期維持規律訓練',
      '對身材管理有強烈目標感'
    ],
    dailyFlow: [
      '固定時間起床',
      '安排訓練時段',
      '控制飲食內容與份量',
      '早睡，降低熬夜頻率'
    ],
    actions: [
      '每週安排 4～6 次運動',
      '蛋白質優先，少油少精製糖',
      '固定量體重與拍照記錄',
      '避免情緒性亂吃'
    ],
    fitFor: [
      '想改善體態的人',
      '需要強制建立自律生活的人',
      '願意長期執行的人'
    ],
    warning: '這套版重點不是短期爆發，而是持續。若你現在生活很亂，先求穩定，再求強度。'
  },
  {
    id: 'elon-musk',
    name: 'Elon Musk',
    type: 'business',
    summary: '高強度工作型，重視執行力、決策速度、長工時投入。',
    cover: '',
    tags: ['創業', '工作強度', '執行力'],
    features: [
      '高度結果導向',
      '工作密度很高',
      '對效率與輸出要求強'
    ],
    dailyFlow: [
      '時間切塊安排工作',
      '優先處理最重要任務',
      '減少低價值社交',
      '快速切換專案'
    ],
    actions: [
      '每天只盯最重要的 1～3 件事',
      '把決策速度放快',
      '壓縮拖延與空轉時間',
      '固定檢查進度與結果'
    ],
    fitFor: [
      '創業者',
      '高目標導向工作者',
      '想提升執行力的人'
    ],
    warning: '高強度模式不一定適合所有人，容易累積壓力。若你本身能量不穩，別直接全套照抄。'
  },
  {
    id: 'study-master',
    name: '高效學習者',
    type: 'study',
    summary: '以知識輸入、刻意練習、固定複盤為主的學習套版。',
    cover: '',
    tags: ['學習', '複盤', '專注'],
    features: [
      '喜歡系統化學習',
      '重視輸出與複習',
      '願意長期累積'
    ],
    dailyFlow: [
      '安排固定專注時段',
      '輸入新知識',
      '做練習與測驗',
      '晚間簡單複盤'
    ],
    actions: [
      '每天至少一次深度專注',
      '做筆記，不只看懂',
      '用測驗檢查是否真的會',
      '每週回顧卡點與進展'
    ],
    fitFor: [
      '學生',
      '考證照的人',
      '想建立長期學習能力的人'
    ],
    warning: '不要只追求看很多，真正的重點是吸收後能不能輸出。'
  },
  {
    id: 'minimal-life',
    name: '極簡生活者',
    type: 'lifestyle',
    summary: '降低雜訊、簡化選擇、維持空間與行程整潔。',
    cover: '',
    tags: ['極簡', '生活管理', '整理'],
    features: [
      '重視空間整潔',
      '減少無效選擇',
      '偏向安靜穩定生活'
    ],
    dailyFlow: [
      '早上整理環境',
      '今天只做必要的事',
      '減少資訊噪音',
      '晚上收尾與歸位'
    ],
    actions: [
      '定期丟棄不需要的東西',
      '待辦不要塞太滿',
      '把常用品固定位置',
      '減少衝動購物'
    ],
    fitFor: [
      '生活很亂的人',
      '容易分心的人',
      '想提升穩定感的人'
    ],
    warning: '極簡不是什麼都不要，而是保留真正重要的東西。'
  }
]

const templateData = computed(() => {
  const id = String(route.params.id || '')
  return templates.find((item) => item.id === id) || null
})

function goBack() {
  router.push('/life-templates')
}

function getInitial(name) {
  return (name || '?').slice(0, 1)
}

function typeLabel(type) {
  if (type === 'fitness') return '健身'
  if (type === 'business') return '事業'
  if (type === 'study') return '學習'
  if (type === 'lifestyle') return '生活'
  return '其他'
}
</script>

<style scoped>
.life-template-detail-page {
  max-width: 1080px;
  margin: 0 auto;
  padding: 20px;
  color: #1f2937;
}

.page-header {
  margin-bottom: 16px;
}

.back-btn {
  border: none;
  border-radius: 12px;
  padding: 10px 14px;
  cursor: pointer;
  font-size: 14px;
  background: #e5e7eb;
  color: #111827;
}

.state-box {
  padding: 28px;
  text-align: center;
  background: #f9fafb;
  border: 1px dashed #d1d5db;
  border-radius: 16px;
}

.detail-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 22px;
  padding: 20px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.04);
}

.hero-section {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 20px;
  margin-bottom: 24px;
}

.cover-wrap {
  width: 100%;
  height: 320px;
  border-radius: 18px;
  overflow: hidden;
  background: #f3f4f6;
}

.cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 56px;
  font-weight: 700;
  color: #6b7280;
}

.hero-info {
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.title-row h1 {
  margin: 0;
  font-size: 32px;
}

.type-badge {
  display: inline-block;
  padding: 6px 12px;
  border-radius: 999px;
  background: #eef2ff;
  color: #4338ca;
  font-size: 13px;
  white-space: nowrap;
}

.summary-text {
  margin: 0 0 16px;
  color: #4b5563;
  line-height: 1.8;
  font-size: 16px;
}

.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-chip {
  display: inline-block;
  padding: 5px 10px;
  border-radius: 999px;
  background: #f3f4f6;
  color: #374151;
  font-size: 12px;
}

.content-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.content-block {
  background: #f9fafb;
  border-radius: 16px;
  padding: 18px;
}

.content-block h2 {
  margin: 0 0 12px;
  font-size: 20px;
}

.content-block ul {
  margin: 0;
  padding-left: 20px;
  line-height: 1.8;
}

.full-width {
  grid-column: 1 / -1;
}

.warning-text {
  margin: 0;
  line-height: 1.8;
  color: #4b5563;
}

@media (max-width: 900px) {
  .hero-section {
    grid-template-columns: 1fr;
  }

  .cover-wrap {
    height: 260px;
  }

  .content-grid {
    grid-template-columns: 1fr;
  }
}
</style>
