<template>
  <div class="life-template-list-page">
    <header class="page-header">
      <div>
        <h1>人物套版列表</h1>
        <p>挑一個你想模仿的生活／訓練模式。</p>
      </div>
    </header>

    <section class="toolbar">
      <input
        v-model.trim="keyword"
        type="text"
        class="search-input"
        placeholder="搜尋人物名稱、類型、關鍵字"
      />

      <select v-model="filterType" class="filter-select">
        <option value="all">全部類型</option>
        <option value="fitness">健身</option>
        <option value="business">事業</option>
        <option value="study">學習</option>
        <option value="lifestyle">生活</option>
      </select>
    </section>

    <section v-if="filteredTemplates.length === 0" class="state-box">
      目前沒有套版資料
    </section>

    <section v-else class="template-grid">
      <article
        v-for="item in filteredTemplates"
        :key="item.id"
        class="template-card"
        @click="goDetail(item.id)"
      >
        <div class="cover-wrap">
          <img
            v-if="item.cover"
            :src="item.cover"
            :alt="item.name"
            class="cover-img"
          />
          <div v-else class="cover-placeholder">
            {{ getInitial(item.name) }}
          </div>
        </div>

        <div class="card-body">
          <div class="title-row">
            <h3>{{ item.name }}</h3>
            <span class="type-badge">{{ typeLabel(item.type) }}</span>
          </div>

          <p class="summary-text">
            {{ item.summary || '暫無介紹' }}
          </p>

          <div class="tag-row" v-if="item.tags?.length">
            <span
              v-for="tag in item.tags"
              :key="tag"
              class="tag-chip"
            >
              #{{ tag }}
            </span>
          </div>
        </div>
      </article>
    </section>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const keyword = ref('')
const filterType = ref('all')

const templates = ref([
  {
    id: 'peng-yuyan',
    name: '彭于晏',
    type: 'fitness',
    summary: '高自律訓練型，重視體態、飲食控制、規律作息。',
    cover: '',
    tags: ['自律', '健身', '體態', '飲食']
  },
  {
    id: 'elon-musk',
    name: 'Elon Musk',
    type: 'business',
    summary: '高強度工作型，重視執行力、決策速度、長工時投入。',
    cover: '',
    tags: ['創業', '工作強度', '執行力']
  },
  {
    id: 'study-master',
    name: '高效學習者',
    type: 'study',
    summary: '以知識輸入、刻意練習、固定複盤為主的學習套版。',
    cover: '',
    tags: ['學習', '複盤', '專注']
  },
  {
    id: 'minimal-life',
    name: '極簡生活者',
    type: 'lifestyle',
    summary: '降低雜訊、簡化選擇、維持空間與行程整潔。',
    cover: '',
    tags: ['極簡', '生活管理', '整理']
  }
])

const filteredTemplates = computed(() => {
  const kw = keyword.value.toLowerCase()

  return templates.value.filter((item) => {
    const hitKeyword =
      !kw ||
      (item.name || '').toLowerCase().includes(kw) ||
      (item.summary || '').toLowerCase().includes(kw) ||
      (item.type || '').toLowerCase().includes(kw) ||
      (item.tags || []).some((tag) => String(tag).toLowerCase().includes(kw))

    const hitType =
      filterType.value === 'all' || item.type === filterType.value

    return hitKeyword && hitType
  })
})

function goDetail(id) {
  router.push(`/life-templates/${id}`)
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
.life-template-list-page {
  max-width: 1080px;
  margin: 0 auto;
  padding: 20px;
  color: #1f2937;
}

.page-header {
  margin-bottom: 20px;
}

.page-header h1 {
  margin: 0 0 8px;
  font-size: 28px;
}

.page-header p {
  margin: 0;
  color: #6b7280;
}

.toolbar {
  display: grid;
  grid-template-columns: 1.5fr 220px;
  gap: 12px;
  margin-bottom: 20px;
}

.search-input,
.filter-select {
  width: 100%;
  padding: 12px;
  border: 1px solid #d1d5db;
  border-radius: 12px;
  font-size: 14px;
  box-sizing: border-box;
}

.state-box {
  padding: 28px;
  text-align: center;
  background: #f9fafb;
  border: 1px dashed #d1d5db;
  border-radius: 16px;
}

.template-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.template-card {
  overflow: hidden;
  border: 1px solid #e5e7eb;
  border-radius: 18px;
  background: #fff;
  cursor: pointer;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.04);
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.template-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.08);
}

.cover-wrap {
  width: 100%;
  height: 180px;
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
  font-size: 40px;
  font-weight: 700;
  color: #6b7280;
}

.card-body {
  padding: 16px;
}

.title-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 10px;
}

.title-row h3 {
  margin: 0;
  font-size: 20px;
}

.type-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 999px;
  background: #eef2ff;
  color: #4338ca;
  font-size: 12px;
  white-space: nowrap;
}

.summary-text {
  margin: 0 0 12px;
  color: #4b5563;
  line-height: 1.6;
}

.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-chip {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 999px;
  background: #f3f4f6;
  color: #374151;
  font-size: 12px;
}

@media (max-width: 768px) {
  .toolbar {
    grid-template-columns: 1fr;
  }

  .template-grid {
    grid-template-columns: 1fr;
  }
}
</style>
