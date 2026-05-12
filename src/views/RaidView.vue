<template>
  <div class="page">
    <div class="header">
      <div>
        <h1>多人副本</h1>
        <p>發起任務、報名參與，版主與參與者可互相聯絡。</p>
      </div>

      <button class="btn secondary" @click="goHome">返回首頁</button>
    </div>

    <div class="create-card">
      <h2>建立多人副本</h2>

      <input v-model="form.title" class="input" placeholder="任務名稱，例如：一起整理倉庫" />
      <textarea v-model="form.note" class="textarea" placeholder="任務說明 / 地點 / 時間備註"></textarea>

      <input
        v-model.number="form.requiredPeople"
        class="input"
        type="number"
        min="1"
        placeholder="需要幾個人"
      />

      <input
        v-model="form.ownerContact"
        class="input"
        placeholder="你的聯絡方式，例如 LINE 名稱 / 電話"
      />

      <button class="btn" :disabled="creating" @click="createRaid">
        {{ creating ? '建立中...' : '建立副本任務' }}
      </button>
    </div>

    <div v-if="loading" class="card">載入中...</div>

    <div v-else-if="raids.length === 0" class="card empty">
      目前沒有多人副本任務
    </div>

    <div v-else class="list">
      <div v-for="raid in raids" :key="raid.id" class="card">
        <div class="card-head">
          <h2>{{ raid.title || '未命名副本' }}</h2>
          <span class="status">{{ statusText(raid) }}</span>
        </div>

        <p class="desc">需求人數：{{ raid.requiredPeople || 1 }} 人</p>
        <p class="desc">已報名：{{ raid.joinedUsers?.length || 0 }} / {{ raid.requiredPeople || 1 }}</p>
        <p v-if="raid.note" class="desc">備註：{{ raid.note }}</p>

        <div class="contact-box">
          <div class="contact-title">版主聯絡資訊</div>
          <div><strong>{{ raid.ownerName || '任務版主' }}</strong></div>
          <div>{{ raid.ownerContact || '版主尚未提供聯絡資訊' }}</div>
        </div>

        <div v-if="raid.joinedUsers?.length" class="joined-list">
          <div class="joined-title">已報名名單</div>

          <div v-for="user in raid.joinedUsers" :key="user.userId" class="joined-user">
            <strong>{{ user.userName || '匿名使用者' }}</strong>

            <div v-if="isOwner(raid) || user.userId === userId" class="joined-contact">
              聯絡方式：{{ user.contactText || '未提供' }}
            </div>
          </div>
        </div>

        <div v-if="isOwner(raid)" class="owner-actions">
          <button class="btn warning" @click="closeRaid(raid)">截止報名</button>
          <button class="btn danger" @click="cancelRaid(raid)">取消任務</button>
        </div>

        <div v-else>
          <button
            v-if="!hasJoined(raid) && !isFull(raid)"
            class="btn"
            @click="joinRaid(raid)"
          >
            我要報名
          </button>

          <button v-else-if="hasJoined(raid)" class="btn joined" disabled>
            已報名，可查看版主聯絡資訊
          </button>

          <button v-else class="btn joined" disabled>
            人數已滿
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  addDoc,
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  arrayUnion,
  query,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/firebase'

const router = useRouter()

const raids = ref([])
const loading = ref(true)
const creating = ref(false)

const userId =
  localStorage.getItem('lineUserId') ||
  localStorage.getItem('userId') ||
  localStorage.getItem('line_user_id') ||
  ''

const userName =
  localStorage.getItem('lineDisplayName') ||
  localStorage.getItem('displayName') ||
  localStorage.getItem('line_display_name') ||
  '匿名使用者'

const form = ref({
  title: '',
  note: '',
  requiredPeople: 2,
  ownerContact:
    localStorage.getItem('contactText') ||
    localStorage.getItem('phone') ||
    localStorage.getItem('lineName') ||
    '',
})

function safeDateValue(value) {
  if (!value) return 0
  if (typeof value.toMillis === 'function') return value.toMillis()
  if (value instanceof Date) return value.getTime()
  return 0
}

async function loadRaids() {
  loading.value = true

  try {
    const q = query(collection(db, 'multi_raids'))
    const snap = await getDocs(q)

    raids.value = snap.docs
      .map((docSnap) => ({
        id: docSnap.id,
        joinedUsers: [],
        status: 'open',
        ...docSnap.data(),
      }))
      .filter((raid) => raid.status === 'open')
      .sort((a, b) => safeDateValue(b.createdAt) - safeDateValue(a.createdAt))
  } catch (err) {
    console.error('讀取多人副本失敗:', err)
    alert('讀取多人副本失敗，請檢查 Firestore 權限或 collection 名稱')
  } finally {
    loading.value = false
  }
}

async function createRaid() {
  if (!userId) {
    router.push('/bind')
    return
  }

  if (!form.value.title.trim()) {
    alert('請輸入任務名稱')
    return
  }

  creating.value = true

  try {
    const ownerContact = form.value.ownerContact.trim()

    if (ownerContact) {
      localStorage.setItem('contactText', ownerContact)
    }

    await addDoc(collection(db, 'multi_raids'), {
      title: form.value.title.trim(),
      note: form.value.note.trim(),
      requiredPeople: Number(form.value.requiredPeople || 1),

      ownerId: userId,
      ownerName: userName,
      ownerContact,

      joinedUsers: [],
      joinedCount: 0,

      status: 'open',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    form.value.title = ''
    form.value.note = ''
    form.value.requiredPeople = 2

    await loadRaids()
    alert('多人副本已建立')
  } catch (err) {
    console.error('建立多人副本失敗:', err)
    alert('建立多人副本失敗')
  } finally {
    creating.value = false
  }
}

function isOwner(raid) {
  return raid.ownerId === userId || raid.userId === userId
}

function hasJoined(raid) {
  if (!raid.joinedUsers || !userId) return false
  return raid.joinedUsers.some((user) => user.userId === userId)
}

function isFull(raid) {
  const currentCount = raid.joinedUsers?.length || 0
  const limit = Number(raid.requiredPeople || 1)
  return currentCount >= limit
}

function statusText(raid) {
  return isFull(raid) ? '已滿' : '招募中'
}

async function joinRaid(raid) {
  if (!userId) {
    router.push('/bind')
    return
  }

  if (hasJoined(raid)) {
    alert('你已經報名過了')
    return
  }

  if (isFull(raid)) {
    alert('這個副本人數已滿')
    await loadRaids()
    return
  }

  const contactText =
    prompt('請輸入給版主看的聯絡方式，例如 LINE 名稱、電話、備註。可留空。') || ''

  if (contactText) {
    localStorage.setItem('contactText', contactText)
  }

  const currentCount = raid.joinedUsers?.length || 0
  const limit = Number(raid.requiredPeople || 1)
  const newCount = currentCount + 1

  try {
    await updateDoc(doc(db, 'multi_raids', raid.id), {
      joinedUsers: arrayUnion({
        userId,
        userName,
        contactText,
        joinedAt: new Date(),
      }),
      joinedCount: newCount,
      status: newCount >= limit ? 'full' : 'open',
      updatedAt: serverTimestamp(),
      ...(newCount >= limit ? { fullAt: serverTimestamp() } : {}),
    })

    alert(newCount >= limit ? '報名成功，人數已滿' : '報名成功')
    await loadRaids()
  } catch (err) {
    console.error('報名失敗:', err)
    alert('報名失敗')
  }
}

async function closeRaid(raid) {
  if (!isOwner(raid)) {
    alert('只有發布者可以截止報名')
    return
  }

  const ok = confirm(`確定要截止「${raid.title}」報名嗎？`)
  if (!ok) return

  await updateDoc(doc(db, 'multi_raids', raid.id), {
    status: 'closed',
    closedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  await loadRaids()
}

async function cancelRaid(raid) {
  if (!isOwner(raid)) {
    alert('只有發布者可以取消任務')
    return
  }

  const ok = confirm(`確定要取消「${raid.title}」嗎？`)
  if (!ok) return

  await deleteDoc(doc(db, 'multi_raids', raid.id))
  await loadRaids()
}

function goHome() {
  router.push('/home')
}

onMounted(loadRaids)
</script>

<style scoped>
.raid-page {
  max-width: 920px;
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

/* =========================
   副本列表
========================= */

.raid-list {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.raid-card {
  overflow: hidden;
}

.raid-cover {
  width: 100%;
  height: 220px;

  object-fit: cover;

  display: block;

  border-bottom:
    2px solid #1e1e1e;
}

.raid-content {
  padding: 18px;
}

.raid-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;

  gap: 12px;
}

.raid-top h2 {
  margin: 0 0 6px;

  font-size: 24px;
  font-weight: 900;
}

.raid-desc {
  margin: 14px 0 0;

  color: #444;

  font-size: 15px;
  font-weight: 700;

  line-height: 1.7;
}

.location {
  margin-top: 10px;

  color: #666;

  font-size: 14px;
  font-weight: 700;
}

.member-box {
  margin-top: 14px;

  background: #fff8e8;

  border:
    2px solid #1e1e1e;

  border-radius: 16px;

  padding: 14px;
}

.member-title {
  font-size: 14px;
  font-weight: 900;

  margin-bottom: 10px;
}

.member-list {
  display: flex;
  flex-wrap: wrap;

  gap: 8px;
}

.member-chip {
  background: #ffffff;

  border:
    2px solid #1e1e1e;

  border-radius: 999px;

  padding: 6px 10px;

  font-size: 12px;
  font-weight: 800;
}

/* =========================
   狀態
========================= */

.status-row {
  display: flex;
  flex-wrap: wrap;

  gap: 8px;

  margin-top: 14px;
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

/* =========================
   狀態色
========================= */

.btn-yellow {
  background: var(--primary);
}

.btn-orange {
  background: #ffd0a6;
}

.btn-teal {
  background: #b8f3e8;
}

/* =========================
   空狀態
========================= */

.empty {
  text-align: center;

  padding: 40px 0;

  color: #666;

  font-size: 15px;
  font-weight: 800;
}

/* =========================
   手機版
========================= */

@media (max-width: 768px) {
  .raid-page {
    max-width: 100%;
  }

  .page-header {
    flex-direction: column;
  }

  .page-header button {
    width: 100%;
  }

  .raid-top {
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
