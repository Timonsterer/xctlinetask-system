<template>
  <div class="page idle-form-page">
    <div class="card form-card">
      <div class="page-header">
        <div>
          <p class="eyebrow">IDLE</p>
          <h1 class="title">我很閒</h1>
          <p class="sub">把你現在可約、可幫忙、可接單的狀態發出去</p>
        </div>

        <div class="header-icon">閒</div>
      </div>

      <div v-if="loading" class="card-soft loading">載入中...</div>

      <div v-else>
        <div v-if="error" class="alert alert-error">{{ error }}</div>
        <div v-if="success" class="alert alert-success">{{ success }}</div>

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

          <div class="switch-card">
            <label class="switch-row">
              <input v-model="form.isActive" type="checkbox" />
              <span>
                <strong>立即上架到「我很閒市場」</strong>
                <small>開啟後，其他人可以在市場看到你的狀態。</small>
              </span>
            </label>
          </div>

          <div class="actions">
            <button class="btn" type="submit" :disabled="saving">
              {{ saving ? '儲存中...' : '儲存狀態' }}
            </button>

            <button class="btn btn-blue" type="button" @click="goMarket">
              去看我很閒市場
            </button>

            <button
              class="btn btn-red"
              type="button"
              @click="turnOffIdle"
              :disabled="saving"
            >
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
import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'

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
  postId: '',
})

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

const getDefaultStart = () => {
  const now = new Date()
  now.setMinutes(now.getMinutes() + 30, 0, 0)
  return toDatetimeLocal(now)
}

const getDefaultEnd = () => {
  const now = new Date()
  now.setHours(now.getHours() + 2)
  now.setSeconds(0, 0)
  return toDatetimeLocal(now)
}

const resetMessage = () => {
  error.value = ''
  success.value = ''
}

const getTags = () => {
  const tags = []
  if (form.canHelp) tags.push('可幫忙')
  if (form.canChat) tags.push('可聊天')
  if (form.canWork) tags.push('可接案')
  if (form.canMeet) tags.push('可見面')
  return tags
}

const resolveType = () => {
  if (form.canWork) return 'service'
  if (form.canChat) return 'hangout'
  return 'help'
}

const loadIdleData = async () => {
  loading.value = true
  resetMessage()

  try {
    const userId = getUserId()

    if (!userId) {
      error.value = '尚未取得 userId，請先完成綁定'
      return
    }

    form.availableFrom = getDefaultStart()
    form.availableTo = getDefaultEnd()

    const refDoc = doc(db, 'idle_users', userId)
    const snap = await getDoc(refDoc)

    if (!snap.exists()) return

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
    form.postId = data.postId || ''
  } catch (err) {
    console.error(err)
    error.value = '載入失敗，請稍後再試'
  } finally {
    loading.value = false
  }
}

const syncIdlePost = async (userId) => {
  const payload = {
    userId,
    ownerId: userId,
    ownerName: form.displayName || '',
    title: form.title || '',
    description: form.note || '',
    type: resolveType(),
    location: form.locationText || '',
    reward: form.reward || '',
    startAt: form.availableFrom ? new Date(form.availableFrom) : null,
    endAt: form.availableTo ? new Date(form.availableTo) : null,
    startAtText: form.availableFrom || '',
    endAtText: form.availableTo || '',
    contactText: form.displayName || '',
    contactUrl: '',
    tags: getTags(),
    isActive: !!form.isActive,
    updatedAt: serverTimestamp(),
  }

  if (form.postId) {
    await setDoc(doc(db, 'idle_posts', form.postId), payload, { merge: true })
    return form.postId
  }

  const postRef = await addDoc(collection(db, 'idle_posts'), {
    ...payload,
    createdAt: serverTimestamp(),
  })

  form.postId = postRef.id
  return postRef.id
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

  if (
    new Date(form.availableTo).getTime() <=
    new Date(form.availableFrom).getTime()
  ) {
    error.value = '結束時間必須晚於開始時間'
    return
  }

  saving.value = true

  try {
    const postId = await syncIdlePost(userId)

    await setDoc(
      doc(db, 'idle_users', userId),
      {
        userId,
        ownerId: userId,
        postId,

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

    success.value = form.isActive
      ? '已上架到我很閒市場'
      : '已儲存，但目前未上架'
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
    await updateDoc(doc(db, 'idle_users', userId), {
      isActive: false,
      updatedAt: serverTimestamp(),
    })

    if (form.postId) {
      await updateDoc(doc(db, 'idle_posts', form.postId), {
        isActive: false,
        updatedAt: serverTimestamp(),
      })
    }

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
  router.push('/idle-market')
}

onMounted(() => {
  loadIdleData()
})
</script>

<style scoped>
.idle-form-page {
  max-width: 760px;
  margin: 0 auto;
}

.form-card {
  overflow: hidden;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 22px;
}

.eyebrow {
  margin: 0 0 6px;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 2px;
  color: #9b7b00;
}

.header-icon {
  width: 64px;
  height: 64px;
  flex-shrink: 0;

  display: flex;
  align-items: center;
  justify-content: center;

  background: #fff1a8;
  border: 2px solid #1e1e1e;
  border-radius: 20px;

  font-size: 26px;
  font-weight: 900;

  box-shadow: 0 5px 0 #1e1e1e;
}

.loading {
  text-align: center;
  font-weight: 800;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-group {
  width: 100%;
  min-width: 0;
}

.form-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 12px;
  width: 100%;
}

.form-row .form-group {
  min-width: 0;
}

.form-row input[type='datetime-local'] {
  width: 100%;
  min-width: 0;
  max-width: 100%;
  font-size: 14px;
  padding-left: 10px;
  padding-right: 8px;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  width: 100%;
}

.chip {
  width: auto;
  min-width: 92px;

  background: #ffffff;
  color: #1e1e1e;

  border: 2px solid #1e1e1e;
  border-radius: 999px;

  padding: 10px 14px;

  font-size: 14px;
  font-weight: 900;

  box-shadow: 0 4px 0 #1e1e1e;
}

.chip.active {
  background: #ffd84d;
}

.switch-card {
  width: 100%;
  max-width: 100%;

  background: #fff8e8;

  border: 2px solid #1e1e1e;
  border-radius: 18px;

  padding: 14px;

  margin: 4px 0 12px;

  box-shadow: 0 5px 0 #1e1e1e;
}

.switch-row {
  width: 100%;
  max-width: 100%;

  display: flex;
  align-items: flex-start;
  gap: 12px;

  margin: 0;
  cursor: pointer;
}

.switch-row input {
  width: 22px;
  height: 22px;

  flex: 0 0 22px;

  margin: 2px 0 0;
  padding: 0;

  accent-color: #ffd84d;
}

.switch-row span {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.switch-row strong {
  font-size: 15px;
  font-weight: 900;
}

.switch-row small {
  color: #666;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.5;
}

.alert {
  margin-bottom: 14px;
  padding: 12px 14px;

  border: 2px solid #1e1e1e;
  border-radius: 16px;

  font-size: 14px;
  font-weight: 800;
}

.alert-error {
  background: #ffdcdc;
  color: #9f1239;
}

.alert-success {
  background: #dff8df;
  color: #166534;
}

.actions {
  margin-top: 4px;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 640px) {
  .idle-form-page {
    max-width: 100%;
  }

  .page-header {
    flex-direction: column;
  }

  .header-icon {
    width: 56px;
    height: 56px;
    font-size: 22px;
  }

  .form-row {
    grid-template-columns: 1fr;
  }

  .form-row input[type='datetime-local'] {
    font-size: 13px;
  }

  .chip {
    flex: 1;
    min-width: calc(50% - 8px);
  }
}
</style>
