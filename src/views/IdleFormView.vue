<template>
  <div class="idle-form-page">
    <div class="page-header">
      <h1>我很閒</h1>
      <p>把你現在可約、可幫忙、可接單的狀態發出去</p>
    </div>

    <div class="card">
      <div v-if="loading" class="loading">載入中...</div>

      <div v-else>
        <div v-if="error" class="alert error">{{ error }}</div>
        <div v-if="success" class="alert success">{{ success }}</div>

        <form class="form" @submit.prevent="handleSubmit">
          <div class="form-group">
            <label for="displayName">顯示名稱</label>
            <input
              id="displayName"
              v-model.trim="form.displayName"
              type="text"
              placeholder="例如：陳小明"
            />
          </div>

          <div class="form-group">
            <label for="title">你現在想做什麼</label>
            <input
              id="title"
              v-model.trim="form.title"
              type="text"
              placeholder="例如：可約聊天、可幫跑腿、可接小任務"
            />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="availableFrom">可開始時間</label>
              <input
                id="availableFrom"
                v-model="form.availableFrom"
                type="datetime-local"
              />
            </div>

            <div class="form-group">
              <label for="availableTo">可到幾點</label>
              <input
                id="availableTo"
                v-model="form.availableTo"
                type="datetime-local"
              />
            </div>
          </div>

          <div class="form-group">
            <label for="locationText">地點</label>
            <input
              id="locationText"
              v-model.trim="form.locationText"
              type="text"
              placeholder="例如：高雄鳳山 / 線上 / 文山特區附近"
            />
          </div>

          <div class="form-group">
            <label>可以做的類型</label>
            <div class="chips">
              <button
                type="button"
                class="chip"
                :class="{ active: form.canHelp }"
                @click="form.canHelp = !form.canHelp"
              >
                可幫忙
              </button>

              <button
                type="button"
                class="chip"
                :class="{ active: form.canChat }"
                @click="form.canChat = !form.canChat"
              >
                可聊天
              </button>

              <button
                type="button"
                class="chip"
                :class="{ active: form.canWork }"
                @click="form.canWork = !form.canWork"
              >
                可接案
              </button>

              <button
                type="button"
                class="chip"
                :class="{ active: form.canMeet }"
                @click="form.canMeet = !form.canMeet"
              >
                可見面
              </button>
            </div>
          </div>

          <div class="form-group">
            <label for="reward">報酬 / 費用</label>
            <input
              id="reward"
              v-model.trim="form.reward"
              type="text"
              placeholder="例如：免費 / 飲料一杯 / 300元起"
            />
          </div>

          <div class="form-group">
            <label for="note">補充說明</label>
            <textarea
              id="note"
              v-model.trim="form.note"
              rows="4"
              placeholder="例如：限今天、希望提前30分鐘約、可陪運動、可幫買東西"
            />
          </div>

          <div class="form-group">
            <label class="switch-row">
              <input v-model="form.isActive" type="checkbox" />
              <span>立即上架到「我很閒市場」</span>
            </label>
          </div>

          <div class="actions">
            <button class="btn primary" type="submit" :disabled="saving">
              {{ saving ? '儲存中...' : '儲存狀態' }}
            </button>

            <button class="btn" type="button" @click="goMarket">
              去看我很閒市場
            </button>

            <button class="btn danger" type="button" @click="turnOffIdle" :disabled="saving">
              關閉閒置狀態
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { db } from '@/firebase'
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'

const router = useRouter()

const loading = ref(true)
const saving = ref(false)
const error = ref('')
const success = ref('')

const form = reactive({
  displayName: '',
  title: '',
  availableFrom: '',
  availableTo: '',
  locationText: '',
  canHelp: true,
  canChat: false,
  canWork: false,
  canMeet: true,
  reward: '',
  note: '',
  isActive: true,
})

const getUserId = () => {
  return (
    localStorage.getItem('userId') ||
    localStorage.getItem('lineUserId') ||
    localStorage.getItem('line_user_id') ||
    ''
  )
}

const getDefaultStart = () => {
  const now = new Date()
  now.setMinutes(now.getMinutes() + 30)
  return toDatetimeLocal(now)
}

const getDefaultEnd = () => {
  const now = new Date()
  now.setHours(now.getHours() + 2)
  return toDatetimeLocal(now)
}

const toDatetimeLocal = (date) => {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const mi = String(date.getMinutes()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`
}

const resetMessage = () => {
  error.value = ''
  success.value = ''
}

const loadIdleData = async () => {
  loading.value = true
  resetMessage()

  try {
    const userId = getUserId()

    if (!userId) {
      error.value = '尚未取得 userId，請先完成綁定'
      loading.value = false
      return
    }

    form.availableFrom = getDefaultStart()
    form.availableTo = getDefaultEnd()

    const ref = doc(db, 'idle_users', userId)
    const snap = await getDoc(ref)

    if (snap.exists()) {
      const data = snap.data()

      form.displayName = data.displayName || ''
      form.title = data.title || ''
      form.availableFrom = data.availableFromText || form.availableFrom
      form.availableTo = data.availableToText || form.availableTo
      form.locationText = data.locationText || ''
      form.canHelp = data.canHelp ?? true
      form.canChat = data.canChat ?? false
      form.canWork = data.canWork ?? false
      form.canMeet = data.canMeet ?? true
      form.reward = data.reward || ''
      form.note = data.note || ''
      form.isActive = data.isActive ?? true
    }
  } catch (err) {
    console.error(err)
    error.value = '載入失敗，請稍後再試'
  } finally {
    loading.value = false
  }
}

const handleSubmit = async () => {
  resetMessage()

  const userId = getUserId()
  if (!userId) {
    error.value = '尚未取得 userId，請先完成綁定'
    return
  }

  if (!form.displayName) {
    error.value = '請填寫顯示名稱'
    return
  }

  if (!form.title) {
    error.value = '請填寫你現在想做什麼'
    return
  }

  if (!form.availableFrom || !form.availableTo) {
    error.value = '請填寫可用時段'
    return
  }

  if (new Date(form.availableTo).getTime() <= new Date(form.availableFrom).getTime()) {
    error.value = '結束時間必須晚於開始時間'
    return
  }

  saving.value = true

  try {
    const ref = doc(db, 'idle_users', userId)

    await setDoc(
      ref,
      {
        userId,
        displayName: form.displayName,
        title: form.title,
        availableFromText: form.availableFrom,
        availableToText: form.availableTo,
        availableFrom: new Date(form.availableFrom),
        availableTo: new Date(form.availableTo),
        locationText: form.locationText,
        canHelp: form.canHelp,
        canChat: form.canChat,
        canWork: form.canWork,
        canMeet: form.canMeet,
        reward: form.reward,
        note: form.note,
        isActive: form.isActive,
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      },
      { merge: true }
    )

    success.value = form.isActive ? '已上架到我很閒市場' : '已儲存，但目前未上架'
  } catch (err) {
    console.error(err)
    error.value = '儲存失敗，請檢查 Firebase 設定'
  } finally {
    saving.value = false
  }
}

const turnOffIdle = async () => {
  resetMessage()

  const userId = getUserId()
  if (!userId) {
    error.value = '尚未取得 userId，請先完成綁定'
    return
  }

  saving.value = true

  try {
    const ref = doc(db, 'idle_users', userId)
    await updateDoc(ref, {
      isActive: false,
      updatedAt: serverTimestamp(),
    })

    form.isActive = false
    success.value = '已關閉閒置狀態'
  } catch (err) {
    console.error(err)
    error.value = '關閉失敗，若你還沒建立資料，請先按一次儲存狀態'
  } finally {
    saving.value = false
  }
}

const goMarket = () => {
  router.push('/idle/market')
}

onMounted(() => {
  loadIdleData()
})
</script>

<style scoped>
.idle-form-page {
  max-width: 760px;
  margin: 0 auto;
  padding: 20px;
}

.page-header {
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
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.06);
}

.loading {
  padding: 24px 0;
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
  color: #333;
}

.form-group input,
.form-group textarea {
  width: 100%;
  border: 1px solid #dcdcdc;
  border-radius: 12px;
  padding: 12px 14px;
  font-size: 15px;
  box-sizing: border-box;
  outline: none;
}

.form-group input:focus,
.form-group textarea:focus {
  border-color: #222;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.chip {
  border: 1px solid #d0d0d0;
  background: #fff;
  color: #333;
  padding: 10px 14px;
  border-radius: 999px;
  cursor: pointer;
  font-size: 14px;
}

.chip.active {
  background: #111;
  color: #fff;
  border-color: #111;
}

.switch-row {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 600;
}

.alert {
  margin-bottom: 14px;
  padding: 12px 14px;
  border-radius: 12px;
  font-size: 14px;
}

.alert.error {
  background: #fff1f1;
  color: #b42318;
}

.alert.success {
  background: #eefbf3;
  color: #067647;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 8px;
}

.btn {
  border: none;
  border-radius: 12px;
  padding: 12px 16px;
  font-size: 15px;
  cursor: pointer;
  background: #ececec;
  color: #222;
}

.btn.primary {
  background: #111;
  color: #fff;
}

.btn.danger {
  background: #ffe7e7;
  color: #b42318;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 640px) {
  .idle-form-page {
    padding: 16px;
  }

  .form-row {
    grid-template-columns: 1fr;
  }

  .card {
    padding: 16px;
  }
}
</style>
