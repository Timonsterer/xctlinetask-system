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
        ></textarea>
      </div>

      <div class="button-grid">
        <button
          class="btn blue"
          @click="saveContact"
          :disabled="saving"
        >
          {{ saving ? '儲存中...' : isEdit ? '更新聯絡人' : '新增聯絡人' }}
        </button>

        <button
          class="btn purple"
          @click="addToTask"
        >
          新增到任務
        </button>

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

const saving = ref(false)

const currentUserId =
  localStorage.getItem('lineUserId') ||
  localStorage.getItem('userId') ||
  ''

const contactId = computed(() => route.params.id || '')
const isEdit = computed(() => !!contactId.value)

const form = ref({
  name: '',
  phone: '',
  company: '',
  address: '',
  note: '',
})

function contactRef(id) {
  return doc(
    db,
    'users',
    currentUserId,
    'contacts',
    id
  )
}

function contactsCollectionRef() {
  return collection(
    db,
    'users',
    currentUserId,
    'contacts'
  )
}

async function loadContact() {
  if (!isEdit.value) return

  if (!currentUserId) {
    alert('找不到使用者，請先登入')
    router.push('/contacts')
    return
  }

  try {
    const snap = await getDoc(
      contactRef(contactId.value)
    )

    if (!snap.exists()) {
      alert('找不到聯絡人')
      router.push('/contacts')
      return
    }

    const data = snap.data()

    form.value = {
      name: data.name || '',
      phone: data.phone || '',
      company: data.company || '',
      address: data.address || '',
      note: data.note || '',
    }
  } catch (err) {
    console.error(err)
    alert('讀取聯絡人失敗')
  }
}

async function saveContact() {
  if (!form.value.name.trim()) {
    alert('請輸入姓名')
    return
  }

  if (!currentUserId) {
    alert('找不到使用者，請先登入')
    return
  }

  saving.value = true

  try {
    const payload = {
      name: form.value.name || '',
      phone: form.value.phone || '',
      company: form.value.company || '',
      address: form.value.address || '',
      note: form.value.note || '',
      ownerId: currentUserId,
      updatedAt: serverTimestamp(),
    }

    if (isEdit.value) {
      await updateDoc(
        contactRef(contactId.value),
        payload
      )
    } else {
      await addDoc(
        contactsCollectionRef(),
        {
          ...payload,
          createdAt: serverTimestamp(),
        }
      )
    }

    alert(
      isEdit.value
        ? '更新成功'
        : '新增成功'
    )

    router.push('/contacts')
  } catch (err) {
    console.error(err)

    alert(
      isEdit.value
        ? '更新失敗'
        : '新增失敗'
    )
  } finally {
    saving.value = false
  }
}

async function addToTask() {
  if (!form.value.name.trim()) {
    alert('請先輸入聯絡人姓名')
    return
  }

  if (!currentUserId) {
    alert('尚未登入')
    return
  }

  try {
    await addDoc(
      collection(db, 'tasks'),
      {
        title: `聯絡：${form.value.name}`,
        content: form.value.note || '',
        contactName: form.value.name,
        contactPhone: form.value.phone || '',
        contactCompany: form.value.company || '',
        contactAddress: form.value.address || '',
        type: 'contact_followup',
        status: 'pending',
        ownerId: currentUserId,
        userId: currentUserId,
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

function openGoogleMap() {
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

.btn:disabled {
  opacity: 0.6;
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
