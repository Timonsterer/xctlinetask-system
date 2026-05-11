<template>
  <div class="page task-form-page">
    <div class="card form-card">
      <div class="header">
        <div>
          <p class="eyebrow">TASK</p>
          <h1 class="title">新增任務</h1>
          <p class="sub">
            把你接下來想做的事情安排進今天。
          </p>
        </div>

        <div class="header-icon">
          ＋
        </div>
      </div>

      <div class="form-section">
        <label>任務名稱</label>

        <input
          v-model="task.title"
          type="text"
          placeholder="例如：聯絡客戶、健身、探店"
        />
      </div>

      <div class="form-section">
        <label>任務備註</label>

        <textarea
          v-model="task.note"
          rows="4"
          placeholder="補充一些細節..."
        />
      </div>

      <div class="row time-row">
        <div class="time-box">
          <label>開始日期</label>

          <input
            v-model="task.date"
            type="date"
          />
        </div>

        <div class="time-box">
          <label>開始時間</label>

          <input
            v-model="task.time"
            type="time"
          />
        </div>
      </div>

      <div class="form-section">
        <label>任務類型</label>

        <select v-model="task.type">
          <option value="normal">
            一般任務
          </option>

          <option value="important">
            重要任務
          </option>

          <option value="explore">
            探店任務
          </option>

          <option value="contact">
            聯絡客戶
          </option>
        </select>
      </div>

      <div class="actions">
        <button
          class="btn btn-secondary"
          @click="goBack"
        >
          返回
        </button>

        <button
          class="btn"
          :disabled="loading"
          @click="submitTask"
        >
          {{ loading ? '建立中...' : '建立任務' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

import {
  collection,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore'

import { db } from '@/firebase'

const router = useRouter()

const loading = ref(false)

const today = new Date()

const yyyy = today.getFullYear()

const mm = String(today.getMonth() + 1).padStart(2, '0')

const dd = String(today.getDate()).padStart(2, '0')

const hh = String(today.getHours()).padStart(2, '0')

const min = String(today.getMinutes()).padStart(2, '0')

const task = reactive({
  title: '',
  note: '',
  date: `${yyyy}-${mm}-${dd}`,
  time: `${hh}:${min}`,
  type: 'normal',
})

function getUserId() {
  return (
    localStorage.getItem('lineUserId') ||
    localStorage.getItem('userId') ||
    ''
  )
}

async function submitTask() {
  if (!task.title.trim()) {
    alert('請輸入任務名稱')
    return
  }

  const userId = getUserId()

  if (!userId) {
    alert('尚未登入')
    return
  }

  loading.value = true

  try {
    const startAt = new Date(
      `${task.date}T${task.time}`
    )

    await addDoc(collection(db, 'tasks'), {
      userId,

      title: task.title,
      note: task.note,

      type: task.type,

      status: 'pending',

      startAt,

      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    alert('任務建立成功')

    router.push('/home')
  } catch (err) {
    console.error(err)

    alert('建立失敗')
  } finally {
    loading.value = false
  }
}

function goBack() {
  router.back()
}
</script>

<style scoped>
.task-form-page {
  max-width: 720px;
  margin: 0 auto;
}

.form-card {
  overflow: hidden;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;

  gap: 16px;

  margin-bottom: 24px;
}

.eyebrow {
  margin: 0 0 6px;

  font-size: 12px;
  font-weight: 900;

  color: #9b7b00;

  letter-spacing: 2px;
}

.header-icon {
  width: 64px;
  height: 64px;

  display: flex;
  align-items: center;
  justify-content: center;

  background: #fff1a8;

  border: 2px solid #1e1e1e;

  border-radius: 20px;

  font-size: 28px;
  font-weight: 900;

  flex-shrink: 0;
}

.form-section {
  margin-bottom: 6px;
}

.time-row {
  width: 100%;
  align-items: flex-start;
}

.time-box {
  flex: 1;
  min-width: 0;
}

.time-box input {
  width: 100%;
  min-width: 0;
}

.actions {
  margin-top: 10px;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .task-form-page {
    max-width: 100%;
  }

  .header {
    flex-direction: column;
  }

  .header-icon {
    width: 56px;
    height: 56px;

    font-size: 24px;
  }

  .time-row {
    flex-direction: column;
  }
}
</style>
