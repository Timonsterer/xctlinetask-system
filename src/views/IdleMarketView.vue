<template>
  <div class="idle-market-page">
    <header class="page-header">
      <h1>我很閒市場</h1>
      <p>看看現在誰有空，也可以快速發出邀請。</p>
    </header>

    <section class="toolbar">
      <input
        v-model.trim="keyword"
        type="text"
        class="search-input"
        placeholder="搜尋名字、地區、可幫忙內容"
      />

      <select v-model="filterType" class="filter-select">
        <option value="all">全部類型</option>
        <option value="chat">聊天</option>
        <option value="help">幫忙</option>
        <option value="hangout">出門</option>
        <option value="work">接案</option>
      </select>

      <button class="refresh-btn" @click="loadIdleUsers" :disabled="loading">
        {{ loading ? '載入中...' : '重新整理' }}
      </button>
    </section>

    <section class="my-status-card">
      <div class="my-status-top">
        <div>
          <h2>我的閒置狀態</h2>
          <p class="status-text">
            目前狀態：
            <strong>{{ myIdleEnabled ? '已公開我很閒' : '未公開' }}</strong>
          </p>
        </div>
        <button class="toggle-btn" @click="toggleMyIdleStatus" :disabled="savingMyStatus">
          {{ savingMyStatus ? '儲存中...' : myIdleEnabled ? '關閉我很閒' : '開啟我很閒' }}
        </button>
      </div>

      <div class="my-form-grid">
        <label>
          <span>可幫忙內容</span>
          <input v-model="myForm.title" type="text" placeholder="例如：可聊天、可陪買東西、可接小任務" />
        </label>

        <label>
          <span>地區</span>
          <input v-model="myForm.area" type="text" placeholder="例如：高雄鳳山" />
        </label>

        <label>
          <span>類型</span>
          <select v-model="myForm.type">
            <option value="chat">聊天</option>
            <option value="help">幫忙</option>
            <option value="hangout">出門</option>
            <option value="work">接案</option>
          </select>
        </label>

        <label>
          <span>聯絡備註</span>
          <input v-model="myForm.note" type="text" placeholder="例如：晚上比較有空" />
        </label>
      </div>
    </section>

    <p v-if="errorMessage" class="error-msg">{{ errorMessage }}</p>
    <p v-if="successMessage" class="success-msg">{{ successMessage }}</p>

    <section v-if="loading" class="state-box">
      載入中...
    </section>

    <section v-else-if="filteredUsers.length === 0" class="state-box">
      目前還沒有人公開「我很閒」。
    </section>

    <section v-else class="card-list">
      <article
        v-for="user in filteredUsers"
        :key="user.id"
        class="idle-card"
      >
        <div class="card-head">
          <div class="avatar">
            <img v-if="user.pictureUrl" :src="user.pictureUrl" alt="avatar" />
            <span v-else>{{ getInitial(user.name) }}</span>
          </div>

          <div class="card-title-wrap">
            <h3>{{ user.name || '未命名使用者' }}</h3>
            <p class="meta-line">
              <span class="type-badge">{{ typeLabel(user.type) }}</span>
              <span v-if="user.area">・{{ user.area }}</span>
            </p>
          </div>
        </div>

        <div class="card-body">
          <p class="main-title">{{ user.title || '目前有空，可被邀請' }}</p>
          <p v-if="user.note" class="note-text">{{ user.note }}</p>
          <p class="time-text">更新時間：{{ formatDateTime(user.updatedAt) }}</p>
        </div>

        <div class="card-actions">
          <button @click="openInviteModal(user)">邀請他</button>
        </div>
      </article>
    </section>

    <div v-if="inviteTarget" class="modal-overlay" @click.self="closeInviteModal">
      <div class="modal-card">
        <h3>邀請 {{ inviteTarget.name || '對方' }}</h3>

        <label class="modal-field">
          <span>活動名稱</span>
          <input v-model="inviteForm.title" type="text" placeholder="例如：一起喝咖啡 / 幫我搬東西" />
        </label>

        <label class="modal-field">
          <span>時間</span>
          <input v-model="inviteForm.timeText" type="text" placeholder="例如：今晚 8:00" />
        </label>

        <label class="modal-field">
          <span>地點</span>
          <input v-model="inviteForm.location" type="text" placeholder="例如：鳳山捷運站" />
        </label>

        <label class="modal-field">
          <span>酬勞 / 備註</span>
          <input v-model="inviteForm.reward" type="text" placeholder="例如：飲料一杯 / 500元" />
        </label>

        <div class="modal-actions">
          <button class="ghost-btn" @click="closeInviteModal">取消</button>
          <button @click="submitInvite" :disabled="sendingInvite">
            {{ sendingInvite ? '送出中...' : '送出邀請' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { addDoc, collection, doc, getDoc, getDocs, orderBy, query, serverTimestamp, setDoc, where } from 'firebase/firestore'
import { db } from '../firebase'

const loading = ref(false)
const savingMyStatus = ref(false)
const sendingInvite = ref(false)

const keyword = ref('')
const filterType = ref('all')

const errorMessage = ref('')
const successMessage = ref('')

const idleUsers = ref([])
const myIdleEnabled = ref(false)

const inviteTarget = ref(null)

const myForm = ref({
  title: '',
  area: '',
  type: 'chat',
  note: ''
})

const inviteForm = ref({
  title: '',
  timeText: '',
  location: '',
  reward: ''
})

const currentUser = ref({
  id: localStorage.getItem('lineUserId') || localStorage.getItem('userId') || '',
  name: localStorage.getItem('userName') || '',
  pictureUrl: localStorage.getItem('pictureUrl') || ''
})

const filteredUsers = computed(() => {
  const kw = keyword.value.toLowerCase()

  return idleUsers.value.filter((user) => {
    const matchKeyword =
      !kw ||
      (user.name || '').toLowerCase().includes(kw) ||
      (user.area || '').toLowerCase().includes(kw) ||
      (user.title || '').toLowerCase().includes(kw) ||
      (user.note || '').toLowerCase().includes(kw)

    const matchType =
      filterType.value === 'all' || user.type === filterType.value

    return matchKeyword && matchType
  })
})

function typeLabel(type) {
  if (type === 'chat') return '聊天'
  if (type === 'help') return '幫忙'
  if (type === 'hangout') return '出門'
  if (type === 'work') return '接案'
  return '其他'
}

function getInitial(name) {
  return (name || '?').slice(0, 1)
}

function formatDateTime(value) {
  if (!value) return '剛剛'
  const date = value?.toDate ? value.toDate() : new Date(value)
  if (Number.isNaN(date.getTime())) return '剛剛'

  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${d} ${hh}:${mm}`
}

async function loadMyIdleStatus() {
  if (!currentUser.value.id) return

  try {
    const refDoc = doc(db, 'idle_market', currentUser.value.id)
    const snap = await getDoc(refDoc)

    if (!snap.exists()) return

    const data = snap.data()
    myIdleEnabled.value = !!data.enabled
    myForm.value = {
      title: data.title || '',
      area: data.area || '',
      type: data.type || 'chat',
      note: data.note || ''
    }
  } catch (error) {
    console.error('loadMyIdleStatus error:', error)
  }
}

async function loadIdleUsers() {
  loading.value = true
  errorMessage.value = ''

  try {
    const q = query(
      collection(db, 'idle_market'),
      where('enabled', '==', true),
      orderBy('updatedAt', 'desc')
    )
    const snap = await getDocs(q)

    idleUsers.value = snap.docs
      .map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data()
      }))
      .filter((item) => item.id !== currentUser.value.id)
  } catch (error) {
    console.error('loadIdleUsers error:', error)
    errorMessage.value = '讀取我很閒市場失敗'
  } finally {
    loading.value = false
  }
}

async function toggleMyIdleStatus() {
  if (!currentUser.value.id) {
    errorMessage.value = '找不到使用者，請先完成登入'
    return
  }

  savingMyStatus.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    const nextEnabled = !myIdleEnabled.value

    await setDoc(
      doc(db, 'idle_market', currentUser.value.id),
      {
        userId: currentUser.value.id,
        name: currentUser.value.name || '未命名使用者',
        pictureUrl: currentUser.value.pictureUrl || '',
        enabled: nextEnabled,
        title: myForm.value.title || '',
        area: myForm.value.area || '',
        type: myForm.value.type || 'chat',
        note: myForm.value.note || '',
        updatedAt: serverTimestamp()
      },
      { merge: true }
    )

    myIdleEnabled.value = nextEnabled
    successMessage.value = nextEnabled ? '已開啟我很閒狀態' : '已關閉我很閒狀態'
    await loadIdleUsers()
  } catch (error) {
    console.error('toggleMyIdleStatus error:', error)
    errorMessage.value = '儲存失敗，請稍後再試'
  } finally {
    savingMyStatus.value = false
  }
}

function openInviteModal(user) {
  inviteTarget.value = user
  inviteForm.value = {
    title: '',
    timeText: '',
    location: '',
    reward: ''
  }
}

function closeInviteModal() {
  inviteTarget.value = null
}

async function submitInvite() {
  if (!inviteTarget.value) return

  if (!inviteForm.value.title.trim()) {
    errorMessage.value = '請輸入活動名稱'
    return
  }

  sendingInvite.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    await addDoc(collection(db, 'idle_invites'), {
      fromUserId: currentUser.value.id || '',
      fromUserName: currentUser.value.name || '',
      toUserId: inviteTarget.value.id,
      toUserName: inviteTarget.value.name || '',
      title: inviteForm.value.title.trim(),
      timeText: inviteForm.value.timeText.trim(),
      location: inviteForm.value.location.trim(),
      reward: inviteForm.value.reward.trim(),
      status: 'pending',
      createdAt: serverTimestamp()
    })

    successMessage.value = '邀請已送出'
    closeInviteModal()
  } catch (error) {
    console.error('submitInvite error:', error)
    errorMessage.value = '送出邀請失敗'
  } finally {
    sendingInvite.value = false
  }
}

onMounted(async () => {
  await loadMyIdleStatus()
  await loadIdleUsers()
})
</script>

<style scoped>
.idle-market-page {
  max-width: 980px;
  margin: 0 auto;
  padding: 20px;
  color: #1f2937;
}

.page-header {
  margin-bottom: 20px;
}

.page-header h1 {
  font-size: 28px;
  margin: 0 0 8px;
}

.page-header p {
  margin: 0;
  color: #6b7280;
}

.toolbar {
  display: grid;
  grid-template-columns: 1.5fr 180px 140px;
  gap: 12px;
  margin-bottom: 20px;
}

.search-input,
.filter-select,
.my-form-grid input,
.my-form-grid select,
.modal-field input {
  width: 100%;
  padding: 12px;
  border: 1px solid #d1d5db;
  border-radius: 12px;
  font-size: 14px;
  box-sizing: border-box;
}

.refresh-btn,
.toggle-btn,
.card-actions button,
.modal-actions button {
  border: none;
  border-radius: 12px;
  padding: 12px 14px;
  cursor: pointer;
  background: #111827;
  color: #fff;
  font-size: 14px;
}

.refresh-btn:disabled,
.toggle-btn:disabled,
.card-actions button:disabled,
.modal-actions button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.my-status-card {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 18px;
  padding: 18px;
  margin-bottom: 20px;
}

.my-status-top {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  margin-bottom: 16px;
}

.my-status-top h2 {
  margin: 0 0 6px;
  font-size: 20px;
}

.status-text {
  margin: 0;
  color: #6b7280;
}

.my-form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
}

.my-form-grid label,
.modal-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.my-form-grid span,
.modal-field span {
  font-size: 13px;
  color: #374151;
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

.state-box {
  padding: 28px;
  text-align: center;
  background: #f9fafb;
  border: 1px dashed #d1d5db;
  border-radius: 16px;
}

.card-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.idle-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 18px;
  padding: 16px;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.04);
}

.card-head {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 14px;
}

.avatar {
  width: 52px;
  height: 52px;
  border-radius: 999px;
  overflow: hidden;
  background: #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.card-title-wrap h3 {
  margin: 0 0 6px;
  font-size: 18px;
}

.meta-line {
  margin: 0;
  color: #6b7280;
  font-size: 13px;
}

.type-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  background: #eef2ff;
  color: #4338ca;
  font-size: 12px;
}

.card-body {
  margin-bottom: 14px;
}

.main-title {
  margin: 0 0 8px;
  font-weight: 700;
}

.note-text,
.time-text {
  margin: 0 0 6px;
  color: #6b7280;
  font-size: 14px;
}

.card-actions {
  display: flex;
  justify-content: flex-end;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(17, 24, 39, 0.45);
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
}

.modal-card {
  width: 100%;
  max-width: 460px;
  background: #fff;
  border-radius: 20px;
  padding: 20px;
}

.modal-card h3 {
  margin-top: 0;
  margin-bottom: 16px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 16px;
}

.ghost-btn {
  background: #e5e7eb !important;
  color: #111827 !important;
}

@media (max-width: 768px) {
  .toolbar {
    grid-template-columns: 1fr;
  }

  .my-status-top {
    flex-direction: column;
    align-items: stretch;
  }

  .my-form-grid {
    grid-template-columns: 1fr;
  }

  .card-list {
    grid-template-columns: 1fr;
  }
}
</style>
