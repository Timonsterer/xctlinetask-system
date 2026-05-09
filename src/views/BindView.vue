<template>
  <div class="bind-page">
    <div class="card">
      <h1>LINE 綁定中...</h1>

      <p v-if="loading">正在取得 LINE 資料</p>
      <p v-if="error" class="error">{{ error }}</p>

      <button v-if="error" class="primary-btn" @click="retryLogin">
        重新登入
      </button>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/firebase'
import { getLiffProfile } from '@/liff'

const router = useRouter()
const loading = ref(true)
const error = ref('')

// 第一次設定管理者：把你的 LINE userId 貼在這裡
// 不知道 userId 的話，先登入一次後去 Firestore users 看文件 ID
const ADMIN_LINE_USER_IDS = [
  // 'Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
]

function retryLogin() {
  localStorage.removeItem('lineUserId')
  location.reload()
}

onMounted(async () => {
  try {
    loading.value = true
    error.value = ''

    const profile = await getLiffProfile()

    if (!profile) {
      throw new Error('無法取得 LINE 個人資料')
    }

    const userId = profile.userId

    if (!userId) {
      throw new Error('無法取得 LINE userId')
    }

    localStorage.setItem('lineUserId', userId)

    const userRef = doc(db, 'users', userId)
    const snap = await getDoc(userRef)

    const isAdmin = ADMIN_LINE_USER_IDS.includes(userId)

    if (!snap.exists()) {
      await setDoc(userRef, {
        userId,
        lineUserId: userId,
        displayName: profile.displayName || '',
        pictureUrl: profile.pictureUrl || '',
        role: isAdmin ? 'admin' : 'user',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    } else {
      const oldData = snap.data()

      await setDoc(
        userRef,
        {
          userId,
          lineUserId: userId,
          displayName: profile.displayName || '',
          pictureUrl: profile.pictureUrl || '',
          role: oldData.role || (isAdmin ? 'admin' : 'user'),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      )
    }

    router.replace('/home')
  } catch (err) {
    console.error('BindView error:', err)
    error.value = err?.message || 'LINE 綁定失敗'
    loading.value = false
  }
})
</script>

<style scoped>
.bind-page {
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(180deg, #f8fafc, #e2e8f0);
  padding: 20px;
}

.card {
  width: 100%;
  max-width: 420px;
  background: white;
  padding: 30px;
  border-radius: 16px;
  text-align: center;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
}

h1 {
  margin-bottom: 10px;
}

.error {
  color: #dc2626;
  font-size: 14px;
  margin-top: 12px;
}

.primary-btn {
  width: 100%;
  margin-top: 16px;
  padding: 12px 14px;
  border: none;
  border-radius: 12px;
  background: #2563eb;
  color: white;
  font-size: 16px;
  font-weight: 700;
}
</style>
