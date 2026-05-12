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
.contact-form-page {
  max-width: 760px;
  margin: 0 auto;
}

.page-header {
  display: flex;

  justify-content: space-between;

  align-items: flex-start;

  gap: 16px;

  margin-bottom: 18px;
}

.eyebrow {
  margin: 0 0 6px;

  font-size: 12px;
  font-weight: 900;

  letter-spacing: 2px;

  color: #9b7b00;
}

.form-card {
  overflow: hidden;
}

.form-grid {
  display: grid;

  gap: 8px;
}

.switch-box {
  margin-top: 12px;

  background: #fff8e8;

  border:
    2px solid #1e1e1e;

  border-radius: 18px;

  padding: 14px;
}

.switch-row {
  display: flex;

  gap: 12px;

  align-items: flex-start;
}

.switch-row input {
  width: 22px;
  height: 22px;

  flex: 0 0 22px;

  margin: 2px 0 0;

  padding: 0;

  accent-color: #ffd84d;
}

.switch-row span {
  display: flex;
  flex-direction: column;

  gap: 4px;
}

.switch-row strong {
  font-size: 15px;
  font-weight: 900;
}

.switch-row small {
  color: #666;

  font-size: 13px;
  font-weight: 700;
}

/* =========================
   橫3按鈕
========================= */

.action-grid {
  display: grid;

  grid-template-columns:
    repeat(3, minmax(0, 1fr));

  gap: 10px;

  margin-top: 20px;
}

.action-btn {
  min-height: 72px;

  padding: 10px 6px;

  display: flex;

  flex-direction: column;

  justify-content: center;
  align-items: center;

  gap: 4px;

  text-align: center;
}

.action-btn span {
  font-size: 15px;
  font-weight: 900;
}

.action-btn small {
  font-size: 12px;
  font-weight: 800;

  color: #333;
}

.preview-box {
  margin-top: 20px;

  background: #fff8e8;

  border:
    2px solid #1e1e1e;

  border-radius: 18px;

  padding: 16px;
}

.preview-box h3 {
  margin: 0 0 10px;

  font-size: 18px;
  font-weight: 900;
}

.preview-box p {
  margin: 0;

  color: #555;

  font-size: 14px;
  font-weight: 700;

  line-height: 1.7;
}

@media (max-width: 768px) {
  .contact-form-page {
    max-width: 100%;
  }

  .page-header {
    flex-direction: column;
  }

  .page-header button {
    width: 100%;
  }

  .action-grid {
    grid-template-columns:
      repeat(3, minmax(0, 1fr));

    gap: 8px;
  }

  .action-btn {
    min-height: 66px;

    padding: 8px 4px;
  }

  .action-btn span {
    font-size: 14px;
  }

  .action-btn small {
    font-size: 11px;
  }
}
</style>
