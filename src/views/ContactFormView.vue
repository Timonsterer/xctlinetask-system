# src/views/ContactFormView.vue

```vue
<template>
  <div class="contact-page">

    <header class="header">
      <div>
        <p class="eyebrow">聯絡人管理</p>
        <h1>
          {{ isEdit ? '編輯聯絡人' : '新增聯絡人' }}
        </h1>
      </div>
    </header>

    <section class="card">

      <div class="form-grid">

        <input
          v-model="form.name"
          placeholder="姓名"
        />

        <input
          v-model="form.phone"
          placeholder="電話"
        />

        <input
          v-model="form.company"
          placeholder="公司"
        />

        <input
          v-model="form.address"
          placeholder="地址"
        />

        <textarea
          v-model="form.note"
          placeholder="備註"
        />

      </div>

      <div class="button-grid">

        <!-- 儲存 -->
        <button
          class="btn blue"
          @click="saveContact"
        >
          {{ isEdit ? '更新聯絡人' : '新增聯絡人' }}
        </button>

        <!-- 一鍵新增任務 -->
        <button
          class="btn purple"
          @click="addToTask"
        >
          新增到任務
        </button>

        <!-- Google Map -->
        <button
          class="btn green"
          @click="openGoogleMap"
        >
          Google Map 導航
        </button>

      </div>

    </section>

  </div>
</template>

<script setup>
import {
  ref,
  computed,
  onMounted,
} from 'vue'

import {
  useRoute,
  useRouter,
} from 'vue-router'

import {
  collection,
  addDoc,
  updateDoc,
  doc,
  getDoc,
  serverTimestamp,
} from 'firebase/firestore'

import { db } from '@/firebase'

const route = useRoute()
const router = useRouter()

const isEdit = computed(() => !!route.params.id)

const form = ref({
  name: '',
  phone: '',
  company: '',
  address: '',
  note: '',
})

const loadContact = async () => {

  if (!route.params.id) return

  try {

    const snap = await getDoc(
      doc(
        db,
        'contacts',
        route.params.id
      )
    )

    if (!snap.exists()) return

    form.value = {
      ...form.value,
      ...snap.data(),
    }

  } catch (err) {

    console.error(err)
  }
}

const saveContact = async () => {

  try {

    if (!form.value.name.trim()) {
      alert('請輸入姓名')
      return
    }

    const lineUserId = localStorage.getItem(
      'lineUserId'
    )

    const payload = {
      ...form.value,

      ownerId: lineUserId,

      updatedAt: serverTimestamp(),
    }

    if (isEdit.value) {

      await updateDoc(
        doc(
          db,
          'contacts',
          route.params.id
        ),
        payload
      )

    } else {

      await addDoc(
        collection(db, 'contacts'),
        {
          ...payload,
          createdAt: serverTimestamp(),
        }
      )
    }

    alert('儲存成功')

    router.push('/contacts')

  } catch (err) {

    console.error(err)

    alert('儲存失敗')
  }
}

// ⭐ 新增到任務
const addToTask = async () => {

  try {

    if (!form.value.name.trim()) {
      alert('請先輸入聯絡人姓名')
      return
    }

    const lineUserId = localStorage.getItem(
      'lineUserId'
    )

    if (!lineUserId) {
      alert('尚未登入')
      return
    }

    await addDoc(
      collection(db, 'tasks'),
      {
        title: `聯絡：${form.value.name}`,

        description:
          form.value.note || '',

        contactName:
          form.value.name,

        contactPhone:
          form.value.phone || '',

        contactCompany:
          form.value.company || '',

        contactAddress:
          form.value.address || '',

        type: 'contact_followup',

        status: 'pending',

        ownerId: lineUserId,
        userId: lineUserId,

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }
    )

    alert('已新增到任務')

  } catch (err) {

    console.error(err)

    alert('新增任務失敗')
  }
}

// ⭐ Google Map 導航
const openGoogleMap = () => {

  if (!form.value.address?.trim()) {
    alert('尚未填寫地址')
    return
  }

  const query = encodeURIComponent(
    form.value.address
  )

  window.open(
    `https://www.google.com/maps/search/?api=1&query=${query}`,
    '_blank'
  )
}

onMounted(() => {
  loadContact()
})
</script>

<style scoped>
.contact-page {
  min-height: 100vh;
  background: #f4f7fb;
  padding: 20px;
}

.header {
  margin-bottom: 20px;
}

.eyebrow {
  color: #2563eb;
  font-size: 13px;
  font-weight: bold;
}

.card {
  background: white;
  border-radius: 24px;
  padding: 20px;
}

.form-grid {
  display: grid;
  gap: 14px;
}

input,
textarea {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #ddd;
  border-radius: 14px;
  padding: 14px;
  font-size: 15px;
}

textarea {
  min-height: 120px;
}

.button-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-top: 20px;
}

.btn {
  border: none;
  border-radius: 14px;
  padding: 14px;
  color: white;
  font-weight: bold;
  cursor: pointer;
}

.blue {
  background: #2563eb;
}

.green {
  background: #059669;
}

.purple {
  background: #7c3aed;
}

@media (max-width: 768px) {

  .button-grid {
    grid-template-columns: 1fr;
  }
}
</style>
```
