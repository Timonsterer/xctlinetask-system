const functions = require('firebase-functions')
const admin = require('firebase-admin')
const axios = require('axios')

admin.initializeApp()

// ⚠️ 先用這個測試（之後再改成 secret）
const LINE_TOKEN = aJdHrp9V8uX75wOOaTPriztvvAkoiqhNItewcdI/oPeQLfw02AVWgoRSx3HN8vcRqD0/jVbWIQ4+J6kaSXrqWu4viIn44060THxh5CRoxdsYshKERXv3RSAyycpcsHfnhiR5s3a64ZEJ1vs7L56z3QdB04t89/1O/w1cDnyilFU=

exports.onInviteCreated = functions
  .region('asia-east1')
  .firestore
  .document('idle_invites/{id}')
  .onCreate(async (snap, context) => {

    const data = snap.data()

    if (!data) return null
    if (!data.toUserId) return null

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
                `內容：${data.title || '未填寫'}`
            }
          ]
        },
        {
          headers: {
            Authorization: `Bearer ${LINE_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      )

      console.log('LINE 發送成功')

    } catch (err) {
      console.error('LINE 發送失敗', err.response?.data || err.message)
    }

    return null
  })
