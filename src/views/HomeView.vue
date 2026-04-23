<template>
  <div class="home-page">
    <div class="card">
      <template v-if="loading">
        <h1>載入中...</h1>
        <p>正在確認 LINE 登入狀態</p>
      </template>

      <template v-else-if="error">
        <h1>發生錯誤</h1>
        <p class="error">{{ error }}</p>
        <button class="primary-btn" @click="initPage">重新載入</button>
      </template>

      <template v-else-if="!isBound">
        <h1>歡迎使用</h1>

        <div v-if="profile" class="profile-box">
          <img
            v-if="profile.pictureUrl"
            :src="profile.pictureUrl"
            alt="avatar"
            class="avatar"
          />
          <p class="line-name">LINE 名稱：{{ profile.displayName }}</p>
        </div>

        <div class="bind-box">
          <label class="label">請輸入你的暱稱</label>
          <input
            v-model.trim="nickname"
            type="text"
            class="input"
            placeholder="例如：Tim"
            maxlength="20"
          />

          <button
            class="primary-btn"
            :disabled="binding || !nickname"
            @click="bindAccount"
          >
            {{ binding ? '綁定中...' : '完成綁定' }}
          </button>
        </div>
      </template>

      <template v-else>
        <h1>首頁</h1>

        <div class="profile-box">
          <img
            v-if="userData.pictureUrl"
            :src="userData.pictureUrl"
            alt="avatar"
            class="avatar"
          />
          <p><strong>暱稱：</strong>{{ userData.nickname || userData.displayName }}</p>
          <p><strong>LINE 名稱：</strong>{{ userData.displayName }}</p>
        </div>

        <div class="action-list">
          <button class="primary-btn" @click="goTaskForm">新增任務</button>
          <button class="secondary-btn" @click="goTaskHistory">任務紀錄</button>
          <button class="secondary-btn" @click="goIdleForm">我很閒</button>
          <button class="secondary-btn" @click="goIdleMarket">閒置列表</button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/firebase'
import { initLiff, getLiffProfile } from '@/liff'

const router = useRouter()

const loading = ref(true)
const binding = ref(false)
const error = ref('')

const profile = ref(null)
const isBound = ref(false)
const nickname = ref('')
const userData = ref(null)

async function initPage() {
  loading.value = true
  error.value = ''

  try {
    await initLiff()

    const lineProfile = await getLiffProfile()
    profile.value = lineProfile

    const userId = lineProfile.userId
    const userRef = doc(db, 'users', userId)
    const userSnap = await getDoc(userRef)

    if (userSnap.exists()) {
      isBound.value = true
      userData.value = userSnap.data()
    } else {
      isBound.value = false
      nickname.value = lineProfile.displayName || ''
    }
  } catch (err) {
    console.error('Home init error:', err)
    error.value = err?.message || '初始化失敗，請稍後再試'
  } finally {
    loading.value = false
  }
}

async function bindAccount() {
  if (!profile.value?.userId) {
    error.value = '找不到 LINE 使用者資料'
    return
  }

  if (!nickname.value) {
    error.value = '請先輸入暱稱'
    return
  }

  binding.value = true
  error.value = ''

  try {
    const userRef = doc(db, 'users', profile.value.userId)

    const payload = {
      lineUserId: profile.value.userId,
      displayName: profile.value.displayName || '',
      pictureUrl: profile.value.pictureUrl || '',
      nickname: nickname.value,
      statusMessage: profile.value.statusMessage || '',
      updatedAt: serverTimestamp(),
    }

    const userSnap = await getDoc(userRef)

    if (!userSnap.exists()) {
      payload.createdAt = serverTimestamp()
    }

    await setDoc(userRef, payload, { merge: true })

    isBound.value = true
    userData.value = {
      ...payload,
      createdAt: userSnap.exists() ? userSnap.data()?.createdAt || null : new Date(),
    }
  } catch (err) {
    console.error('Bind account error:', err)
    error.value = err?.message || '綁定失敗，請稍後再試'
  } finally {
    binding.value = false
  }
}

function goTaskForm() {
  router.push('/task-form')
}

function goTaskHistory() {
  router.push('/task-history')
}

function goIdleForm() {
  router.push('/idle-form')
}

function goIdleMarket() {
  router.push('/idle-market')
}

initPage()
</script>

<style scoped>
.home-page {
  min-height: 100vh;
  background: #f5f7fb;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 24px;
}

.card {
  width: 100%;
  max-width: 420px;
  background: #fff;
  border-radius: 20px;
  padding: 28px 22px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
  text-align: center;
}

h1 {
  font-size: 28px;
  margin-bottom: 12px;
  color: #222;
}

.profile-box {
  margin: 20px 0;
}

.avatar {
  width: 88px;
  height: 88px;
  border-radius: 50%;
  object-fit: cover;
  margin-bottom: 12px;
  border: 3px solid #e9eef7;
}

.line-name {
  color: #444;
  font-size: 15px;
}

.bind-box {
  margin-top: 20px;
  text-align: left;
}

.label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  color: #444;
}

.input {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid #d8deea;
  border-radius: 12px;
  font-size: 16px;
  margin-bottom: 14px;
  box-sizing: border-box;
}

.primary-btn,
.secondary-btn {
  width: 100%;
  padding: 12px 14px;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  cursor: pointer;
  margin-top: 10px;
}

.primary-btn {
  background: #2563eb;
  color: #fff;
}

.primary-btn:disabled {
  background: #9db8f5;
  cursor: not-allowed;
}

.secondary-btn {
  background: #eef2ff;
  color: #1e3a8a;
}

.action-list {
  margin-top: 24px;
}

.error {
  color: #d93025;
  margin: 12px 0;
  font-size: 14px;
}
</style>
