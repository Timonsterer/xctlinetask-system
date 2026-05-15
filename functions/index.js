const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore')
const { onSchedule } = require('firebase-functions/v2/scheduler')
const { onCall } = require('firebase-functions/v2/https')
const logger = require('firebase-functions/logger')
const admin = require('firebase-admin')
const axios = require('axios')

admin.initializeApp()

const LINE_TOKEN = "aJdHrp9V8uX75wOOaTPriztvvAkoiqhNItewcdI/oPeQLfw02AVWgoRSx3HN8vcRqD0/jVbWIQ4+J6kaSXrqWu4viIn44060THxh5CRoxdsYshKERXv3RSAyycpcsHfnhiR5s3a64ZEJ1vs7L56z3QdB04t89/1O/w1cDnyilFU="
const LIFF_URL = 'https://liff.line.me/2009690445-fzD5YF3K'
const HOME_URL = `${LIFF_URL}`
const RAID_URL = `${LIFF_URL}?page=raid`

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

function uniqueArray(arr) {
  return [...new Set(arr.filter(Boolean))]
}

function getTaskTitle(task) {
  return task.title || task.content || task.name || '未命名任務'
}

function getRaidTitle(raid) {
  return raid.title || raid.name || raid.taskName || '未命名副本'
}

function getUserLineIdFromJoinedUser(user) {
  if (!user) return ''

  return (
    user.lineUserId ||
    user.userId ||
    user.id ||
    user.uid ||
    ''
  )
}

function getUserNameFromJoinedUser(user) {
  if (!user) return '有人'

  return (
    user.userName ||
    user.displayName ||
    user.name ||
    user.nickname ||
    '有人'
  )
}

function getJoinMessageFromUser(user) {
  if (!user) return ''

  return (
    user.message ||
    user.joinMessage ||
    user.note ||
    user.remark ||
    user.memo ||
    ''
  )
}

// ==========================
// 登入後檢查一次：已關閉空白任務通知
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

    return { success: true, notified: false }
  }
)

// ==========================
// 當下 10 分鐘後有任務 → 任務提醒，只提醒一次
// ==========================
exports.remindTaskBefore10Minutes = onSchedule(
  {
    schedule: 'every 1 minutes',
    region: 'asia-east1',
    timeZone: 'Asia/Taipei',
  },
  async () => {
    const now = new Date()
    const from = new Date(now.getTime() + 9 * 60 * 1000)
    const to = new Date(now.getTime() + 11 * 60 * 1000)

    try {
      const snap = await db
        .collection('tasks')
        .where('startAt', '>=', admin.firestore.Timestamp.fromDate(from))
        .where('startAt', '<=', admin.firestore.Timestamp.fromDate(to))
        .get()

      if (snap.empty) {
        logger.info('10分鐘任務提醒：沒有符合任務')
        return
      }

      const jobs = []

      snap.forEach((docSnap) => {
        const task = docSnap.data()

        if (!task) return
        if (task.taskReminder10Sent === true) return
        if (['done', 'completed', 'cancelled', 'canceled'].includes(task.status)) return

        const lineUserId =
          task.lineUserId ||
          task.userId ||
          task.ownerId ||
          ''

        if (!lineUserId) return

        const title = getTaskTitle(task)

        jobs.push(
          pushLine(
            lineUserId,
            `任務提醒\n` +
              `10 分鐘後有任務要執行\n\n` +
              `任務：${title}\n\n` +
              `👉 點這裡回到首頁：\n${HOME_URL}`
          ).then(() =>
            docSnap.ref.set(
              {
                taskReminder10Sent: true,
                taskReminder10SentAt: admin.firestore.FieldValue.serverTimestamp(),
              },
              { merge: true }
            )
          )
        )
      })

      await Promise.all(jobs)

      logger.info('10分鐘任務提醒完成', {
        count: jobs.length,
      })
    } catch (err) {
      logger.error('10分鐘任務提醒失敗', {
        message: err?.message,
        response: err?.response?.data,
      })
    }
  }
)

// ==========================
// 新優惠券 → 通知所有使用者，只提醒一次
// ==========================
exports.onCouponCreated = onDocumentCreated(
  {
    document: 'coupons/{id}',
    region: 'asia-east1',
  },
  async (event) => {
    const snap = event.data
    if (!snap) return

    const coupon = snap.data()
    if (!coupon) return
    if (coupon.couponPushSent === true) return

    const title =
      coupon.title ||
      coupon.discountText ||
      '新優惠券'

    const merchantName =
      coupon.merchantName ||
      '合作店家'

    const endDateText = coupon.endDate
      ? `\n有效期限：${coupon.endDate}`
      : ''

    try {
      const usersSnap = await db.collection('users').get()

      const targets = []

      usersSnap.forEach((docSnap) => {
        const user = docSnap.data()

        const lineUserId =
          user.lineUserId ||
          user.userId ||
          docSnap.id

        if (lineUserId) {
          targets.push(lineUserId)
        }
      })

      const uniqueTargets = uniqueArray(targets)

      await Promise.all(
        uniqueTargets.map((lineUserId) =>
          pushLine(
            lineUserId,
            `有新的探店優惠券\n` +
              `店家：${merchantName}\n` +
              `優惠：${title}${endDateText}\n\n` +
              `👉 點這裡查看優惠券：\n${LIFF_URL}`
          )
        )
      )

      await snap.ref.set(
        {
          couponPushSent: true,
          couponPushSentAt: admin.firestore.FieldValue.serverTimestamp(),
          couponPushTargetCount: uniqueTargets.length,
        },
        { merge: true }
      )

      logger.info('新優惠券通知成功', {
        couponId: event.params.id,
        targetCount: uniqueTargets.length,
      })
    } catch (err) {
      logger.error('新優惠券通知失敗', {
        message: err?.message,
        response: err?.response?.data,
      })

      await snap.ref.set(
        {
          couponPushSent: false,
          couponPushError: JSON.stringify(err?.response?.data || err?.message || ''),
          couponPushErrorAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      )
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
// 多人副本：報名 / 額滿 / 編輯內容 → 最小幅度通知
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

    const raidTitle = getRaidTitle(after)

    const ownerId =
      after.ownerId ||
      after.createdBy ||
      after.userId ||
      ''

    const participantIds = afterUsers.map((user) =>
      getUserLineIdFromJoinedUser(user)
    )

    // ==========================
    // 1. 副本內容被編輯 → 只通知參加者
    // ==========================
    const raidEdited =
      before.title !== after.title ||
      before.note !== after.note ||
      before.googleLink !== after.googleLink ||
      before.challengeTarget !== after.challengeTarget ||
      Number(before.requiredPeople || 1) !== Number(after.requiredPeople || 1)

    if (raidEdited && afterCount > 0) {
      const editTargets = uniqueArray(participantIds)

      try {
        await Promise.all(
          editTargets.map((lineUserId) =>
            pushLine(
              lineUserId,
              `多人副本內容已更新\n` +
                `副本：${raidTitle}\n\n` +
                `請重新查看最新內容\n\n` +
                `👉 點這裡查看副本：\n${RAID_URL}`
            )
          )
        )

        await afterSnap.ref.set(
          {
            lastEditPushSentAt: admin.firestore.FieldValue.serverTimestamp(),
            lastEditPushTargetCount: editTargets.length,
          },
          { merge: true }
        )

        logger.info('多人副本編輯通知成功', {
          raidId: event.params.id,
          targetCount: editTargets.length,
        })
      } catch (err) {
        logger.error('多人副本編輯通知失敗', {
          message: err?.message,
          response: err?.response?.data,
        })

        await afterSnap.ref.set(
          {
            raidEditPushError: JSON.stringify(err?.response?.data || err?.message || ''),
            raidEditPushErrorAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        )
      }
    }

    // ==========================
    // 2. 沒有新增報名 → 不處理報名通知
    // ==========================
    if (afterCount <= beforeCount) return

    const requiredPeople = Number(after.requiredPeople || 1)
    const latestUser = afterUsers[afterUsers.length - 1] || {}

    const latestName = getUserNameFromJoinedUser(latestUser)
    const latestUserId = getUserLineIdFromJoinedUser(latestUser)
    const joinMessage = getJoinMessageFromUser(latestUser)

    const joinTargets = uniqueArray([
      ownerId,
      ...participantIds,
    ])

    const messageText =
      `多人副本有人報名\n` +
      `副本：${raidTitle}\n` +
      `報名者：${latestName}\n` +
      `目前人數：${afterCount} / ${requiredPeople}` +
      `${joinMessage ? `\n\n報名人訊息：${joinMessage}` : ''}\n\n` +
      `👉 點這裡查看副本：\n${RAID_URL}`

    try {
      await Promise.all(
        joinTargets.map((lineUserId) =>
          pushLine(lineUserId, messageText)
        )
      )

      const updateData = {
        lastJoinPushSentAt: admin.firestore.FieldValue.serverTimestamp(),
        lastJoinUserId: latestUserId,
        lastJoinUserName: latestName,
        joinedCount: afterCount,
      }

      // ==========================
      // 3. 剛好額滿 → 通知一次
      // ==========================
      if (afterCount >= requiredPeople && beforeCount < requiredPeople && after.fullNotified !== true) {
        const fullTargets = uniqueArray([
          ownerId,
          ...participantIds,
        ])

        await Promise.all(
          fullTargets.map((lineUserId) =>
            pushLine(
              lineUserId,
              `多人副本已額滿\n` +
                `副本：${raidTitle}\n` +
                `人數：${afterCount} / ${requiredPeople}\n\n` +
                `👉 點這裡查看副本：\n${RAID_URL}`
            )
          )
        )

        updateData.status = 'full'
        updateData.fullNotified = true
        updateData.fullNotifiedAt = admin.firestore.FieldValue.serverTimestamp()
      }

      await afterSnap.ref.set(updateData, { merge: true })

      logger.info('多人副本通知成功', {
        raidId: event.params.id,
        ownerId,
        targetCount: joinTargets.length,
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
// 單人沒有進行中任務提醒：已關閉
// ==========================
exports.remindUsersWithoutCurrentTask = onSchedule(
  {
    schedule: '0 */12 * * *',
    region: 'asia-east1',
    timeZone: 'Asia/Taipei',
  },
  async () => {
    logger.info('空白任務通知已關閉')
    return
  }
)
