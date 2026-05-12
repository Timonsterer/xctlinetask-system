<template>
  <div class="page idle-market-page">
    <header class="card page-header">
      <div>
        <p class="eyebrow">IDLE MARKET</p>

        <h1 class="title">
          我很閒市場
        </h1>

        <p class="sub">
          看看現在誰有空、可幫忙、可聊天、可接案。
        </p>
      </div>

      <button
        class="btn btn-small"
        @click="goIdleForm"
      >
        ＋ 我也要上架
      </button>
    </header>

    <section
      v-if="receivedInvites.length > 0"
      class="card invite-panel"
    >
      <div class="invite-panel-head">
        <div>
          <p class="eyebrow">XCT 任務小秘</p>
          <h2>你收到新的邀約</h2>
        </div>

        <span class="badge badge-yellow">
          {{ receivedInvites.length }} 則待回覆
        </span>
      </div>

      <div
        v-for="invite in receivedInvites"
        :key="invite.id"
        class="invite-card"
      >
        <h3>{{ invite.title || '未命名邀約' }}</h3>

        <p>
          <strong>邀約人：</strong>
          {{ invite.fromUserName || '有人' }}
        </p>

        <p>
          <strong>邀約內容：</strong>
          {{ invite.detail || invite.content || '未填寫' }}
        </p>

        <p>
          <strong>邀約時間：</strong>
          {{ invite.inviteTime || '未填寫' }}
        </p>

        <p>
          <strong>邀約地點：</strong>
          {{ invite.locationText || '未填寫' }}
        </p>

        <p v-if="invite.note">
          <strong>備註：</strong>
          {{ invite.note }}
        </p>

        <div class="invite-actions">
          <button
            class="btn btn-green"
            @click="replyInvite(invite, 'accepted')"
          >
            同意
          </button>

          <button
            class="btn btn-red"
            @click="replyInvite(invite, 'rejected')"
          >
            拒絕
          </button>
        </div>
      </div>
    </section>

    <section class="card-soft filter-box">
      <label>搜尋閒置村民</label>

      <input
        v-model="keyword"
        placeholder="搜尋名稱 / 技能 / 地點"
      />
    </section>

    <section
      v-if="filteredUsers.length === 0"
      class="empty"
    >
      目前沒有人掛在線上
    </section>

    <section
      v-else
      class="user-list"
    >
      <div
        v-for="user in filteredUsers"
        :key="user.id"
        class="card user-card"
      >
        <div class="user-top">
          <div class="avatar">
            {{
              (user.displayName || '?')
                .slice(0, 1)
            }}
          </div>

          <div class="user-info">
            <div class="name-row">
              <h2>
                {{
                  user.displayName ||
                  '未命名'
                }}
              </h2>

              <span class="badge badge-green">
                在線
              </span>
            </div>

            <p class="title-text">
              {{
                user.title ||
                '目前可接受邀約'
              }}
            </p>

            <p class="location">
              📍
              {{
                user.locationText ||
                '未設定地點'
              }}
            </p>
          </div>
        </div>

        <div
          v-if="user.note"
          class="note-box"
        >
          {{ user.note }}
        </div>

        <div class="tags">
          <span
            v-if="user.canHelp"
            class="badge badge-blue"
          >
            可幫忙
          </span>

          <span
            v-if="user.canChat"
            class="badge badge-purple"
          >
            可聊天
          </span>

          <span
            v-if="user.canWork"
            class="badge badge-yellow"
          >
            可接案
          </span>

          <span
            v-if="user.canMeet"
            class="badge badge-green"
          >
            可見面
          </span>
        </div>

        <div class="time-box">
          <div>
            ⏰ 開始：
            {{
              formatTime(
                user.availableFromText
              )
            }}
          </div>

          <div>
            🌙 結束：
            {{
              formatTime(
                user.availableToText
              )
            }}
          </div>
        </div>

        <div
          v-if="inviteTargetId === user.id"
          class="invite-form"
        >
          <label>邀約標題</label>
          <input
            v-model="inviteForm.title"
            placeholder="例如：一起吃飯 / 幫忙搬東西 / 討論案子"
          />

          <label>邀約內容</label>
          <textarea
            v-model="inviteForm.detail"
            rows="4"
            placeholder="請說明你想邀約對方做什麼、需要多久、要準備什麼"
          ></textarea>

          <label>邀約時間</label>
          <input
            v-model="inviteForm.inviteTime"
            placeholder="例如：今天晚上 8 點 / 5月13日 14:00"
          />

          <label>邀約地點</label>
          <input
            v-model="inviteForm.locationText"
            placeholder="例如：高雄巨蛋 / 線上 / 某某咖啡廳"
          />

          <label>備註</label>
          <textarea
            v-model="inviteForm.note"
            rows="3"
            placeholder="補充說明，可不填"
          ></textarea>

          <div class="invite-actions">
            <button
              class="btn btn-green"
              @click="submitInvite(user)"
            >
              送出邀約
            </button>

            <button
              class="btn btn-secondary"
              @click="cancelInvite"
            >
              取消
            </button>
          </div>
        </div>

        <div class="action-grid">
          <button
            class="btn btn-green action-btn"
            @click="openInviteForm(user)"
          >
            <span>邀約</span>
            <small>填寫細節</small>
          </button>

          <button
            class="btn btn-blue action-btn"
            @click="addTask(user)"
          >
            <span>任務</span>
            <small>加入行程</small>
          </button>

          <button
            class="btn btn-secondary action-btn"
            @click="openMap(user)"
          >
            <span>導航</span>
            <small>Google Map</small>
          </button>

          <button
            class="btn btn-red action-btn"
            @click="viewProfile(user)"
          >
            <span>查看</span>
            <small>詳細資訊</small>
          </button>
        </div>
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
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore'

import { useRouter } from 'vue-router'
import { db } from '@/firebase'

const router = useRouter()

const keyword = ref('')
const users = ref([])
const receivedInvites = ref([])

const inviteTargetId = ref('')

const inviteForm = ref({
  title: '',
  detail: '',
  inviteTime: '',
  locationText: '',
  note: '',
})

const currentUserId =
  localStorage.getItem('lineUserId') ||
  localStorage.getItem('userId') ||
  localStorage.getItem('line_user_id') ||
  ''

const currentUserName =
  localStorage.getItem('displayName') ||
  localStorage.getItem('lineDisplayName') ||
  localStorage.getItem('userName') ||
  '我'

const filteredUsers = computed(() => {
  return users.value.filter((user) => {
    const text = `
      ${user.displayName || ''}
      ${user.title || ''}
      ${user.locationText || ''}
      ${user.note || ''}
    `.toLowerCase()

    return text.includes(
      keyword.value.toLowerCase()
    )
  })
})

const loadUsers = async () => {
  const snap = await getDocs(
    collection(db, 'idle_users')
  )

  users.value = snap.docs
    .map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }))
    .filter((user) => {
      const userId =
        user.userId ||
        user.ownerId ||
        user.lineUserId ||
        ''

      return user.isActive && userId !== currentUserId
    })
}

const loadReceivedInvites = async () => {
  if (!currentUserId) return

  const q = query(
    collection(db, 'idle_invites'),
    where('toUserId', '==', currentUserId),
    where('status', '==', 'pending')
  )

  const snap = await getDocs(q)

  receivedInvites.value = snap.docs
    .map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }))
    .sort((a, b) => {
      const aTime =
        a.createdAt?.toMillis?.() || 0
      const bTime =
        b.createdAt?.toMillis?.() || 0

      return bTime - aTime
    })
}

const formatTime = (text) => {
  if (!text) return '未設定'

  return text
    .replace('T', ' ')
    .slice(5, 16)
}

const resetInviteForm = () => {
  inviteForm.value = {
    title: '',
    detail: '',
    inviteTime: '',
    locationText: '',
    note: '',
  }
}

const openInviteForm = (user) => {
  inviteTargetId.value = user.id

  inviteForm.value = {
    title: `邀約：${user.displayName || '閒置村民'}`,
    detail: '',
    inviteTime: '',
    locationText: user.locationText || '',
    note: '',
  }
}

const cancelInvite = () => {
  inviteTargetId.value = ''
  resetInviteForm()
}

const submitInvite = async (user) => {
  if (!currentUserId) {
    alert('尚未取得使用者 ID，請先完成綁定')
    return
  }

  if (!inviteForm.value.title.trim()) {
    alert('請填寫邀約標題')
    return
  }

  if (!inviteForm.value.detail.trim()) {
    alert('請填寫邀約內容')
    return
  }

  if (!inviteForm.value.inviteTime.trim()) {
    alert('請填寫邀約時間')
    return
  }

  try {
    const toUserId =
      user.userId ||
      user.ownerId ||
      user.lineUserId ||
      ''

    if (!toUserId) {
      alert('對方尚未綁定 LINE ID，無法邀約')
      return
    }

    await addDoc(
      collection(db, 'idle_invites'),
      {
        fromUserId: currentUserId,
        fromUserName: currentUserName,

        toUserId,
        toUserName:
          user.displayName || '',

        title:
          inviteForm.value.title.trim(),

        detail:
          inviteForm.value.detail.trim(),

        content:
          inviteForm.value.detail.trim(),

        inviteTime:
          inviteForm.value.inviteTime.trim(),

        locationText:
          inviteForm.value.locationText.trim(),

        note:
          inviteForm.value.note.trim(),

        status: 'pending',

        linePushSent: false,
        lineStatusPushSent: false,

        createdAt:
          serverTimestamp(),
      }
    )

    alert('已送出邀約，XCT 任務小秘會提醒對方')

    cancelInvite()
  } catch (err) {
    console.error(err)
    alert('邀約失敗')
  }
}

const replyInvite = async (invite, status) => {
  const statusText =
    status === 'accepted'
      ? '同意'
      : '拒絕'

  try {
    await updateDoc(
      doc(db, 'idle_invites', invite.id),
      {
        status,
        repliedAt:
          serverTimestamp(),

        lineStatusPushSent: false,
      }
    )

    alert(`已${statusText}邀約，XCT 任務小秘會通知對方`)

    await loadReceivedInvites()
  } catch (err) {
    console.error(err)
    alert('回覆邀約失敗')
  }
}

const addTask = async (user) => {
  try {
    await addDoc(
      collection(db, 'tasks'),
      {
        title: `邀約：${user.displayName}`,

        note:
          user.title || '',

        type: 'idle_market',

        ownerId: currentUserId,
        userId: currentUserId,
        lineUserId: currentUserId,

        status: 'pending',

        createdAt:
          serverTimestamp(),
      }
    )

    alert('已加入任務')
  } catch (err) {
    console.error(err)
    alert('加入失敗')
  }
}

const openMap = (user) => {
  if (!user.locationText) {
    alert('此人未設定地點')
    return
  }

  const url =
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(user.locationText)}`

  window.location.assign(url)
}

const viewProfile = (user) => {
  alert(
    `${user.displayName || '未命名'}\n\n` +
      `狀態：${user.title || '目前可接受邀約'}\n` +
      `地點：${user.locationText || '未設定'}\n\n` +
      `${user.note || '無補充介紹'}`
  )
}

const goIdleForm = () => {
  router.push('/idle-form')
}

onMounted(async () => {
  await loadReceivedInvites()
  await loadUsers()
})
</script>

<style scoped>
.idle-market-page {
  max-width: 900px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;

  gap: 16px;
}

.eyebrow {
  margin: 0 0 6px;

  font-size: 12px;
  font-weight: 900;

  letter-spacing: 2px;

  color: #9b7b00;
}

.filter-box {
  margin-bottom: 18px;
}

.invite-panel {
  margin-bottom: 18px;

  background: #fff7cf;
}

.invite-panel-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;

  gap: 12px;

  margin-bottom: 14px;
}

.invite-panel-head h2 {
  margin: 0;

  font-size: 22px;
  font-weight: 900;
}

.invite-card {
  background: #ffffff;

  border:
    2px solid #1e1e1e;

  border-radius: 18px;

  padding: 14px;

  margin-top: 12px;

  box-shadow:
    0 4px 0 #1e1e1e;
}

.invite-card h3 {
  margin: 0 0 10px;

  font-size: 18px;
  font-weight: 900;
}

.invite-card p {
  margin: 6px 0;

  font-size: 14px;
  font-weight: 700;

  line-height: 1.6;
}

.invite-actions {
  display: grid;

  grid-template-columns:
    repeat(2, minmax(0, 1fr));

  gap: 10px;

  margin-top: 14px;
}

.user-list {
  display: flex;
  flex-direction: column;

  gap: 18px;
}

.user-card {
  overflow: hidden;
}

.user-top {
  display: flex;
  gap: 14px;
}

.avatar {
  width: 68px;
  height: 68px;

  flex: 0 0 68px;

  border-radius: 20px;

  background: #fff1a8;

  border:
    2px solid #1e1e1e;

  display: flex;

  align-items: center;
  justify-content: center;

  font-size: 28px;
  font-weight: 900;

  box-shadow:
    0 5px 0 #1e1e1e;
}

.user-info {
  flex: 1;
}

.name-row {
  display: flex;

  justify-content: space-between;

  align-items: flex-start;

  gap: 10px;
}

.name-row h2 {
  margin: 0;

  font-size: 24px;
  font-weight: 900;
}

.title-text {
  margin: 10px 0 0;

  font-size: 15px;
  font-weight: 800;

  color: #333;
}

.location {
  margin: 8px 0 0;

  color: #666;

  font-size: 14px;
  font-weight: 700;
}

.note-box {
  margin-top: 16px;

  background: #fff8e8;

  border:
    2px solid #1e1e1e;

  border-radius: 16px;

  padding: 14px;

  font-size: 14px;
  font-weight: 700;

  line-height: 1.7;
}

.tags {
  display: flex;
  flex-wrap: wrap;

  gap: 8px;

  margin-top: 14px;
}

.time-box {
  margin-top: 14px;

  display: flex;
  flex-wrap: wrap;

  gap: 14px;

  color: #555;

  font-size: 13px;
  font-weight: 800;
}

.invite-form {
  margin-top: 18px;

  padding: 14px;

  background: #f7fbff;

  border:
    2px solid #1e1e1e;

  border-radius: 18px;
}

.invite-form label {
  display: block;

  margin: 10px 0 6px;

  font-size: 13px;
  font-weight: 900;
}

.invite-form input,
.invite-form textarea {
  width: 100%;

  box-sizing: border-box;

  border:
    2px solid #1e1e1e;

  border-radius: 14px;

  padding: 12px;

  font-size: 14px;
  font-weight: 700;

  background: #ffffff;
}

.invite-form textarea {
  resize: vertical;
}

/* =========================
   橫4按鈕
========================= */

.action-grid {
  display: grid;

  grid-template-columns:
    repeat(4, minmax(0, 1fr));

  gap: 10px;

  margin-top: 18px;

  width: 100%;
}

.action-btn {
  width: 100%;
  min-width: 0;

  min-height: 72px;

  padding: 10px 6px;

  display: flex;

  flex-direction: column;

  align-items: center;
  justify-content: center;

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

@media (max-width: 768px) {
  .idle-market-page {
    max-width: 100%;
  }

  .page-header {
    flex-direction: column;
  }

  .page-header button {
    width: 100%;
  }

  .invite-panel-head {
    flex-direction: column;
  }

  .invite-actions {
    grid-template-columns:
      repeat(2, minmax(0, 1fr));
  }

  .user-top {
    flex-direction: column;
  }

  .name-row {
    flex-direction: column;
  }

  .action-grid {
    grid-template-columns:
      repeat(2, minmax(0, 1fr));

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
