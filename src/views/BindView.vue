<template>
  <div class="bind-page">
    <div class="card">
      <h1>綁定中...</h1>

      <p v-if="loading">正在取得 LINE 資料</p>
      <p v-if="error" class="error">{{ error }}</p>
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

onMounted(async () => {
  try {
    const profile = await getLiffProfile()

    // 🔥 如果還沒登入 → getLiffProfile 會觸發 login
    if (!profile) {
      return
    }

    const userId = profile.userId

    if (!userId) {
      throw new Error('無法取得 LINE userId')
    }

    // 存到 localStorage（你整個系統都靠這個）
    localStorage.setItem('lineUserId', userId)

    const userRef = doc(db, 'users', userId)
    const snap = await getDoc(userRef)

    if (!snap.exists()) {
      // 新使用者
      await setDoc(userRef, {
        userId,
        displayName: profile.displayName,
        pictureUrl: profile.pictureUrl,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    } else {
      // 更新資料
      await setDoc(
        userRef,
        {
          displayName: profile.displayName,
          pictureUrl: profile.pictureUrl,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      )
    }

    // ✅ 成功 → 進首頁
    router.replace('/home')
  } catch (err) {
    console.error(err)
    error.value = err.message || '綁定失敗'
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
}

.card {
  background: white;
  padding: 30px;
  border-radius: 16px;
  text-align: center;
  box-shadow: 0 10px 30px rgba(0,0,0,0.1);
}

h1 {
  margin-bottom: 10px;
}

.error {
  color: red;
}
</style>
