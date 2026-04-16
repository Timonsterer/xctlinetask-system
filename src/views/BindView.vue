<template>
  <div class="bind-page">
    <div class="bind-card">
      <h1>LINE 綁定</h1>
      <p class="desc">先取得 LINE 身分，才能進入系統</p>

      <div class="debug-box">
        <div>狀態：{{ stage }}</div>
        <div>網址：{{ currentUrl }}</div>
        <div>LIFF_ID：{{ maskedLiffId }}</div>
        <div>isLoggedIn：{{ isLoggedInText }}</div>
        <div>isInClient：{{ isInClientText }}</div>
      </div>

      <div v-if="loading" class="status-box">
        <div class="status-text">綁定中...</div>
      </div>

      <div v-if="error" class="alert error">{{ error }}</div>
      <div v-if="success" class="alert success">{{ success }}</div>

      <div v-if="profile" class="profile-box">
        <img
          v-if="profile.pictureUrl"
          :src="profile.pictureUrl"
          alt="avatar"
          class="avatar"
        />
        <div class="profile-info">
          <div class="name">{{ profile.displayName || 'LINE 使用者' }}</div>
          <div class="user-id">userId：{{ userId }}</div>
        </div>
      </div>

      <div v-if="!loading && !userId" class="login-box">
        <button class="btn primary" @click="handleLogin">
          手動登入 LINE
        </button>
      </div>

      <form v-if="!loading && userId" class="form" @submit.prevent="handleSave">
        <div class="form-group">
          <label for="name">顯示名稱</label>
          <input id="name" v-model.trim="form.name" type="text" placeholder="請輸入顯示名稱" />
        </div>

        <div class="form-group">
          <label for="nickname">暱稱</label>
          <input id="nickname" v-model.trim="form.nickname" type="text" placeholder="可不填" />
        </div>

        <div class="form-group">
          <label for="occupation">身分 / 職業</label>
          <input
            id="occupation"
            v-model.trim="form.occupation"
            type="text"
            placeholder="例如：上班族 / 自由工作者 / 業務"
          />
        </div>

        <button class="btn primary" type="submit" :disabled="saving">
          {{ saving ? '儲存中...' : '完成綁定' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import liff from '@line/liff'
import { db } from '@/firebase'
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'

const router = useRouter()

const loading = ref(true)
const saving = ref(false)
const error = ref('')
const success = ref('')
const stage = ref('尚未開始')
const currentUrl = ref(window.location.href)
const isLoggedInText = ref('未知')
const isInClientText = ref('未知')
const userId = ref('')
const profile = ref(null)

const form = reactive({
  name: '',
  nickname: '',
  occupation: '',
})

const LIFF_ID =
  import.meta.env.VITE_LIFF_ID ||
  import.meta.env.VITE_LINE_LIFF_ID ||
  ''

const maskedLiffId = computed(() => {
  if (!LIFF_ID) return '未設定'
  if (LIFF_ID.length < 8) return LIFF_ID
  return `${LIFF_ID.slice(0, 4)}***${LIFF_ID.slice(-3)}`
})

function withTimeout(promise, ms = 8000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`LIFF 初始化逾時（${ms / 1000} 秒）`)), ms)
    }),
  ])
}

function resetMessage() {
  error.value = ''
  success.value = ''
}

function saveLocalUser(id, profileData = null) {
  localStorage.setItem('userId', id)
  localStorage.setItem('lineUserId', id)
  localStorage.setItem('line_user_id', id)

  if (profileData?.displayName) {
    localStorage.setItem('displayName', profileData.displayName)
  }

  if (profileData?.pictureUrl) {
    localStorage.setItem('pictureUrl', profileData.pictureUrl)
  }
}

async function loadUserDoc(id) {
  const ref = doc(db, 'users', id)
  const snap = await getDoc(ref)

  if (!snap.exists()) return

  const data = snap.data()
  form.name = data.name || profile.value?.displayName || ''
  form.nickname = data.nickname || ''
  form.occupation = data.occupation || ''
}

function handleLogin() {
  resetMessage()

  if (!LIFF_ID) {
    error.value = '缺少 LIFF ID，請設定 VITE_LIFF_ID'
    return
  }

  stage.value = '手動登入中'
  liff.login({
    redirectUri: `${window.location.origin}/bind`,
  })
}

async function initLine() {
  resetMessage()
  loading.value = true
  currentUrl.value = window.location.href

  try {
    if (!LIFF_ID) {
      throw new Error('缺少 LIFF ID，請設定 VITE_LIFF_ID')
    }

    stage.value = '呼叫 liff.init()'
    await withTimeout(
      liff.init({
        liffId: LIFF_ID,
      }),
      8000
    )

    stage.value = '初始化完成，檢查登入狀態'
    isLoggedInText.value = String(liff.isLoggedIn())
    isInClientText.value = String(liff.isInClient())

    if (!liff.isLoggedIn()) {
      stage.value = '尚未登入，停止自動跳轉'
      return
    }

    stage.value = '嘗試取得個人資料'
    let profileData = null

    try {
      profileData = await liff.getProfile()
      profile.value = profileData
    } catch (e) {
      console.warn('getProfile 失敗，改用 ID Token', e)
    }

    const decoded = liff.getDecodedIDToken()
    const tokenUserId = decoded?.sub || ''

    userId.value = profileData?.userId || tokenUserId || ''

    if (!userId.value) {
      throw new Error('無法取得 LINE userId，請檢查 LIFF scope 與登入授權')
    }

    saveLocalUser(userId.value, profileData)

    if (!form.name) {
      form.name = profileData?.displayName || decoded?.name || ''
    }

    stage.value = '讀取使用者資料'
    await loadUserDoc(userId.value)

    stage.value = '初始化成功'
  } catch (err) {
    console.error(err)
    error.value = err?.message || '初始化失敗'
    stage.value = '初始化失敗'
  } finally {
    loading.value = false
  }
}

async function handleSave() {
  resetMessage()

  if (!userId.value) {
    error.value = '尚未取得 userId'
    return
  }

  if (!form.name) {
    error.value = '請填寫顯示名稱'
    return
  }

  saving.value = true

  try {
    const ref = doc(db, 'users', userId.value)

    await setDoc(
      ref,
      {
        userId: userId.value,
        lineUserId: userId.value,
        name: form.name,
        nickname: form.nickname,
        occupation: form.occupation,
        pictureUrl: profile.value?.pictureUrl || '',
        displayName: profile.value?.displayName || form.name,
        status: 'active',
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    )

    success.value = '綁定成功'
    setTimeout(() => {
      router.push('/home')
    }, 500)
  } catch (err) {
    console.error(err)
    error.value = '儲存失敗，請檢查 Firebase 權限與設定'
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  initLine()
})
</script>

<style scoped>
.bind-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: #f7f8fa;
  box-sizing: border-box;
}
.bind-card {
  width: 100%;
  max-width: 520px;
  background: #fff;
  border-radius: 20px;
  padding: 28px 22px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
  box-sizing: border-box;
}
.bind-card h1 {
  margin: 0 0 8px;
  font-size: 28px;
  font-weight: 800;
  color: #111;
}
.desc {
  margin: 0 0 20px;
  color: #666;
  font-size: 14px;
}
.debug-box {
  margin-bottom: 16px;
  padding: 12px;
  background: #f6f7fb;
  border-radius: 12px;
  font-size: 12px;
  line-height: 1.7;
  word-break: break-all;
}
.status-box {
  padding: 24px 0;
  text-align: center;
}
.status-text {
  font-size: 16px;
  color: #444;
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
.profile-box {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  border-radius: 14px;
  background: #f6f7fb;
  margin-bottom: 18px;
}
.avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  object-fit: cover;
  background: #ddd;
}
.profile-info {
  min-width: 0;
}
.name {
  font-size: 16px;
  font-weight: 700;
  color: #111;
}
.user-id {
  margin-top: 4px;
  font-size: 12px;
  color: #666;
  word-break: break-all;
}
.login-box {
  margin-top: 12px;
}
.form {
  display: flex;
  flex-direction: column;
  gap: 14px;
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
.form-group input {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid #d8d8d8;
  border-radius: 12px;
  font-size: 15px;
  box-sizing: border-box;
  outline: none;
}
.form-group input:focus {
  border-color: #111;
}
.btn {
  border: none;
  border-radius: 12px;
  padding: 13px 16px;
  font-size: 15px;
  cursor: pointer;
}
.btn.primary {
  background: #111;
  color: #fff;
}
.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
