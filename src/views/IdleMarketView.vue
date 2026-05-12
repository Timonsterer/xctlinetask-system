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

        <div class="action-grid">
          <button
            class="btn btn-green action-btn"
            @click="inviteUser(user)"
          >
            <span>邀約</span>
            <small>發送邀請</small>
          </button>

          <button
            class="btn btn-blue action-btn"
            @click="addTask(user)"
          >
            <span>任務</span>
            <small>加入行程</small>
          </button>

          <button
            class="btn btn-purple action-btn"
            @click="shareUser(user)"
          >
            <span>分享</span>
            <small>分享朋友</small>
          </button>

          <button
            class="btn btn-yellow action-btn"
            @click="copyUser(user)"
          >
            <span>收藏</span>
            <small>加入聯絡人</small>
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
  serverTimestamp,
} from 'firebase/firestore'

import { useRouter } from 'vue-router'
import { db } from '@/firebase'

const router = useRouter()

const keyword = ref('')
const users = ref([])

const currentUserId =
  localStorage.getItem('lineUserId') ||
  localStorage.getItem('userId') ||
  ''

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
    .filter((user) => user.isActive)
}

const formatTime = (text) => {
  if (!text) return '未設定'

  return text
    .replace('T', ' ')
    .slice(5, 16)
}

const inviteUser = async (user) => {
  try {
    await addDoc(
      collection(db, 'idle_invites'),
      {
        fromUserId: currentUserId,
        toUserId:
          user.userId ||
          user.ownerId,

        toName:
          user.displayName || '',

        title:
          user.title || '',

        status: 'pending',

        createdAt:
          serverTimestamp(),
      }
    )

    alert('已送出邀約')
  } catch (err) {
    console.error(err)
    alert('邀約失敗')
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

const shareUser = async (user) => {
  const text =
    `${user.displayName}\n` +
    `${user.title || ''}\n` +
    `${user.locationText || ''}`

  try {
    if (navigator.share) {
      await navigator.share({
        title:
          user.displayName,
        text,
      })
    } else {
      await navigator.clipboard.writeText(
        text
      )

      alert('已複製分享內容')
    }
  } catch (err) {
    console.error(err)
  }
}

const copyUser = async (user) => {
  try {
    await addDoc(
      collection(db, 'contacts'),
      {
        ownerId: currentUserId,

        name:
          user.displayName || '',

        note:
          user.note || '',

        location:
          user.locationText || '',

        createdAt:
          serverTimestamp(),
      }
    )

    alert('已加入聯絡人')
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
    `${user.displayName}\n\n${user.note || '無補充介紹'}`
  )
}

const goIdleForm = () => {
  router.push('/idle-form')
}

onMounted(() => {
  loadUsers()
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

/* =========================
   橫3按鈕
========================= */

.action-grid {
  display: grid;

  grid-template-columns:
    repeat(3, minmax(0, 1fr));

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

  .user-top {
    flex-direction: column;
  }

  .name-row {
    flex-direction: column;
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
