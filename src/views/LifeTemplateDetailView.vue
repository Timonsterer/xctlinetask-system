<template>
  <div class="life-template-detail-page">

    <div v-if="loading" class="loading">
      讀取中...
    </div>

    <div v-else-if="!templateData" class="loading">
      找不到人物套版
    </div>

    <div v-else>

      <!-- Header -->
      <section class="hero">

        <img
          v-if="templateData.imageUrl"
          :src="templateData.imageUrl"
          class="hero-image"
        />

        <div class="hero-content">

          <div class="tag">
            {{ templateData.category || '人物套版' }}
          </div>

          <h1>
            {{ templateData.title || templateData.name }}
          </h1>

          <p>
            {{ templateData.description || '尚無介紹' }}
          </p>

          <button
            class="apply-btn"
            @click="applyTemplate"
            :disabled="applying"
          >
            {{
              applying
                ? '套用中...'
                : '套用人物模式'
            }}
          </button>

        </div>

      </section>

      <!-- Tasks -->
      <section class="task-section">

        <h2>人物任務內容</h2>

        <div
          v-if="templateTasks.length === 0"
          class="empty"
        >
          尚無任務
        </div>

        <div
          v-for="task in templateTasks"
          :key="task.id"
          class="task-card"
        >
          <div class="task-title">
            {{
              task.name ||
              task.title ||
              task.text
            }}
          </div>
        </div>

      </section>

    </div>

  </div>
</template>

<script setup>
import {
  ref,
  computed,
  onMounted,
} from 'vue'

import { useRoute } from 'vue-router'

import {
  doc,
  getDoc,
  collection,
  getDocs,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore'

import { db } from '@/firebase'

const route = useRoute()

const loading = ref(true)
const applying = ref(false)

const templateData = ref(null)

const templateTasks = computed(() => {

  if (!templateData.value) return []

  return templateData.value.tasks || []
})

const loadTemplate = async () => {

  try {

    const id = route.params.id

    const refDoc = doc(
      db,
      'life_templates',
      id
    )

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

  } finally {

    loading.value = false
  }
}

// ⭐ 時間轉分鐘
const toMinutes = (timeStr) => {

  if (!timeStr) return 0

  const [h, m] = timeStr
    .split(':')
    .map(Number)

  return h * 60 + m
}

// ⭐ 分鐘轉 HH:mm
const toTimeString = (minutes) => {

  const h = Math.floor(minutes / 60)
  const m = minutes % 60

  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

// ⭐ 找空檔
const findAvailableSlots = (
  existingTasks
) => {

  // ⭐ 每個人物最多 5 個
  const maxTasks = 5

  // ⭐ 每個任務 90 分鐘
  const duration = 90

  // ⭐ 一天範圍
  const startDay = 8 * 60
  const endDay = 23 * 60

  // 已有任務時間
  const occupied = existingTasks
    .filter(
      (task) =>
        task.startTime &&
        task.endTime
    )
    .map((task) => ({
      start: toMinutes(task.startTime),
      end: toMinutes(task.endTime),
    }))
    .sort((a, b) => a.start - b.start)

  const slots = []

  let cursor = startDay

  for (const item of occupied) {

    if (
      item.start - cursor >= duration
    ) {

      slots.push({
        start: cursor,
        end: cursor + duration,
      })
    }

    cursor = Math.max(cursor, item.end)
  }

  // 最後空檔
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

    const lineUserId =
      localStorage.getItem('lineUserId')

    if (!lineUserId) {
      alert('尚未登入')
      return
    }

    // ⭐ 讀現有任務
    const taskSnap = await getDocs(
      collection(db, 'tasks')
    )

    const myTasks = taskSnap.docs
      .map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }))
      .filter(
        (task) =>
          task.userId === lineUserId ||
          task.ownerId === lineUserId
      )

    // ⭐ 找空檔
    const availableSlots =
      findAvailableSlots(myTasks)

    if (
      availableSlots.length === 0
    ) {
      alert('今天已無空白時段')
      return
    }

    // ⭐ 最多5個
    const tasksToInsert =
      templateTasks.value.slice(
        0,
        availableSlots.length
      )

    for (
      let i = 0;
      i < tasksToInsert.length;
      i++
    ) {

      const task = tasksToInsert[i]
      const slot = availableSlots[i]

      await addDoc(
        collection(db, 'tasks'),
        {

          title:
            task.name ||
            task.title ||
            task.text,

          description:
            `來自人物套版：${
              templateData.value.title ||
              templateData.value.name
            }`,

          userId: lineUserId,
          ownerId: lineUserId,

          status: 'pending',

          // ⭐ 關鍵
          type: 'life_template',

          templateId:
            templateData.value.id,

          templateName:
            templateData.value.title ||
            templateData.value.name,

          autoScheduled: true,

          startTime: toTimeString(
            slot.start
          ),

          endTime: toTimeString(
            slot.end
          ),

          durationMinutes: 90,

          createdAt:
            serverTimestamp(),

          updatedAt:
            serverTimestamp(),
        }
      )
    }

    alert(
      `已自動安排 ${tasksToInsert.length} 個人物任務`
    )

  } catch (err) {

    console.error(err)

    alert('套用失敗')

  } finally {

    applying.value = false
  }
}

onMounted(() => {
  loadTemplate()
})
</script>

<style scoped>
.life-template-detail-page {
  min-height: 100vh;
  background: #f4f7fb;
  padding-bottom: 80px;
}

.loading {
  padding: 40px;
  text-align: center;
  color: #6b7280;
}

.hero {
  background: white;
  overflow: hidden;
}

.hero-image {
  width: 100%;
  height: 300px;
  object-fit: cover;
}

.hero-content {
  padding: 24px;
}

.tag {
  display: inline-block;
  padding: 6px 12px;
  border-radius: 999px;
  background: #dbeafe;
  color: #2563eb;
  font-size: 13px;
  margin-bottom: 12px;
}

.hero-content h1 {
  margin: 0 0 12px;
  font-size: 32px;
}

.hero-content p {
  color: #6b7280;
  line-height: 1.7;
}

.apply-btn {
  margin-top: 20px;
  border: none;
  background: #2563eb;
  color: white;
  padding: 14px 18px;
  border-radius: 14px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
}

.task-section {
  padding: 24px;
}

.task-section h2 {
  margin-bottom: 18px;
}

.empty {
  color: #6b7280;
}

.task-card {
  background: white;
  border-radius: 18px;
  padding: 18px;
  margin-bottom: 14px;
}

.task-title {
  font-size: 16px;
  font-weight: bold;
}
</style>
