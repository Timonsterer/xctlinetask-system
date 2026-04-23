<template>
  <div class="bind-page">
    <div class="bind-card">
      <h1>LINE 綁定</h1>
      <p class="desc">先取得 LINE 身分，才能進入系統</p>

      <div v-if="loading" class="status-box">
        <div class="status-text">綁定中...</div>
      </div>

      <div v-else>
        <div v-if="error" class="alert error">{{ error }}</div>
        <div v-if="success" class="alert success">{{ success }}</div>

        <div v-if="profile" class="profile-box">
          <img
            v-if="profile.pictureUrl"
            :src="profile.pictureUrl"
            class="avatar"
          />
          <div>
            <div>{{ profile.displayName }}</div>
            <div>{{ userId }}</div>
          </div>
        </div>

        <div v-if="!userId">
          <button @click="handleManualLogin">登入 LINE</button>
        </div>

        <form v-else @submit.prevent="handleSave">
          <input v-model="form.name" placeholder="名稱" />
          <input v-model="form.nickname" placeholder="暱稱" />
          <input v-model="form.occupation" placeholder="職業" />

          <button type="submit">儲存</button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { db } from '@/firebase'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { initLiff, getLiffProfile, loginLiff } from '@/utils/liff'

const router = useRouter()

const loading = ref(true)
const error = ref('')
const success = ref('')
const userId = ref('')
const profile = ref(null)

const form = reactive({
  name: '',
  nickname: '',
  occupation: '',
})

const loadUserDoc = async (id) => {
  const snap = await getDoc(doc(db, 'users', id))
  if (!snap.exists()) return

  const data = snap.data()
  form.name = data.name || ''
  form.nickname = data.nickname || ''
  form.occupation = data.occupation || ''
}

const initLine = async () => {
  try {
    await initLiff()

    const profileData = await getLiffProfile()

    if (!profileData) {
      loading.value = false   // ✅ 修正點
      return
    }

    profile.value = profileData
    userId.value = profileData.lineUserId

    localStorage.setItem('userId', userId.value)

    await loadUserDoc(userId.value)

  } catch (err) {
    console.error(err)
    error.value = '初始化失敗'
  } finally {
    loading.value = false
  }
}

const handleManualLogin = () => {
  loginLiff()
}

const handleSave = async () => {
  if (!userId.value) return

  await setDoc(doc(db, 'users', userId.value), {
    userId: userId.value,
    name: form.name,
    nickname: form.nickname,
    occupation: form.occupation,
    updatedAt: serverTimestamp(),
  }, { merge: true })

  success.value = '儲存成功'
}

onMounted(initLine)
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
  max-width: 460px;
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
