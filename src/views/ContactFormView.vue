<template>
  <div class="contact-form-page">
    <header class="page-header">
      <div>
        <h1>{{ isEditMode ? '編輯聯絡人' : '新增聯絡人' }}</h1>
        <p>建立客戶、朋友、合作對象資料。</p>
      </div>

      <button class="back-btn" @click="goBack">返回列表</button>
    </header>

    <section class="form-card">
      <p v-if="errorMessage" class="error-msg">{{ errorMessage }}</p>
      <p v-if="successMessage" class="success-msg">{{ successMessage }}</p>

      <form @submit.prevent="submitForm" class="contact-form">
        <label>
          <span>姓名 *</span>
          <input v-model.trim="form.name" type="text" placeholder="請輸入姓名" />
        </label>

        <label>
          <span>電話</span>
          <input v-model.trim="form.phone" type="text" placeholder="請輸入電話" />
        </label>

        <label>
          <span>Email</span>
          <input v-model.trim="form.email" type="email" placeholder="請輸入 Email" />
        </label>

        <label>
          <span>公司</span>
          <input v-model.trim="form.company" type="text" placeholder="請輸入公司名稱" />
        </label>

        <label class="full-width">
          <span>地址</span>
          <input v-model.trim="form.address" type="text" placeholder="請輸入地址" />
        </label>

        <label class="full-width">
          <span>備註</span>
          <textarea v-model.trim="form.note" rows="5" placeholder="請輸入備註"></textarea>
        </label>

        <div class="action-row">
          <button type="button" class="ghost-btn" @click="goBack">取消</button>
          <button type="submit" class="save-btn" :disabled="saving">
            {{ saving ? '儲存中...' : isEditMode ? '更新聯絡人' : '建立聯絡人' }}
          </button>
        </div>
      </form>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  updateDoc
} from 'firebase/firestore'
import { db } from '../firebase'

const router = useRouter()
const route = useRoute()

const saving = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const currentUserId =
  localStorage.getItem('lineUserId') ||
  localStorage.getItem('userId') ||
  ''

const contactId = computed(() => route.params.id || '')
const isEditMode = computed(() => !!contactId.value)

const form = ref({
  name: '',
  phone: '',
  email: '',
  company: '',
  address: '',
  note: ''
})

function goBack() {
  router.push('/contacts')
}

async function loadContact() {
  if (!isEditMode.value) return

  try {
    const contactRef = doc(db, 'users', currentUserId, 'contacts', String(contactId.value))
    const snap = await getDoc(contactRef)

    if (!snap.exists()) {
      errorMessage.value = '找不到聯絡人資料'
      return
    }

    const data = snap.data()

    form.value = {
      name: data.name || '',
      phone: data.phone || '',
      email: data.email || '',
      company: data.company || '',
      address: data.address || '',
      note: data.note || ''
    }
  } catch (error) {
    console.error('loadContact error:', error)
    errorMessage.value = '讀取聯絡人失敗'
  }
}

async function submitForm() {
  errorMessage.value = ''
  successMessage.value = ''

  if (!currentUserId) {
    errorMessage.value = '找不到使用者，請先登入'
    return
  }

  if (!form.value.name.trim()) {
    errorMessage.value = '請輸入姓名'
    return
  }

  saving.value = true

  try {
    const payload = {
      name: form.value.name.trim(),
      phone: form.value.phone.trim(),
      email: form.value.email.trim(),
      company: form.value.company.trim(),
      address: form.value.address.trim(),
      note: form.value.note.trim(),
      updatedAt: serverTimestamp()
    }

    if (isEditMode.value) {
      const contactRef = doc(db, 'users', currentUserId, 'contacts', String(contactId.value))
      await updateDoc(contactRef, payload)
      successMessage.value = '聯絡人已更新'
    } else {
      await addDoc(collection(db, 'users', currentUserId, 'contacts'), {
        ...payload,
        createdAt: serverTimestamp()
      })
      successMessage.value = '聯絡人已建立'

      form.value = {
        name: '',
        phone: '',
        email: '',
        company: '',
        address: '',
        note: ''
      }
    }

    setTimeout(() => {
      router.push('/contacts')
    }, 500)
  } catch (error) {
    console.error('submitForm error:', error)
    errorMessage.value = isEditMode.value ? '更新失敗' : '建立失敗'
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadContact()
})
</script>

<style scoped>
.contact-form-page {
  max-width: 860px;
  margin: 0 auto;
  padding: 20px;
  color: #1f2937;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}

.page-header h1 {
  margin: 0 0 8px;
  font-size: 28px;
}

.page-header p {
  margin: 0;
  color: #6b7280;
}

.back-btn,
.save-btn,
.ghost-btn {
  border: none;
  border-radius: 12px;
  padding: 12px 14px;
  cursor: pointer;
  font-size: 14px;
}

.back-btn,
.save-btn {
  background: #111827;
  color: #fff;
}

.ghost-btn {
  background: #e5e7eb;
  color: #111827;
}

.back-btn:disabled,
.save-btn:disabled,
.ghost-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.form-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 20px;
  padding: 20px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.04);
}

.error-msg,
.success-msg {
  margin: 0 0 16px;
  padding: 12px 14px;
  border-radius: 12px;
}

.error-msg {
  background: #fef2f2;
  color: #b91c1c;
}

.success-msg {
  background: #ecfdf5;
  color: #047857;
}

.contact-form {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.contact-form label {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.contact-form span {
  font-size: 14px;
  color: #374151;
}

.contact-form input,
.contact-form textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 12px;
  border: 1px solid #d1d5db;
  border-radius: 12px;
  font-size: 14px;
  font-family: inherit;
}

.contact-form textarea {
  resize: vertical;
}

.full-width {
  grid-column: 1 / -1;
}

.action-row {
  grid-column: 1 / -1;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 8px;
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: stretch;
  }

  .contact-form {
    grid-template-columns: 1fr;
  }
}
</style>
