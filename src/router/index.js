router.beforeEach((to, from, next) => {
  const isPublic = to.meta?.public === true

  const userId =
    localStorage.getItem('userId') ||
    localStorage.getItem('lineUserId') ||
    localStorage.getItem('line_user_id')

  // 公開頁
  if (isPublic) {
    next()
    return
  }

  // 🔥 關鍵：讓 /home 永遠可以進
  if (to.path === '/home') {
    next()
    return
  }

  // 🔥 沒登入 → 回首頁（不要去 /bind）
  if (!userId) {
    next('/home')
    return
  }

  next()
})
