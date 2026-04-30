<template>
  <div class="page">
    <div class="header">
      <h1>多人副本</h1>
      <button class="btn secondary" @click="goHome">返回首頁</button>
    </div>

    <div v-if="loading" class="card">載入中...</div>

    <div v-else-if="raids.length === 0" class="card empty">
      目前沒有多人副本任務
    </div>

    <div v-else class="list">
      <div
        v-for="raid in raids"
        :key="raid.id"
        class="card"
      >
        <div class="card-head">
          <h2>{{ raid.title }}</h2>
          <span class="status open">招募中</span>
        </div>

        <p class="desc">
          需求人數：{{ raid.requiredPeople || 1 }} 人
        </p>

        <p class="desc">
          已報名：{{ raid.joinedUsers?.length || 0 }} / {{ raid.requiredPeople || 1 }}
        </p>

        <p v-if="raid.note" class="desc">
          備註：{{ raid.note }}
        </p>

        <div v-if="raid.joinedUsers?.length" class="joined-list">
          <div class="joined-title">已報名名單</div>
          <div
            v-for="user in raid.joinedUsers"
            :key="user.userId"
            class="joined-user"
          >
            {{ user.userName || '匿名使用者' }}
          </div>
        </div>

        <div v-if="isOwner(raid)" class="owner-actions">
          <button
            class="btn warning"
            @click="closeRaid(raid)"
          >
            截止報名
          </button>

          <button
            class="btn danger"
            @click="cancelRaid(raid)"
          >
            取消任務
          </button>
        </div>

        <div v-else>
          <button
            v-if="!hasJoined(raid)"
            class="btn"
            @click="joinRaid(raid)"
          >
            我要報名
          </button>

          <button
            v-else
            class="btn joined"
            disabled
          >
            已報名
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
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  arrayUnion,
  query,
  where,
  orderBy,
  serverTimestamp
} from 'firebase/firestore'
import { db } from '@/firebase'

const router = useRouter()

const raids = ref([])
const loading = ref(true)

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

const loadRaids = async () => {
  loading.value = true

  try {
    const q = query(
      collection(db, 'multi_raids'),
      where('status', '==', 'open'),
      orderBy('createdAt', 'desc')
    )

    const snap = await getDocs(q)

    raids.value = snap.docs.map(docSnap => ({
      id: docSnap.id,
      joinedUsers: [],
      ...docSnap.data()
    }))
  } catch (err) {
    console.error(err)
    alert('讀取多人副本失敗')
  } finally {
    loading.value = false
  }
}

const isOwner = (raid) => {
  return raid.ownerId === userId || raid.userId === userId
}

const hasJoined = (raid) => {
  if (!raid.joinedUsers || !userId) return false
  return raid.joinedUsers.some(user => user.userId === userId)
}

const joinRaid = async (raid) => {
  if (!userId) {
    alert('尚未取得使用者資料，請重新從 LINE 開啟')
    return
  }

  if (hasJoined(raid)) {
    alert('你已經報名過了')
    return
  }

  const currentCount = raid.joinedUsers?.length || 0
  const limit = Number(raid.requiredPeople || 1)

  if (currentCount >= limit) {
    alert('這個副本人數已滿')
    await deleteDoc(doc(db, 'multi_raids', raid.id))
    await loadRaids()
    return
  }

  const newCount = currentCount + 1
  const raidRef = doc(db, 'multi_raids', raid.id)

  if (newCount >= limit) {
    await updateDoc(raidRef, {
      joinedUsers: arrayUnion({
        userId,
        userName,
        joinedAt: new Date()
      }),
      joinedCount: newCount,
      status: 'full',
      fullAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })

    alert('報名成功，人數已滿，副本已結束')
    await loadRaids()
    return
  }

  await updateDoc(raidRef, {
    joinedUsers: arrayUnion({
      userId,
      userName,
      joinedAt: new Date()
    }),
    joinedCount: newCount,
    updatedAt: serverTimestamp()
  })

  alert('報名成功')
  await loadRaids()
}

const closeRaid = async (raid) => {
  if (!isOwner(raid)) {
    alert('只有發布者可以截止報名')
    return
  }

  const ok = confirm(`確定要截止「${raid.title}」報名嗎？截止後不會留下紀錄。`)
  if (!ok) return

  await deleteDoc(doc(db, 'multi_raids', raid.id))

  alert('已截止並刪除任務')
  await loadRaids()
}

const cancelRaid = async (raid) => {
  if (!isOwner(raid)) {
    alert('只有發布者可以取消任務')
    return
  }

  const ok = confirm(`確定要取消「${raid.title}」嗎？取消後不會留下紀錄。`)
  if (!ok) return

  await deleteDoc(doc(db, 'multi_raids', raid.id))

  alert('已取消並刪除任務')
  await loadRaids()
}

const goHome = () => {
  router.push('/home')
}

onMounted(loadRaids)
</script>

<style scoped>
.page {
  padding: 20px;
  max-width: 720px;
  margin: 0 auto;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 20px;
}

h1 {
  font-size: 28px;
  margin: 0;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.card {
  background: #fff;
  border-radius: 16px;
  padding: 18px;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
}

.card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.card h2 {
  margin: 0 0 10px;
  font-size: 22px;
}

.status {
  flex-shrink: 0;
  font-size: 13px;
  padding: 5px 9px;
  border-radius: 999px;
}

.status.open {
  background: #dcfce7;
  color: #166534;
}

.desc {
  margin: 6px 0;
  color: #555;
}

.empty {
  text-align: center;
  color: #777;
}

.joined-list {
  margin-top: 12px;
  padding: 12px;
  background: #f9fafb;
  border-radius: 12px;
}

.joined-title {
  font-weight: 700;
  margin-bottom: 8px;
  color: #374151;
}

.joined-user {
  font-size: 14px;
  color: #555;
  margin: 4px 0;
}

.owner-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.btn {
  margin-top: 12px;
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 12px;
  background: #111827;
  color: white;
  font-size: 16px;
  cursor: pointer;
}

.btn.secondary {
  margin-top: 0;
  width: auto;
  background: #e5e7eb;
  color: #111827;
}

.btn.joined {
  background: #9ca3af;
  cursor: not-allowed;
}

.btn.warning {
  background: #f59e0b;
}

.btn.danger {
  background: #dc2626;
}

@media (max-width: 520px) {
  .header {
    flex-direction: column;
    align-items: stretch;
  }

  .owner-actions {
    grid-template-columns: 1fr;
  }

  .btn.secondary {
    width: 100%;
  }
}
</style>
