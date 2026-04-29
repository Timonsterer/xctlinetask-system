const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore')
const logger = require('firebase-functions/logger')
const admin = require('firebase-admin')
const axios = require('axios')

admin.initializeApp()

const LINE_TOKEN = "aJdHrp9V8uX75wOOaTPriztvvAkoiqhNItewcdI/oPeQLfw02AVWgoRSx3HN8vcRqD0/jVbWIQ4+J6kaSXrqWu4viIn44060THxh5CRoxdsYshKERXv3RSAyycpcsHfnhiR5s3a64ZEJ1vs7L56z3QdB04t89/1O/w1cDnyilFU="
const LIFF_URL = 'https://liff.line.me/2009690445-fzD5YF3K'

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
      await axios.post(
        'https://api.line.me/v2/bot/message/push',
        {
          to: data.toUserId,
          messages: [
            {
              type: 'text',
              text:
                `你收到新的邀請\n` +
                `邀請人：${data.fromUserName || '有人'}\n` +
                `內容：${data.title || '未填寫'}\n\n` +
                `👉 點這裡查看閒置市場：\n${LIFF_URL}`
            }
          ]
        },
        {
          headers: {
            Authorization: `Bearer ${LINE_TOKEN}`,
            'Content-Type': 'application/json',
          },
        }
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

    // 沒變化不處理
    if (oldStatus === newStatus) return

    // 只處理 accepted / rejected
    if (!['accepted', 'rejected'].includes(newStatus)) return

    // 沒有邀請人ID就不推
    if (!after.fromUserId) return

    // 防止重複推播
    if (after.lineStatusPushSent === true) return

    const statusText = newStatus === 'accepted' ? '已接受' : '已拒絕'

    try {
      await axios.post(
        'https://api.line.me/v2/bot/message/push',
        {
          to: after.fromUserId,
          messages: [
            {
              type: 'text',
              text:
                `你的邀請${statusText}\n` +
                `對象：${after.toUserName || '對方'}\n` +
                `內容：${after.title || '未填寫'}\n\n` +
                `👉 點這裡回到閒置市場：\n${LIFF_URL}`
            }
          ]
        },
        {
          headers: {
            Authorization: `Bearer ${LINE_TOKEN}`,
            'Content-Type': 'application/json',
          },
        }
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
