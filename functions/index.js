const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore')
const { onSchedule } = require('firebase-functions/v2/scheduler')
const { onCall } = require('firebase-functions/v2/https')
const logger = require('firebase-functions/logger')
const admin = require('firebase-admin')
const axios = require('axios')

admin.initializeApp()

const LINE_TOKEN = "aJdHrp9V8uX75wOOaTPriztvvAkoiqhNItewcdI/oPeQLfw02AVWgoRSx3HN8vcRqD0/jVbWIQ4+J6kaSXrqWu4viIn44060THxh5CRoxdsYshKERXv3RSAyycpcsHfnhiR5s3a64ZEJ1vs7L56z3QdB04t89/1O/w1cDnyilFU="
const LIFF_URL = 'https://liff.line.me/2009690445-fzD5YF3K'

const db = admin.firestore()

async function pushLine(to, text) {
  if (!to) return

  await axios.post(
    'https://api.line.me/v2/bot/message/push',
    {
      to,
      messages: [{ type: 'text', text }],
    },
    {
      headers: {
        Authorization: `Bearer ${LINE_TOKEN}`,
        'Content-Type': 'application/json',
      },
    }
  )
}

// ==========================
// 登入後檢查一次：沒有任務就提醒
// ==========================
exports.checkNoTaskOnce = onCall(
  {
    region: 'asia-east1',
  },
  async (request) => {
    const lineUserId = request.data.userId

    if (!lineUserId) {
      return { success: false, message: '缺少 userId' }
    }

    const userRef = db.collection('users').doc(lineUserId)

    await userRef.set(
      {
        lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    )

    let hasCurrentTask = false

    const q1 = await db
      .collection('tasks')
      .where('ownerId', '==', lineUserId)
      .where('status', '==', 'pending')
      .where('isCurrent', '==', true)
      .limit(1)
      .get()

    if (!q1.empty) hasCurrentTask = true

    if (!hasCurrentTask) {
      const q2 = await db
        .collection('tasks')
        .where('userId', '==', lineUserId)
        .where('status', '==', 'pending')
        .where('isCurrent', '==', true)
        .limit(1)
        .get()

      if (!q2.empty) hasCurrentTask = true
    }

    if (hasCurrentTask) {
      return { success: true, notified: false }
    }

    try {
      await pushLine(
        lineUserId,
        `目前沒有進行中的任務\n\n` +
          `提醒你可以新增下一個任務。\n\n` +
          `👉 點這裡回到任務首頁：\n${LIFF_URL}`
      )

      await userRef.set(
        {
          noTaskNotifiedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      )

      return { success: true, notified: true }
    } catch (err) {
      logger.error('登入無任務提醒失敗', {
        lineUserId,
        message: err?.message,
        response: err?.response?.data,
      })

      return { success: false, message: '推播失敗' }
    }
  }
)

// ==========================
// 新邀請 → 通知被邀請人
// ==========================
exports.onInviteCreated = onDocumentCreated(
  {
    document: 'idle_invites/{id}',
    region: 'asia-east1',
  },
  async (event) => {
    const snap = event.data
    if (!snap) return

    const data = snap.data()
    if (!data || !data.toUserId) return
    if (data.linePushSent === true) return

    try {
      await pushLine(
        data.toUserId,
        `你收到新的邀請\n` +
          `邀請人：${data.fromUserName || '有人'}\n` +
          `內容：${data.title || '未填寫'}\n\n` +
          `👉 點這裡查看閒置市場：\n${LIFF_URL}`
      )

      await snap.ref.set(
        {
          linePushSent: true,
          linePushSentAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      )

      logger.info('邀請通知成功', { toUserId: data.toUserId })
    } catch (err) {
      logger.error('邀請通知失敗', {
        message: err?.message,
        response: err?.response?.data,
      })

      await snap.ref.set(
        {
          linePushSent: false,
          linePushError: JSON.stringify(err?.response?.data || err?.message || ''),
        },
        { merge: true }
      )
    }
  }
)

// ==========================
// 接受 / 拒絕 → 通知邀請人
// ==========================
exports.onInviteStatusUpdated = onDocumentUpdated(
  {
    document: 'idle_invites/{id}',
    region: 'asia-east1',
  },
  async (event) => {
    const before = event.data.before.data()
    const after = event.data.after.data()

    if (!before || !after) return

    const oldStatus = before.status
    const newStatus = after.status

    if (oldStatus === newStatus) return
    if (!['accepted', 'rejected'].includes(newStatus)) return
    if (!after.fromUserId) return
    if (after.lineStatusPushSent === true) return

    const statusText = newStatus === 'accepted' ? '已接受' : '已拒絕'

    try {
      await pushLine(
        after.fromUserId,
        `你的邀請${statusText}\n` +
          `對象：${after.toUserName || '對方'}\n` +
          `內容：${after.title || '未填寫'}\n\n` +
          `👉 點這裡回到閒置市場：\n${LIFF_URL}`
      )

      await event.data.after.ref.set(
        {
          lineStatusPushSent: true,
          lineStatusPushSentAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      )

      logger.info('狀態通知成功', {
        fromUserId: after.fromUserId,
        status: newStatus,
      })
    } catch (err) {
      logger.error('狀態通知失敗', {
        message: err?.message,
        response: err?.response?.data,
      })

      await event.data.after.ref.set(
        {
          lineStatusPushSent: false,
          lineStatusPushError: JSON.stringify(err?.response?.data || err?.message || ''),
        },
        { merge: true }
      )
    }
  }
)

// ==========================
// 多人副本：有人報名 / 額滿 → 通知建立者
// ==========================
exports.onRaidUpdated = onDocumentUpdated(
  {
    document: 'multi_raids/{id}',
    region: 'asia-east1',
  },
  async (event) => {
    const beforeSnap = event.data.before
    const afterSnap = event.data.after

    const before = beforeSnap.data()
    const after = afterSnap.data()

    if (!before || !after) return

    const beforeUsers = before.joinedUsers || []
    const afterUsers = after.joinedUsers || []

    const beforeCount = beforeUsers.length
    const afterCount = afterUsers.length

    if (afterCount <= beforeCount) return
    if (!after.ownerId) return

    const requiredPeople = Number(after.requiredPeople || 1)
    const latestUser = afterUsers[afterUsers.length - 1] || {}
    const latestName = latestUser.userName || latestUser.displayName || '有人'

    try {
      await pushLine(
        after.ownerId,
        `多人副本有人報名\n` +
          `任務：${after.title || '未命名任務'}\n` +
          `報名者：${latestName}\n` +
          `目前人數：${afterCount} / ${requiredPeople}\n\n` +
          `👉 點這裡查看多人副本：\n${LIFF_URL}`
      )

      const updateData = {
        lastJoinPushSentAt: admin.firestore.FieldValue.serverTimestamp(),
        joinedCount: afterCount,
      }

      if (afterCount >= requiredPeople && beforeCount < requiredPeople) {
        await pushLine(
          after.ownerId,
          `多人副本已額滿\n` +
            `任務：${after.title || '未命名任務'}\n` +
            `人數：${afterCount} / ${requiredPeople}\n\n` +
            `👉 點這裡查看多人副本：\n${LIFF_URL}`
        )

        updateData.status = 'full'
        updateData.fullNotified = true
        updateData.fullNotifiedAt = admin.firestore.FieldValue.serverTimestamp()
      }

      await afterSnap.ref.set(updateData, { merge: true })

      logger.info('多人副本通知成功', {
        raidId: event.params.id,
        ownerId: after.ownerId,
        beforeCount,
        afterCount,
      })
    } catch (err) {
      logger.error('多人副本通知失敗', {
        message: err?.message,
        response: err?.response?.data,
      })

      await afterSnap.ref.set(
        {
          raidPushError: JSON.stringify(err?.response?.data || err?.message || ''),
          raidPushErrorAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      )
    }
  }
)

// ==========================
// 單人沒有進行中任務 → 每 12 小時提醒一次
// ==========================
exports.remindUsersWithoutCurrentTask = onSchedule(
  {
    schedule: '0 */12 * * *',
    region: 'asia-east1',
    timeZone: 'Asia/Taipei',
  },
  async () => {
    const now = new Date()

    const taipeiHour = Number(
      new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Taipei',
        hour: '2-digit',
        hour12: false,
      }).format(now)
    )

    if (taipeiHour >= 0 && taipeiHour < 7) {
      logger.info('睡眠時間，不發送無任務提醒')
      return
    }

    const usersSnap = await db.collection('users').limit(500).get()

    const jobs = usersSnap.docs.map(async (userDoc) => {
      const user = userDoc.data()

      const lineUserId =
        user.lineUserId ||
        user.userId ||
        user.lineId ||
        userDoc.id

      if (!lineUserId) return

      const lastLoginAt = user.lastLoginAt?.toDate
        ? user.lastLoginAt.toDate()
        : null

      if (lastLoginAt) {
        const diffHours = (now.getTime() - lastLoginAt.getTime()) / 1000 / 60 / 60
        if (diffHours < 2) return
      }

      const lastNotifiedAt = user.noTaskNotifiedAt?.toDate
        ? user.noTaskNotifiedAt.toDate()
        : null

      if (lastNotifiedAt) {
        const diffHours = (now.getTime() - lastNotifiedAt.getTime()) / 1000 / 60 / 60
        if (diffHours < 12) return
      }

      let hasCurrentTask = false

      const q1 = await db
        .collection('tasks')
        .where('ownerId', '==', lineUserId)
        .where('status', '==', 'pending')
        .where('isCurrent', '==', true)
        .limit(1)
        .get()

      if (!q1.empty) hasCurrentTask = true

      if (!hasCurrentTask) {
        const q2 = await db
          .collection('tasks')
          .where('userId', '==', lineUserId)
          .where('status', '==', 'pending')
          .where('isCurrent', '==', true)
          .limit(1)
          .get()

        if (!q2.empty) hasCurrentTask = true
      }

      if (hasCurrentTask) return

      try {
        await pushLine(
          lineUserId,
          `目前沒有進行中的任務\n\n` +
            `提醒你可以安排下一步。\n\n` +
            `👉 點這裡回到任務首頁：\n${LIFF_URL}`
        )

        await userDoc.ref.set(
          {
            noTaskNotifiedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        )

        logger.info('無任務提醒成功', { lineUserId })
      } catch (err) {
        logger.error('無任務提醒失敗', {
          lineUserId,
          message: err?.message,
          response: err?.response?.data,
        })
      }
    })

    await Promise.all(jobs)
  }
)
