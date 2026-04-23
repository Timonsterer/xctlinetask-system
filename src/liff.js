import liff from '@line/liff'

let liffReady = false

export async function initLiff() {
  if (liffReady) return liff

  await liff.init({
    liffId: import.meta.env.VITE_LIFF_ID,
  })

  liffReady = true
  return liff
}

export async function ensureLiffReady() {
  await initLiff()
  return liff
}

export async function getLiffProfile() {
  await initLiff()

  if (!liff.isLoggedIn()) {
    return null
  }

  const profile = await liff.getProfile()
  const idToken = liff.getIDToken()

  return {
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
