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

export async function ensureLiffLogin() {
  await initLiff()

  if (!liff.isLoggedIn()) {
    liff.login()
    return null
  }

  return liff
}

export async function getLiffProfile() {
  await ensureLiffLogin()

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

export { liff }
