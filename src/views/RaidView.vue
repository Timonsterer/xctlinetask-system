<template>
  <div class="page">
    <h1>多人副本</h1>

    <div v-if="loading" class="card">載入中...</div>

    <div v-else-if="raids.length === 0" class="card empty">
      目前沒有多人副本任務
    </div>

    <div v-else class="list">
      <div v-for="raid in raids" :key="raid.id" class="card">
        <h2>{{ raid.title }}</h2>

        <p class="desc">
          需求人數：{{ raid.requiredPeople || 1 }} 人
        </p>

        <p class="desc">
          已報名：{{ raid.joinedUsers?.length || 0 }} / {{ raid.requiredPeople || 1 }}
        </p>

        <button
          v-if="!hasJoined(raid)"
          class="btn"
          @click="joinRaid(raid)"
        >
          我要報名
        </button>

        <button v-else class="btn joined" disabled>
          已報名
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  arrayUnion,
  query,
  orderBy
} from 'firebase/firestore'
import { db } from '@/firebase'

const raids = ref([])
const loading = ref(true)

const userId = localStorage.getItem('lineUserId') || ''
const userName = localStorage.getItem('lineDisplayName') || '匿名使用者'

const loadRaids = async () => {
  loading.value = true

  const q = query(
    collection(db, 'multi_raids'),
    orderBy('createdAt', 'desc')
  )

  const snap = await getDocs(q)

  raids.value = snap.docs.map(docSnap => ({
    id: docSnap.id,
    ...docSnap.data()
  }))

  loading.value = false
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

  const currentCount = raid.joinedUsers?.length || 0
  const limit = raid.requiredPeople || 1

  if (currentCount >= limit) {
    alert('這個副本人數已滿')
    return
  }

  const raidRef = doc(db, 'multi_raids', raid.id)

  await updateDoc(raidRef, {
    joinedUsers: arrayUnion({
      userId,
      userName,
      joinedAt: new Date()
    })
  })

  alert('報名成功')
  await loadRaids()
}

onMounted(loadRaids)
</script>

<style scoped>
.page {
  padding: 20px;
  max-width: 720px;
  margin: 0 auto;
}

h1 {
  font-size: 28px;
  margin-bottom: 20px;
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

.card h2 {
  margin: 0 0 10px;
  font-size: 22px;
}

.desc {
  margin: 6px 0;
  color: #555;
}

.empty {
  text-align: center;
  color: #777;
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

.btn.joined {
  background: #9ca3af;
}
</style>
