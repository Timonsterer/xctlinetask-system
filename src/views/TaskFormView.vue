<template>
  <div class="task-form-page">
    <div class="page-header">
      <div>
        <h1>{{ isEditMode ? '編輯任務' : '新增任務' }}</h1>
        <p>只放下一個要做的動作，讓首頁永遠有明確任務</p>
      </div>

      <button class="btn" type="button" @click="goHome">
        返回首頁
      </button>
    </div>

    <div class="card">
      <div v-if="loading" class="loading">載入中...</div>

      <div v-else>
        <div v-if="error" class="alert error">{{ error }}</div>
        <div v-if="success" class="alert success">{{ success }}</div>

        <form class="form" @submit.prevent="handleSubmit">
          <div class="form-group">
            <label for="title">任務名稱</label>
            <input
              id="title"
              v-model.trim="form.title"
              type="text"
              placeholder="例如：打電話給客戶、整理報價單、回覆訊息"
            />
          </div>

          <div class="form-group">
            <label for="quickTime">快速時間（HHMM-MMDD）</label>
            <input
              id="quickTime"
              v-model.trim="form.quickTime"
              type="text"
              placeholder="例如：1430-0416"
            />
            <div class="hint">
              可只填 HHMM，例如 1430。若不填，預設為現在後 30 分鐘開始。
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="startAt">開始時間</label>
              <input
                id="startAt"
                v-model="form.startAt"
                type="datetime-local"
              />
            </div>

            <div class="form-group">
              <label for="duration">時長（HHMM）</label>
              <input
                id="duration"
                v-model.trim="form.duration"
                type="text"
                placeholder="例如：0030 / 0130 / 0230"
              />
            </div>
          </div>

          <div class="preview-box">
            <div class="preview-title">時間預覽</div>
            <div class="preview-line">開始：{{ previewStartText || '未設定' }}</div>
            <div class="preview-line">結束：{{ previewEndText || '未設定' }}</div>
          </div>

          <div class="form-group">
            <label for="note">備註</label>
            <textarea
              id="note"
              v-model.trim="form.note"
              rows="4"
              placeholder="例如：先整理需求，再報價"
            />
          </div>

          <div class="form-group">
            <label class="switch-row">
              <input v-model="form.pinAsCurrent" type="checkbox" />
              <span>設為目前待做任務</span>
            </label>
          </div>

          <div class="actions">
            <button class="btn primary" type="submit" :disabled="saving">
              {{ saving ? '儲存中...' : isEditMode ? '更新任務' : '建立任務' }}
            </button>

            <button
              v-if="isEditMode"
              class="btn danger"
              type="button"
              @click="markDone"
              :disabled="saving"
            >
              直接完成
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { db } from '@/firebase'
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  Timestamp,
} from 'firebase/firestore'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const saving = ref(false)
const error = ref('')
const success = ref('')

const form = reactive({
  title: '',
  quickTime: '',
  startAt: '',
  duration: '0030',
  note: '',
  pinAsCurrent: true,
})

const taskId = computed(() => route.query.id || '')
const isEditMode = computed(() => !!taskId.value)

const getUserId = () => {
  return (
    localStorage.getItem('userId') ||
    localStorage.getItem('lineUserId') ||
    localStorage.getItem('line_user_id') ||
    ''
  )
}

const toDatetimeLocal = (date) => {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const mi = String(date.getMinutes()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`
}

const formatDateTime = (value) => {
  if (!value) return ''

  let date = null

  if (typeof value?.toDate === 'function') {
    date = value.toDate()
  } else if (value instanceof Date) {
    date = value
  } else {
    date = new Date(value)
  }

  if (Number.isNaN(date.getTime())) return ''

  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const mi = String(date.getMinutes()).padStart(2, '0')
  return `${yyyy}/${mm}/${dd} ${hh}:${mi}`
}

const parseQuickTime = (value) => {
  if (!value) return null

  const raw = value.trim()
  const match = raw.match(/^(\d{4})(?:-(\d{4}))?$/)
  if (!match) return null

  const hhmm = match[1]
  const mmdd = match[2]

  const hh = Number(hhmm.slice(0, 2))
  const mi = Number(hhmm.slice(2, 4))

  if (hh > 23 || mi > 59) return null

  const now = new Date()
  const date = new Date(now)

  if (mmdd) {
    const month = Number(mmdd.slice(0, 2))
    const day = Number(mmdd.slice(2, 4))
    if (month < 1 || month > 12 || day < 1 || day > 31) return null
    date.setMonth(month - 1)
    date.setDate(day)
  }

  date.setHours(hh, mi, 0, 0)

  if (!mmdd && date.getTime() < now.getTime()) {
    date.setDate(date.getDate() + 1)
  }

  return date
}

const parseDurationMinutes = (value) => {
  const raw = (value || '').trim()
  if (!/^\d{4}$/.test(raw)) return 30

  const hh = Number(raw.slice(0, 2))
  const mi = Number(raw.slice(2, 4))

  if (mi > 59) return 30

  const total = hh * 60 + mi
  return total > 0 ? total : 30
}

const getStartDate = () => {
  if (form.startAt) {
    const d = new Date(form.startAt)
    if (!Number.isNaN(d.getTime())) return d
  }

  if (form.quickTime) {
    const d = parseQuickTime(form.quickTime)
    if (d) return d
  }

  const now = new Date()
  now.setMinutes(now.getMinutes() + 30)
  now.setSeconds(0, 0)
  return now
}

const getEndDate = () => {
  const start = getStartDate()
  const mins = parseDurationMinutes(form.duration)
  return new Date(start.getTime() + mins * 60 * 1000)
}

const previewStartText = computed(() => formatDateTime(getStartDate()))
const previewEndText = computed(() => formatDateTime(getEndDate()))

watch(
  () => form.quickTime,
  (value) => {
    const parsed = parseQuickTime(value)
    if (parsed) {
      form.startAt = toDatetimeLocal(parsed)
    }
  }
)

const resetMessage = () => {
  error.value = ''
  success.value = ''
}

const normalizeOwnerId = (data = {}) => {
  return data.userId || data.ownerId || ''
}

const normalizeStatus = (data = {}) => {
  if (data.status === 'completed') return 'done'
  return data.status || 'pending'
}

const loadTask = async () => {
  loading.value = true
  resetMessage()

  try {
    const userId = getUserId()
    if (!userId) {
      router.push('/bind')
      return
    }

    if (!isEditMode.value) {
      const now = new Date()
      now.setMinutes(now.getMinutes() + 30)
      now.setSeconds(0, 0)
      form.startAt = toDatetimeLocal(now)
      loading.value = false
      return
    }

    const refDoc = doc(db, 'tasks', String(taskId.value))
    const snap = await getDoc(refDoc)

    if (!snap.exists()) {
      error.value = '找不到這筆任務'
      loading.value = false
      return
    }

    const data = snap.data()
    const ownerId = normalizeOwnerId(data)

    if (ownerId !== userId) {
      error.value = '這筆任務不屬於你'
      loading.value = false
      return
    }

    form.title = data.title || ''
    form.note = data.note || ''
    form.quickTime = data.quickTime || data.rawTimeInput || ''
    form.duration = data.durationText || data.rawDurationInput || '0030'
    form.pinAsCurrent = data.isCurrent !== false && normalizeStatus(data) !== 'done'

    const startSource = data.startAt || data.dueAt || data.startText
    if (startSource?.toDate) {
      form.startAt = toDatetimeLocal(startSource.toDate())
    } else if (startSource) {
      const d = new Date(startSource)
      if (!Number.isNaN(d.getTime())) {
        form.startAt = toDatetimeLocal(d)
      }
    }
  } catch (err) {
    console.error(err)
    error.value = '載入任務失敗'
  } finally {
    loading.value = false
  }
}

const fetchPendingTaskDocs = async (fieldName, userId) => {
  const q = query(
    collection(db, 'tasks'),
    where(fieldName, '==', userId),
    where('status', 'in', ['pending', 'completed', 'done'])
  )

  const snap = await getDocs(q)
  return snap.docs
}

const demoteOtherPendingTasks = async () => {
  const userId = getUserId()
  const docMap = new Map()

  try {
    const q1 = query(
      collection(db, 'tasks'),
      where('userId', '==', userId),
      where('status', '==', 'pending'),
      orderBy('updatedAt', 'desc'),
      limit(50)
    )
    const snap1 = await getDocs(q1)
    snap1.docs.forEach((item) => docMap.set(item.id, item))
  } catch (err) {
    console.warn('query by userId failed:', err)
  }

  try {
    const q2 = query(
      collection(db, 'tasks'),
      where('ownerId', '==', userId),
      where('status', '==', 'pending'),
      orderBy('updatedAt', 'desc'),
      limit(50)
    )
    const snap2 = await getDocs(q2)
    snap2.docs.forEach((item) => docMap.set(item.id, item))
  } catch (err) {
    console.warn('query by ownerId failed:', err)
  }

  const jobs = [...docMap.values()]
    .filter((item) => item.id !== String(taskId.value || ''))
    .map((item) =>
      updateDoc(doc(db, 'tasks', item.id), {
        isCurrent: false,
        updatedAt: serverTimestamp(),
      })
    )

  await Promise.all(jobs)
}

const handleSubmit = async () => {
  resetMessage()

  const userId = getUserId()
  if (!userId) {
    error.value = '尚未取得 userId'
    return
  }

  if (!form.title) {
    error.value = '請填寫任務名稱'
    return
  }

  const startDate = getStartDate()
  const endDate = getEndDate()
  const durationMinutes = parseDurationMinutes(form.duration)

  if (endDate.getTime() <= startDate.getTime()) {
    error.value = '結束時間必須晚於開始時間'
    return
  }

  saving.value = true

  try {
    if (form.pinAsCurrent) {
      await demoteOtherPendingTasks()
    }

    const payload = {
      userId,
      ownerId: userId,

      title: form.title,
      note: form.note || '',
      type: 'key',

      quickTime: form.quickTime || '',
      rawTimeInput: form.quickTime || '',
      durationText: form.duration || '0030',
      rawDurationInput: form.duration || '0030',
      durationMinutes,

      startAt: Timestamp.fromDate(startDate),
      endAt: Timestamp.fromDate(endDate),
      dueAt: Timestamp.fromDate(startDate),

      startText: startDate.toISOString(),
      endText: endDate.toISOString(),

      status: 'pending',
      isCurrent: !!form.pinAsCurrent,
      completedAt: null,
      updatedAt: serverTimestamp(),
    }

    if (isEditMode.value) {
      await updateDoc(doc(db, 'tasks', String(taskId.value)), payload)
      success.value = '任務已更新'
    } else {
      await addDoc(collection(db, 'tasks'), {
        ...payload,
        createdAt: serverTimestamp(),
      })
      success.value = '任務已建立'
    }

    setTimeout(() => {
      router.push('/home')
    }, 400)
  } catch (err) {
    console.error(err)
    error.value = '儲存失敗，請檢查 Firestore 欄位與索引'
  } finally {
    saving.value = false
  }
}

const markDone = async () => {
  resetMessage()

  if (!isEditMode.value) return

  saving.value = true

  try {
    const refDoc = doc(db, 'tasks', String(taskId.value))
    const snap = await getDoc(refDoc)

    if (!snap.exists()) {
      throw new Error('找不到任務')
    }

    const data = snap.data()
    const ownerId = normalizeOwnerId(data) || getUserId()

    await updateDoc(refDoc, {
      status: 'done',
      isCurrent: false,
      completedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    await addDoc(collection(db, 'task_history'), {
      userId: ownerId,
      ownerId,
      taskId: String(taskId.value),
      title: data.title || form.title || '',
      note: data.note || form.note || '',
      type: data.type || 'key',
      startAt: data.startAt || (form.startAt ? Timestamp.fromDate(new Date(form.startAt)) : null),
      endAt: data.endAt || null,
      dueAt: data.dueAt || data.startAt || (form.startAt ? Timestamp.fromDate(new Date(form.startAt)) : null),
      durationText: data.durationText || form.duration || '0030',
      durationMinutes: data.durationMinutes || parseDurationMinutes(form.duration),
      rawTimeInput: data.rawTimeInput || form.quickTime || '',
      rawDurationInput: data.rawDurationInput || form.duration || '0030',
      completedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    })

    success.value = '任務已完成'

    setTimeout(() => {
      router.push('/home')
    }, 400)
  } catch (err) {
    console.error(err)
    error.value = err?.message || '完成任務失敗'
  } finally {
    saving.value = false
  }
}

const goHome = () => {
  router.push('/home')
}

onMounted(() => {
  loadTask()
})
</script>

<style scoped>
.task-form-page {
  max-width: 760px;
  margin: 0 auto;
  padding: 20px;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.page-header h1 {
  margin: 0 0 8px;
  font-size: 28px;
  font-weight: 800;
}

.page-header p {
  margin: 0;
  color: #666;
}

.card {
  background: #fff;
  border-radius: 18px;
  padding: 20px;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.06);
}

.loading {
  padding: 28px 0;
  text-align: center;
  color: #666;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-size: 14px;
  font-weight: 700;
}

.form-group input,
.form-group textarea {
  width: 100%;
  border: 1px solid #dcdcdc;
  border-radius: 12px;
  padding: 12px 14px;
  font-size: 15px;
  box-sizing: border-box;
}

.hint {
  font-size: 13px;
  color: #666;
}

.preview-box {
  border: 1px dashed #d4d4d4;
  border-radius: 14px;
  padding: 14px;
  background: #fafafa;
}

.preview-title {
  font-size: 14px;
  font-weight: 800;
  margin-bottom: 8px;
}

.preview-line {
  font-size: 14px;
  color: #444;
  line-height: 1.8;
}

.switch-row {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
}

.actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.alert {
  margin-bottom: 16px;
  border-radius: 12px;
  padding: 12px 14px;
  font-size: 14px;
}

.alert.error {
  background: #fef2f2;
  color: #b91c1c;
}

.alert.success {
  background: #ecfdf5;
  color: #047857;
}

.btn {
  border: none;
  border-radius: 12px;
  padding: 12px 16px;
  font-size: 15px;
  cursor: pointer;
  background: #f3f4f6;
}

.btn.primary {
  background: #2563eb;
  color: #fff;
}

.btn.danger {
  background: #dc2626;
  color: #fff;
}

.btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

@media (max-width: 640px) {
  .task-form-page {
    padding: 16px;
  }

  .page-header {
    flex-direction: column;
  }

  .form-row {
    grid-template-columns: 1fr;
  }

  .actions {
    flex-direction: column;
  }
}
</style>
