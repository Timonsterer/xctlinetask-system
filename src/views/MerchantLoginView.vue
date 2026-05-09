<template>
  <div class="page">
    <div class="card">
      <h1>商家登入</h1>
      <p class="sub">此頁為商家專用，不從使用者入口登入。</p>

      <div class="tabs">
        <button :class="{ active: mode === 'login' }" @click="mode = 'login'">
          登入
        </button>
        <button :class="{ active: mode === 'register' }" @click="mode = 'register'">
          建立商家
        </button>
      </div>

      <div v-if="mode === 'register'" class="form">
        <label>商家名稱</label>
        <input v-model="form.name" placeholder="例如：楠梓早午餐" />

        <label>手機</label>
        <input v-model="form.phone" placeholder="商家手機" />

        <label>登入碼</label>
        <input v-model="form.loginCode" placeholder="自訂登入碼" />

        <label>地區</label>
        <input v-model="form.area" placeholder="例如：高雄楠梓區" />

        <label>地址</label>
        <input v-model="form.address" placeholder="商家地址" />

        <label>Google Map 連結</label>
        <input v-model="form.googleMapUrl" placeholder="貼上 Google Map 分享連結" />

        <button class="main-btn" @click="handleCreateMerchant" :disabled="loading">
          建立商家並登入
        </button>
      </div>

      <div v-else class="form">
        <label>手機</label>
        <input v-model="form.phone" placeholder="商家手機" />

        <label>登入碼</label>
        <input v-model="form.loginCode" placeholder="登入碼" />

        <button class="main-btn" @click="handleLogin" :disabled="loading">
          登入商家後台
        </button>
      </div>

      <p v-if="error" class="error">{{ error }}</p>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { createMerchant, loginMerchant } from '@/services/merchantService'

const router = useRouter()
const mode = ref('login')
const loading = ref(false)
const error = ref('')

const form = reactive({
  name: '',
  phone: '',
  loginCode: '',
  area: '',
  address: '',
  googleMapUrl: '',
})

async function handleLogin() {
  error.value = ''

  if (!form.phone || !form.loginCode) {
    error.value = '請輸入手機與登入碼'
    return
  }

  loading.value = true

  try {
    await loginMerchant({
      phone: form.phone.trim(),
      loginCode: form.loginCode.trim(),
    })

    router.push('/merchant/coupons')
  } catch (err) {
    error.value = err.message || '登入失敗'
  } finally {
    loading.value = false
  }
}

async function handleCreateMerchant() {
  error.value = ''

  if (!form.name || !form.phone || !form.loginCode || !form.area) {
    error.value = '請至少填寫商家名稱、手機、登入碼、地區'
    return
  }

  loading.value = true

  try {
    await createMerchant({
      name: form.name.trim(),
      phone: form.phone.trim(),
      loginCode: form.loginCode.trim(),
      area: form.area.trim(),
      address: form.address.trim(),
      googleMapUrl: form.googleMapUrl.trim(),
    })

    await loginMerchant({
      phone: form.phone.trim(),
      loginCode: form.loginCode.trim(),
    })

    router.push('/merchant/coupons')
  } catch (err) {
    error.value = err.message || '建立商家失敗'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #f5f7fb;
  padding: 24px;
  box-sizing: border-box;
}

.card {
  max-width: 520px;
  margin: 0 auto;
  background: white;
  border-radius: 22px;
  padding: 24px;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.08);
}

h1 {
  margin: 0;
  font-size: 28px;
}

.sub {
  color: #666;
  margin-bottom: 20px;
}

.tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  background: #eef1f7;
  padding: 5px;
  border-radius: 14px;
  margin-bottom: 20px;
}

.tabs button {
  border: none;
  background: transparent;
  padding: 12px;
  border-radius: 10px;
  font-weight: 700;
}

.tabs button.active {
  background: #111827;
  color: white;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

label {
  font-weight: 700;
  margin-top: 8px;
}

input {
  border: 1px solid #ddd;
  border-radius: 12px;
  padding: 13px;
  font-size: 16px;
}

.main-btn {
  margin-top: 18px;
  border: none;
  background: #111827;
  color: white;
  padding: 15px;
  border-radius: 14px;
  font-size: 16px;
  font-weight: 800;
}

.error {
  color: #dc2626;
  margin-top: 16px;
}
</style>
