<template>
  <div class="bind-page">
    <div class="card">
      <h1>處理中...</h1>
      <p class="desc">正在導向首頁</p>

      <p v-if="error" class="error">{{ error }}</p>

      <button v-if="error" class="primary-btn" @click="goHome">
        回首頁
      </button>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const error = ref('')

function goHome() {
  router.replace('/home')
}

onMounted(() => {
  try {
    // 🔥 關鍵：所有流程已移到 HomeView
    router.replace('/home')
  } catch (err) {
    console.error('BindView redirect error:', err)
    error.value = err?.message || '跳轉失敗'
  }
})
</script>

<style scoped>
.bind-page {
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

.desc {
  color: #666;
  font-size: 15px;
  margin-bottom: 12px;
}

.error {
  color: #d93025;
  margin: 12px 0;
  font-size: 14px;
}

.primary-btn {
  width: 100%;
  padding: 12px 14px;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  cursor: pointer;
  margin-top: 10px;
  background: #2563eb;
  color: #fff;
}
</style>
