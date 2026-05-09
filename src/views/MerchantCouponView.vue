<template>
  <div class="page">
    <header class="top">
      <div>
        <h1>商家優惠券</h1>
        <p>上傳圖片優惠券，讓使用者加入探店任務或口袋名單。</p>
      </div>

      <button class="logout" @click="handleLogout">登出</button>
    </header>

    <section class="card">
      <h2>新增優惠券</h2>

      <div class="form">
        <label>優惠標題</label>
        <input v-model="form.title" placeholder="例如：憑券套餐折 50 元" />

        <label>優惠說明</label>
        <textarea v-model="form.description" placeholder="例如：限平日使用，每人限用一次"></textarea>

        <label>地區</label>
        <input v-model="form.area" placeholder="例如：高雄楠梓區" />

        <label>地址</label>
        <input v-model="form.address" placeholder="店家地址" />

        <label>Google Map 連結</label>
        <input v-model="form.googleMapUrl" placeholder="貼上 Google Map 分享連結" />

        <label>優惠券圖片</label>
        <input type="file" accept="image/*" @change="handleImageChange" />

        <img v-if="form.imageBase64" :src="form.imageBase64" class="preview" />

        <button class="main-btn" @click="handleCreateCoupon" :disabled="loading">
          建立優惠券
        </button>
      </div>

      <p v-if="error" class="error">{{ error }}</p>
    </section>

    <section class="list">
      <h2>我的優惠券</h2>

      <div v-if="coupons.length === 0" class="empty">
        尚未建立優惠券
      </div>

      <div v-for="coupon in coupons" :key="coupon.id" class="coupon">
        <img v-if="coupon.imageBase64" :src="coupon.imageBase64" />

        <div class="coupon-body">
          <div class="row">
            <h3>{{ coupon.title }}</h3>
            <span :class="coupon.isActive ? 'active' : 'inactive'">
              {{ coupon.isActive ? '上架中' : '已下架' }}
            </span>
          </div>

          <p>{{ coupon.description }}</p>
          <p class="meta">{{ coupon.area }}｜{{ coupon.address }}</p>

          <div class="actions">
            <button @click="toggleStatus(coupon)">
              {{ coupon.isActive ? '下架' : '重新上架' }}
            </button>
            <button class="danger" @click="removeCoupon(coupon.id)">
              刪除
            </button>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  createCoupon,
  deleteCoupon,
  getCurrentMerchantId,
  getMerchantById,
  getMerchantCoupons,
  logoutMerchant,
  updateCouponStatus,
} from '@/services/merchantService'

const router = useRouter()
const merchantId = ref('')
const merchant = ref(null)
const coupons = ref([])
const loading = ref(false)
const error = ref('')

const form = reactive({
  title: '',
  description: '',
  area: '',
  address: '',
  googleMapUrl: '',
  imageBase64: '',
})

onMounted(async () => {
  merchantId.value = getCurrentMerchantId()

  if (!merchantId.value) {
    router.push('/merchant/login')
    return
  }

  merchant.value = await getMerchantById(merchantId.value)

  if (!merchant.value) {
    logoutMerchant()
    router.push('/merchant/login')
    return
  }

  form.area = merchant.value.area || ''
  form.address = merchant.value.address || ''
  form.googleMapUrl = merchant.value.googleMapUrl || ''

  await loadCoupons()
})

async function loadCoupons() {
  coupons.value = await getMerchantCoupons(merchantId.value)
}

function handleImageChange(event) {
  const file = event.target.files?.[0]
  if (!file) return

  const reader = new FileReader()

  reader.onload = () => {
    form.imageBase64 = reader.result
  }

  reader.readAsDataURL(file)
}

async function handleCreateCoupon() {
  error.value = ''

  if (!form.title || !form.area) {
    error.value = '請至少填寫優惠標題與地區'
    return
  }

  loading.value = true

  try {
    await createCoupon({
      merchantId: merchantId.value,
      merchantName: merchant.value?.name || '',
      title: form.title.trim(),
      description: form.description.trim(),
      area: form.area.trim(),
      address: form.address.trim(),
      googleMapUrl: form.googleMapUrl.trim(),
      imageBase64: form.imageBase64,
    })

    form.title = ''
    form.description = ''
    form.imageBase64 = ''

    await loadCoupons()
  } catch (err) {
    error.value = err.message || '建立優惠券失敗'
  } finally {
    loading.value = false
  }
}

async function toggleStatus(coupon) {
  await updateCouponStatus(coupon.id, !coupon.isActive)
  await loadCoupons()
}

async function removeCoupon(id) {
  const ok = window.confirm('確定刪除此優惠券？')
  if (!ok) return

  await deleteCoupon(id)
  await loadCoupons()
}

function handleLogout() {
  logoutMerchant()
  router.push('/merchant/login')
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #f5f7fb;
  padding: 20px;
  box-sizing: border-box;
}

.top {
  max-width: 900px;
  margin: 0 auto 18px;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

h1,
h2,
h3 {
  margin: 0;
}

.top p {
  color: #666;
}

.logout {
  border: none;
  background: #e5e7eb;
  padding: 12px 16px;
  border-radius: 12px;
  font-weight: 700;
}

.card,
.list {
  max-width: 900px;
  margin: 0 auto 20px;
  background: white;
  border-radius: 22px;
  padding: 20px;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.08);
}

.form {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 16px;
}

label {
  font-weight: 800;
}

input,
textarea {
  border: 1px solid #ddd;
  border-radius: 12px;
  padding: 13px;
  font-size: 16px;
}

textarea {
  min-height: 90px;
}

.preview {
  width: 100%;
  max-height: 280px;
  object-fit: contain;
  border-radius: 14px;
  background: #f3f4f6;
}

.main-btn {
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
}

.empty {
  color: #777;
  padding: 20px 0;
}

.coupon {
  display: grid;
  grid-template-columns: 180px 1fr;
  gap: 16px;
  border: 1px solid #eee;
  border-radius: 18px;
  padding: 14px;
  margin-top: 14px;
}

.coupon img {
  width: 100%;
  height: 140px;
  object-fit: cover;
  border-radius: 14px;
  background: #f3f4f6;
}

.coupon-body p {
  color: #555;
}

.row {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

.active {
  color: #16a34a;
  font-weight: 800;
}

.inactive {
  color: #999;
  font-weight: 800;
}

.meta {
  font-size: 14px;
}

.actions {
  display: flex;
  gap: 10px;
}

.actions button {
  border: none;
  background: #e5e7eb;
  padding: 10px 14px;
  border-radius: 10px;
  font-weight: 700;
}

.actions .danger {
  background: #fee2e2;
  color: #dc2626;
}

@media (max-width: 700px) {
  .coupon {
    grid-template-columns: 1fr;
  }
}
</style>
