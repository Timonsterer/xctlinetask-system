<template>
  <div class="login-page">
    <h1>登入中...</h1>
    <p v-if="error" class="error">{{ error }}</p>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getDoc, doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import { getLiffProfile } from '../liff'

const router = useRouter()
const error = ref('')

onMounted(async () => {
  try {
    const profile = await getLiffProfile()

    const userRef = doc(db, 'users', profile.lineUserId)
    const userSnap = await getDoc(userRef)

    if (!userSnap.exists()) {
      await setDoc(userRef, {
        lineUserId: profile.lineUserId,
        displayName: profile.displayName,
        pictureUrl: profile.pictureUrl,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    }

    router.push('/home')
  } catch (err) {
    console.error(err)
    error.value = err?.message || '登入失敗'
  }
})
</script>

<style scoped>
.login-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 100px;
}
.error {
  color: red;
}
</style>
