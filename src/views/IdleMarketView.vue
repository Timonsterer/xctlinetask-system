<template>
  <div class="idle-market-page">
    <header class="page-header">
      <div>
        <h1>我很閒市場</h1>
        <p>看看誰有空，也處理別人對你的邀請。</p>
      </div>

      <div class="header-actions">
        <button class="ghost-btn" @click="goHome">
          回首頁
        </button>
        <button class="primary-btn" @click="goIdleForm">
          我要發佈我很閒
        </button>
      </div>
    </header>

    <section class="invite-panel">
      <div class="section-head">
        <h2>我收到的邀請</h2>
        <button class="ghost-btn small" @click="loadReceivedInvites" :disabled="inviteLoading">
          {{ inviteLoading ? '載入中...' : '重新整理' }}
        </button>
      </div>

      <p v-if="inviteErrorMessage" class="error-msg">{{ inviteErrorMessage }}</p>
      <p v-if="inviteSuccessMessage" class="success-msg">{{ inviteSuccessMessage }}</p>

      <div v-if="inviteLoading" class="state-box">
        載入邀請中...
      </div>

      <div v-else-if="receivedInvites.length === 0" class="state-box">
        目前沒有待處理邀請
      </div>

      <div v-else class="invite-list">
        <article
          v-for="invite in receivedInvites"
          :key="invite.id"
          class="invite-card"
        >
          <div class="invite-main">
            <div class="invite-title-row">
              <h3>{{ invite.title || '未命名邀請' }}</h3>
              <span class="invite-badge pending">待處理</span>
            </div>

            <p class="invite-line">
              邀請人：{{ invite.fromUserName || invite.fromUserId || '未知使用者' }}
            </p>

            <p v-if="invite.timeText" class="invite-line">
              時間：{{ invite.timeText }}
            </p>

            <p v-if="invite.location" class="invite-line">
              地點：{{ invite.location }}
            </p>

            <p v-if="invite.reward" class="invite-line">
              酬勞 / 備註：{{ invite.reward }}
            </p>

            <p class="invite-line subtle">
              建立時間：{{ formatDateTime(invite.createdAt) }}
            </p>
          </div>

          <div class="invite-actions">
            <button
              class="accept-btn"
              @click="updateInviteStatus(invite, 'accepted')"
              :disabled="actingInviteId === invite.id"
            >
              {{ actingInviteId === invite.id ? '處理中...' : '接受' }}
            </button>

            <button
              class="decline-btn"
              @click="updateInviteStatus(invite, 'rejected')"
              :disabled="actingInviteId === invite.id"
            >
              {{ actingInviteId === invite.id ? '處理中...' : '拒絕' }}
            </button>
          </div>
        </article>
      </div>
    </section>

    <section class="toolbar">
      <input
        v-model.trim="keyword"
        type="text"
        class="search-input"
        placeholder="搜尋名字、地區、可幫忙內容"
      />

      <select v-model="filterType" class="filter-select">
        <option value="all">全部類型</option>
        <option value="help">幫忙</option>
        <option value="hangout">出門</option>
        <option value="service">接案</option>
      </select>

      <button class="refresh-btn" @click="loadPosts" :disabled="loading">
        {{ loading ? '載入中...' : '重新整理' }}
      </button>
    </section>

    <p v-if="errorMessage" class="error-msg">{{ errorMessage }}</p>
    <p v-if="successMessage" class="success-msg">{{ successMessage }}</p>

    <section v-if="loading" class="state-box">
      載入中...
    </section>

    <section v-else-if="filteredPosts.length === 0" class="state-box">
      目前還沒有人公開「我很閒」。
    </section>

    <section v-else class="card-list">
      <article
        v-for="post in filteredPosts"
        :key="post.id"
        class="idle-card"
      >
        <div class="card-head">
          <div class="avatar">
            <span>{{ getInitial(post.ownerName) }}</span>
          </div>

          <div class="card-title-wrap">
            <h3>
              {{ post.ownerName || '未命名使用者' }}
              <span v-if="isMine(post)" class="mine-tag">（我）</span>
            </h3>
            <p class="meta-line">
              <span class="type-badge">{{ typeLabel(post.type) }}</span>
              <span v-if="post.location">・{{ post.location }}</span>
            </p>
          </div>
        </div>

        <div class="card-body">
          <p class="main-title">
            {{ post.title || '目前有空，可被邀請' }}
          </p>

          <p v-if="post.description" class="note-text">
            {{ post.description }}
          </p>

          <div v-if="post.tags?.length" class="tag-wrap">
            <span
              v-for="tag in post.tags"
              :key="tag"
              class="tag"
            >
              {{ tag }}
            </span>
          </div>

          <p v-if="post.reward" class="detail-text">
            酬勞 / 費用：{{ post.reward }}
          </p>

          <p v-if="post.startAt" class="detail-text">
            開始時間：{{ formatDateTime(post.startAt) }}
          </p>

          <p class="time-text">
            更新時間：{{ formatDateTime(post.updatedAt || post.createdAt) }}
          </p>
        </div>

        <div class="card-actions">
          <div class="card-actions">
            <button @click="openInviteModal(post)">
            {{ isMine(post) ? '邀請自己（測試）' : '邀請他' }}
          </button>
          </div>
        </div>
      </article>
    </section>

    <div
      v-if="inviteTarget"
      class="modal-overlay"
      @click.self="closeInviteModal"
    >
      <div class="modal-card">
        <h3>邀請 {{ inviteTarget.ownerName || '對方' }}</h3>

        <label class="modal-field">
          <span>活動名稱</span>
          <input
            v-model="inviteForm.title"
            type="text"
            placeholder="例如：一起喝咖啡 / 幫我搬東西"
          />
        </label>

        <label class="modal-field">
          <span>時間</span>
          <input
            v-model="inviteForm.timeText"
            type="text"
            placeholder="例如：今晚 8:00"
          />
        </label>

        <label class="modal-field">
          <span>地點</span>
          <input
            v-model="inviteForm.location"
            type="text"
            placeholder="例如：鳳山捷運站"
          />
        </label>

        <label class="modal-field">
          <span>酬勞 / 備註</span>
          <input
            v-model="inviteForm.reward"
            type="text"
            placeholder="例如：飲料一杯 / 500元"
          />
        </label>

        <div class="modal-actions">
          <button class="ghost-btn" @click="closeInviteModal">
            取消
          </button>
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
import { useRouter } from 'vue-router'
import {
  addDoc,
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db } from '@/firebase'
import { getIdlePosts } from '@/services/idleService'

const router = useRouter()

const loading = ref(false)
const sendingInvite = ref(false)
const inviteLoading = ref(false)
const actingInviteId = ref('')

const keyword = ref('')
const filterType = ref('all')

const errorMessage = ref('')
const successMessage = ref('')
const inviteErrorMessage = ref('')
const inviteSuccessMessage = ref('')

const idlePosts = ref([])
const inviteTarget = ref(null)
const receivedInvites = ref([])

const inviteForm = ref({
  title: '',
  timeText: '',
  location: '',
  reward: '',
})

const currentUser = ref({
  id:
    localStorage.getItem('userId') ||
    localStorage.getItem('lineUserId') ||
    localStorage.getItem('line_user_id') ||
    '',
  name:
    localStorage.getItem('userName') ||
    localStorage.getItem('displayName') ||
    '',
  pictureUrl: localStorage.getItem('pictureUrl') || '',
})

const filteredPosts = computed(() => {
  const kw = keyword.value.toLowerCase()

  return idlePosts.value.filter((post) => {
    if (post.isActive === false) return false

    const text = [
      post.ownerName || '',
      post.location || '',
      post.title || '',
      post.description || '',
      ...(Array.isArray(post.tags) ? post.tags : []),
    ]
      .join(' ')
      .toLowerCase()

    const matchKeyword = !kw || text.includes(kw)
    const matchType =
      filterType.value === 'all' || post.type === filterType.value

    return matchKeyword && matchType
  })
})

function resetMessage() {
  errorMessage.value = ''
  successMessage.value = ''
}

function resetInviteMessage() {
  inviteErrorMessage.value = ''
  inviteSuccessMessage.value = ''
}

function typeLabel(type) {
  if (type === 'help') return '幫忙'
  if (type === 'hangout') return '出門'
  if (type === 'service') return '接案'
  return '其他'
}

function getInitial(name) {
  return (name || '?').slice(0, 1)
}

function isMine(post) {
  const ownerId = post.ownerId || post.userId || ''
  return !!currentUser.value.id && ownerId === currentUser.value.id
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

async function loadPosts() {
  loading.value = true
  resetMessage()

  try {
    const posts = await getIdlePosts()
    idlePosts.value = posts
  } catch (error) {
    console.error('loadPosts error:', error)
    errorMessage.value = '讀取我很閒市場失敗'
  } finally {
    loading.value = false
  }
}

async function loadReceivedInvites() {
  inviteLoading.value = true
  resetInviteMessage()

  try {
    if (!currentUser.value.id) {
      inviteErrorMessage.value = '找不到使用者，請先完成登入'
      receivedInvites.value = []
      return
    }

    const q = query(
      collection(db, 'idle_invites'),
      where('toUserId', '==', currentUser.value.id),
      where('status', '==', 'pending')
    )

    const snap = await getDocs(q)

    receivedInvites.value = snap.docs
      .map((item) => ({
        id: item.id,
        ...item.data(),
      }))
      .sort((a, b) => {
        const aTime =
          typeof a.createdAt?.toDate === 'function'
            ? a.createdAt.toDate().getTime()
            : 0

        const bTime =
          typeof b.createdAt?.toDate === 'function'
            ? b.createdAt.toDate().getTime()
            : 0

        return bTime - aTime
      })
  } catch (error) {
    console.error('loadReceivedInvites error:', error)
    inviteErrorMessage.value =
      error?.message || '讀取受邀狀態失敗'
  } finally {
    inviteLoading.value = false
  }
}

function openInviteModal(post) {
  inviteTarget.value = post
  inviteForm.value = {
    title: '',
    timeText: '',
    location: '',
    reward: '',
  }
}

function closeInviteModal() {
  inviteTarget.value = null
}

async function submitInvite() {
  if (!inviteTarget.value) return

  resetMessage()

  if (!currentUser.value.id) {
    errorMessage.value = '找不到使用者，請先完成登入'
    return
  }

  if (!inviteForm.value.title.trim()) {
    errorMessage.value = '請輸入活動名稱'
    return
  }

  sendingInvite.value = true

  try {
    await addDoc(collection(db, 'idle_invites'), {
      fromUserId: currentUser.value.id,
      fromUserName: currentUser.value.name || '',
      toUserId: inviteTarget.value.ownerId || inviteTarget.value.userId || '',
      toUserName: inviteTarget.value.ownerName || '',
      postId: inviteTarget.value.id,

      title: inviteForm.value.title.trim(),
      timeText: inviteForm.value.timeText.trim(),
      location: inviteForm.value.location.trim(),
      reward: inviteForm.value.reward.trim(),

      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    successMessage.value = '邀請已送出'
    closeInviteModal()

    if (
      (inviteTarget.value.ownerId || inviteTarget.value.userId || '') === currentUser.value.id
    ) {
      await loadReceivedInvites()
    }
  } catch (error) {
    console.error('submitInvite error:', error)
    errorMessage.value = '送出邀請失敗'
  } finally {
    sendingInvite.value = false
  }
}

async function updateInviteStatus(invite, status) {
  if (!invite?.id) return

  actingInviteId.value = invite.id
  resetInviteMessage()

  try {
    await updateDoc(doc(db, 'idle_invites', invite.id), {
      status,
      updatedAt: serverTimestamp(),
    })

    inviteSuccessMessage.value =
      status === 'accepted' ? '已接受邀請' : '已拒絕邀請'

    receivedInvites.value = receivedInvites.value.filter(
      (item) => item.id !== invite.id
    )
  } catch (error) {
    console.error('updateInviteStatus error:', error)
    inviteErrorMessage.value = '更新邀請狀態失敗'
  } finally {
    actingInviteId.value = ''
  }
}

function goIdleForm() {
  router.push({ name: 'idle-form' })
}

function goHome() {
  router.push({ name: 'home' })
}

onMounted(async () => {
  await Promise.all([loadPosts(), loadReceivedInvites()])
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
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.page-header h1 {
  font-size: 28px;
  margin: 0 0 8px;
}

.page-header p {
  margin: 0;
  color: #6b7280;
}

.header-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.invite-panel {
  margin-bottom: 24px;
  padding: 18px;
  border: 1px solid #e5e7eb;
  border-radius: 18px;
  background: #fffaf0;
}

.section-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}

.section-head h2 {
  margin: 0;
  font-size: 20px;
}

.invite-list {
  display: grid;
  gap: 12px;
}

.invite-card {
  border: 1px solid #f3e8c8;
  background: #ffffff;
  border-radius: 16px;
  padding: 16px;
  display: flex;
  justify-content: space-between;
  gap: 14px;
  align-items: flex-start;
}

.invite-main {
  flex: 1;
}

.invite-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}

.invite-title-row h3 {
  margin: 0;
  font-size: 18px;
}

.invite-badge {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 700;
}

.invite-badge.pending {
  background: #fef3c7;
  color: #92400e;
}

.invite-line {
  margin: 6px 0;
  color: #374151;
  line-height: 1.5;
}

.invite-line.subtle {
  color: #6b7280;
  font-size: 13px;
}

.invite-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.accept-btn,
.decline-btn,
.refresh-btn,
.primary-btn,
.card-actions button,
.modal-actions button {
  border: none;
  border-radius: 12px;
  padding: 12px 14px;
  cursor: pointer;
  font-size: 14px;
}

.accept-btn,
.refresh-btn,
.primary-btn,
.card-actions button,
.modal-actions button {
  background: #111827;
  color: #fff;
}

.decline-btn {
  background: #fee2e2;
  color: #b91c1c;
}

.ghost-btn {
  border: 1px solid #d1d5db;
  border-radius: 12px;
  padding: 12px 14px;
  cursor: pointer;
  background: #fff;
  color: #111827;
  font-size: 14px;
}

.ghost-btn.small {
  padding: 8px 12px;
  font-size: 13px;
}

.toolbar {
  display: grid;
  grid-template-columns: 1.5fr 180px 140px;
  gap: 12px;
  margin-bottom: 20px;
}

.search-input,
.filter-select,
.modal-field input {
  width: 100%;
  padding: 12px;
  border: 1px solid #d1d5db;
  border-radius: 12px;
  font-size: 14px;
  box-sizing: border-box;
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
}

.card-head {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}

.avatar {
  width: 48px;
  height: 48px;
  border-radius: 999px;
  background: #111827;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  overflow: hidden;
  flex-shrink: 0;
}

.card-title-wrap h3 {
  margin: 0 0 6px;
  font-size: 18px;
}

.meta-line {
  margin: 0;
  color: #6b7280;
  font-size: 14px;
}

.mine-tag {
  font-size: 13px;
  color: #2563eb;
  font-weight: 700;
}

.type-badge {
  display: inline-block;
  background: #eef2ff;
  color: #4338ca;
  border-radius: 999px;
  padding: 4px 8px;
  font-size: 12px;
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.main-title {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
}

.note-text,
.detail-text,
.time-text {
  margin: 0;
  color: #4b5563;
  font-size: 14px;
  line-height: 1.6;
}

.tag-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag {
  font-size: 12px;
  background: #f3f4f6;
  color: #374151;
  border-radius: 999px;
  padding: 5px 10px;
}

.card-actions {
  margin-top: 16px;
}

.card-actions button {
  width: 100%;
}

.self-btn {
  width: 100%;
  border: none;
  border-radius: 12px;
  padding: 12px 14px;
  background: #e5e7eb;
  color: #6b7280;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(17, 24, 39, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  z-index: 20;
}

.modal-card {
  width: 100%;
  max-width: 460px;
  background: #fff;
  border-radius: 18px;
  padding: 20px;
}

.modal-card h3 {
  margin: 0 0 16px;
}

.modal-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 14px;
}

.modal-field span {
  font-size: 13px;
  color: #374151;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 18px;
}

@media (max-width: 720px) {
  .idle-market-page {
    padding: 16px;
  }

  .page-header,
  .section-head,
  .invite-card {
    flex-direction: column;
  }

  .toolbar {
    grid-template-columns: 1fr;
  }

  .modal-actions,
  .invite-actions {
    flex-direction: column;
  }
}
</style>
