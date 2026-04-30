import liff from '@line/liff'

let liffReady = false

export async function initLiff() {
  if (liffReady) return liff

  const liffId = import.meta.env.VITE_LIFF_ID

  if (!liffId) {
    throw new Error('VITE_LIFF_ID 未設定，請檢查 .env')
  }

  await liff.init({ liffId })

  liffReady = true
  return liff
}

export async function ensureLiffReady() {
  await initLiff()
  return liff
}

export async function getLiffProfile() {
  await initLiff()

  // 🔥 關鍵修正
  if (!liff.isLoggedIn()) {
    liff.login()
    return null
  }

  const profile = await liff.getProfile()
  const idToken = liff.getIDToken()

  return {
    userId: profile.userId,
    lineUserId: profile.userId,
    displayName: profile.displayName,
    pictureUrl: profile.pictureUrl || '',
    statusMessage: profile.statusMessage || '',
    idToken: idToken || '',
  }
}

export function loginLiff() {
  liff.login()
}

export function isLiffLoggedIn() {
  return liff.isLoggedIn()
}

export { liff }
