<template>
  <div class="page">
    <div class="header">
      <div>
        <h1>多人副本</h1>
        <p>發起任務、挑戰、報名參與，版主與參與者可互相聯絡。</p>
      </div>

      <button class="btn secondary" @click="goHome">返回首頁</button>
    </div>

    <div class="create-card">
      <h2>{{ editingId ? '編輯多人副本' : '建立多人副本' }}</h2>

      <div class="mode-grid">
        <button
          class="btn"
          :class="{ active: form.mode === 'raid' }"
          @click="form.mode = 'raid'"
        >
          一般副本
        </button>

        <button
          class="btn"
          :class="{ active: form.mode === 'challenge' }"
          @click="form.mode = 'challenge'"
        >
          發起挑戰
        </button>
      </div>

      <input
        v-model="form.title"
        class="input"
        placeholder="任務名稱，例如：一起整理倉庫 / 跑步挑戰"
      />

      <textarea
        v-model="form.note"
        class="textarea"
        placeholder="任務說明 / 挑戰規則 / 地點 / 時間備註"
      ></textarea>

      <input
        v-model="form.googleLink"
        class="input"
        placeholder="Google 地圖 / Google Meet / Google 表單連結，可留空"
      />

      <input
        v-if="form.mode === 'challenge'"
        v-model="form.challengeTarget"
        class="input"
        placeholder="挑戰目標，例如：一週完成 3 次運動"
      />

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

      <div class="form-actions">
        <button class="btn" :disabled="creating" @click="saveRaid">
          {{ creating ? '儲存中...' : editingId ? '儲存修改' : '建立副本任務' }}
        </button>

        <button v-if="editingId" class="btn secondary" @click="resetForm">
          取消編輯
        </button>
      </div>
    </div>

    <div v-if="loading" class="card">載入中...</div>

    <div v-else-if="raids.length === 0" class="card empty">
      目前沒有多人副本任務
    </div>

    <div v-else class="list">
      <div v-for="raid in raids" :key="raid.id" class="card">
        <div class="card-head">
          <h2>
            {{ raid.mode === 'challenge' ? '🔥 ' : '' }}
            {{ raid.title || '未命名副本' }}
          </h2>
          <span class="status">{{ statusText(raid) }}</span>
        </div>

        <p class="desc">類型：{{ raid.mode === 'challenge' ? '挑戰副本' : '一般副本' }}</p>
        <p class="desc">需求人數：{{ raid.requiredPeople || 1 }} 人</p>
        <p class="desc">已報名：{{ raid.joinedUsers?.length || 0 }} / {{ raid.requiredPeople || 1 }}</p>
        <p v-if="raid.challengeTarget" class="desc">挑戰目標：{{ raid.challengeTarget }}</p>
        <p v-if="raid.note" class="desc">備註：{{ raid.note }}</p>

        <a
          v-if="raid.googleLink"
          class="map-link"
          :href="normalizeUrl(raid.googleLink)"
          target="_blank"
          rel="noopener noreferrer"
        >
          開啟 Google 連結
        </a>

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
          <button class="btn" @click="startEdit(raid)">編輯副本</button>
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
const editingId = ref('')

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

const defaultForm = () => ({
  mode: 'raid',
  title: '',
  note: '',
  googleLink: '',
  challengeTarget: '',
  requiredPeople: 2,
  ownerContact:
    localStorage.getItem('contactText') ||
    localStorage.getItem('phone') ||
    localStorage.getItem('lineName') ||
    '',
})

const form = ref(defaultForm())

function safeDateValue(value) {
  if (!value) return 0
  if (typeof value.toMillis === 'function') return value.toMillis()
  if (value instanceof Date) return value.getTime()
  return 0
}

function normalizeUrl(url) {
  if (!url) return ''
  const text = String(url).trim()
  if (text.startsWith('http://') || text.startsWith('https://')) return text
  return `https://${text}`
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
        mode: 'raid',
        ...docSnap.data(),
      }))
      .filter((raid) => raid.status === 'open' || raid.status === 'full')
      .sort((a, b) => safeDateValue(b.createdAt) - safeDateValue(a.createdAt))
  } catch (err) {
    console.error('讀取多人副本失敗:', err)
    alert('讀取多人副本失敗，請檢查 Firestore 權限或 collection 名稱')
  } finally {
    loading.value = false
  }
}

async function saveRaid() {
  if (editingId.value) {
    await updateRaid()
  } else {
    await createRaid()
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
      mode: form.value.mode,
      title: form.value.title.trim(),
      note: form.value.note.trim(),
      googleLink: form.value.googleLink.trim(),
      challengeTarget: form.value.challengeTarget.trim(),
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

    resetForm()
    await loadRaids()
    alert(form.value.mode === 'challenge' ? '挑戰已建立' : '多人副本已建立')
  } catch (err) {
    console.error('建立多人副本失敗:', err)
    alert('建立多人副本失敗')
  } finally {
    creating.value = false
  }
}

function startEdit(raid) {
  if (!isOwner(raid)) {
    alert('只有發布者可以編輯副本')
    return
  }

  editingId.value = raid.id

  form.value = {
    mode: raid.mode || 'raid',
    title: raid.title || '',
    note: raid.note || '',
    googleLink: raid.googleLink || '',
    challengeTarget: raid.challengeTarget || '',
    requiredPeople: Number(raid.requiredPeople || 1),
    ownerContact: raid.ownerContact || '',
  }

  window.scrollTo({ top: 0, behavior: 'smooth' })
}

async function updateRaid() {
  if (!editingId.value) return

  if (!form.value.title.trim()) {
    alert('請輸入任務名稱')
    return
  }

  const raid = raids.value.find((item) => item.id === editingId.value)

  if (!raid || !isOwner(raid)) {
    alert('只有發布者可以編輯副本')
    return
  }

  creating.value = true

  try {
    const ownerContact = form.value.ownerContact.trim()

    await updateDoc(doc(db, 'multi_raids', editingId.value), {
      mode: form.value.mode,
      title: form.value.title.trim(),
      note: form.value.note.trim(),
      googleLink: form.value.googleLink.trim(),
      challengeTarget: form.value.challengeTarget.trim(),
      requiredPeople: Number(form.value.requiredPeople || 1),
      ownerContact,
      updatedAt: serverTimestamp(),
      lastEditedAt: serverTimestamp(),
    })

    await notifyRaidMembers(raid, 'updated')

    resetForm()
    await loadRaids()
    alert('副本已更新，已建立參加者通知')
  } catch (err) {
    console.error('編輯副本失敗:', err)
    alert('編輯副本失敗')
  } finally {
    creating.value = false
  }
}

async function notifyRaidMembers(raid, type) {
  const members = raid.joinedUsers || []
  const targets = members.filter((member) => member.userId && member.userId !== userId)

  if (!targets.length) return

  await Promise.all(
    targets.map((member) =>
      addDoc(collection(db, 'raid_notifications'), {
        type,
        raidId: raid.id,
        raidTitle: raid.title || '未命名副本',
        receiverId: member.userId,
        receiverName: member.userName || '',
        senderId: userId,
        senderName: userName,
        message:
          type === 'updated'
            ? `你參加的副本「${raid.title || '未命名副本'}」已被版主更新，請重新查看內容。`
            : `副本「${raid.title || '未命名副本'}」有新通知。`,
        read: false,
        createdAt: serverTimestamp(),
      })
    )
  )
}

function resetForm() {
  editingId.value = ''
  form.value = defaultForm()
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
  if (raid.status === 'full' || isFull(raid)) return '已滿'
  return raid.mode === 'challenge' ? '挑戰中' : '招募中'
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

    await addDoc(collection(db, 'raid_notifications'), {
      type: 'joined',
      raidId: raid.id,
      raidTitle: raid.title || '未命名副本',
      receiverId: raid.ownerId,
      receiverName: raid.ownerName || '',
      senderId: userId,
      senderName: userName,
      message: `${userName} 已報名你的副本「${raid.title || '未命名副本'}」。`,
      read: false,
      createdAt: serverTimestamp(),
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
.page {
  max-width: 920px;
  margin: 0 auto;
  padding: 18px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 18px;
}

.header h1 {
  margin: 0 0 6px;
  font-size: 30px;
  font-weight: 900;
}

.header p {
  margin: 0;
  color: #555;
  font-size: 14px;
  font-weight: 700;
}

.create-card,
.card {
  background: #fffdf5;
  border: 2px solid #1e1e1e;
  border-radius: 18px;
  padding: 18px;
  box-shadow: 4px 4px 0 #1e1e1e;
  margin-bottom: 18px;
}

.create-card h2 {
  margin: 0 0 14px;
  font-size: 22px;
  font-weight: 900;
}

.input,
.textarea {
  width: 100%;
  box-sizing: border-box;
  border: 2px solid #1e1e1e;
  border-radius: 14px;
  padding: 12px;
  margin-bottom: 12px;
  font-size: 15px;
  font-weight: 700;
  background: #fff;
}

.textarea {
  min-height: 110px;
  resize: vertical;
}

.mode-grid,
.form-actions,
.owner-actions {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 12px;
}

.mode-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.btn {
  width: 100%;
  border: 2px solid #1e1e1e;
  border-radius: 14px;
  padding: 12px 10px;
  background: #ffd84d;
  color: #111;
  font-size: 15px;
  font-weight: 900;
  cursor: pointer;
  box-shadow: 2px 2px 0 #1e1e1e;
}

.btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.btn.active {
  background: #b8f3e8;
}

.btn.secondary {
  background: #fff;
}

.btn.warning {
  background: #ffd0a6;
}

.btn.danger {
  background: #ffb7b7;
}

.btn.joined {
  background: #ddd;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.card-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;
}

.card-head h2 {
  margin: 0;
  font-size: 22px;
  font-weight: 900;
}

.status {
  flex-shrink: 0;
  border: 2px solid #1e1e1e;
  border-radius: 999px;
  padding: 6px 10px;
  background: #b8f3e8;
  font-size: 13px;
  font-weight: 900;
}

.desc {
  margin: 8px 0;
  color: #333;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.6;
}

.map-link {
  display: block;
  width: fit-content;
  margin: 12px 0;
  border: 2px solid #1e1e1e;
  border-radius: 999px;
  padding: 9px 14px;
  background: #fff;
  color: #111;
  text-decoration: none;
  font-weight: 900;
  box-shadow: 2px 2px 0 #1e1e1e;
}

.contact-box,
.joined-list {
  margin-top: 14px;
  background: #fff8e8;
  border: 2px solid #1e1e1e;
  border-radius: 16px;
  padding: 14px;
}

.contact-title,
.joined-title {
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 900;
}

.joined-user {
  padding: 10px 0;
  border-top: 1px solid #ddd;
}

.joined-user:first-of-type {
  border-top: none;
}

.joined-contact {
  margin-top: 4px;
  color: #444;
  font-size: 13px;
  font-weight: 700;
}

.empty {
  text-align: center;
  color: #666;
  font-weight: 900;
}

@media (max-width: 768px) {
  .page {
    padding: 14px;
  }

  .header {
    flex-direction: column;
  }

  .mode-grid,
  .form-actions,
  .owner-actions {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
  }

  .mode-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .btn {
    min-height: 58px;
    padding: 8px 6px;
    font-size: 13px;
  }

  .card-head {
    flex-direction: column;
  }
}
</style>
