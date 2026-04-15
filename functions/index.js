const admin = require("firebase-admin");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { defineSecret } = require("firebase-functions/params");

admin.initializeApp();

const db = admin.firestore();
const LINE_CHANNEL_ACCESS_TOKEN = defineSecret("LINE_CHANNEL_ACCESS_TOKEN");

/**
 * 把 "2300" 轉成分鐘（1380）
 */
function hhmmToMinutes(hhmm = "0000") {
  const text = String(hhmm).padStart(4, "0");
  const hour = Number(text.slice(0, 2));
  const minute = Number(text.slice(2, 4));

  if (
    Number.isNaN(hour) ||
    Number.isNaN(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return 0;
  }

  return hour * 60 + minute;
}

/**
 * 判斷現在是不是睡眠時間
 * 例：
 * start=2300, end=0700
 * 23:00~23:59 或 00:00~06:59 都算睡眠時間
 */
function isInSleepTime(now, sleepStart = "2300", sleepEnd = "0700") {
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const start = hhmmToMinutes(sleepStart);
  const end = hhmmToMinutes(sleepEnd);

  if (start === end) return false;

  // 同日區間，例如 0100 ~ 0600
  if (start < end) {
    return nowMinutes >= start && nowMinutes < end;
  }

  // 跨日區間，例如 2300 ~ 0700
  return nowMinutes >= start || nowMinutes < end;
}

/**
 * 發送 LINE Push Message
 */
async function pushLineMessage(lineUserId, text, channelAccessToken) {
  const response = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${channelAccessToken}`,
    },
    body: JSON.stringify({
      to: lineUserId,
      messages: [
        {
          type: "text",
          text,
        },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`LINE push failed: ${response.status} ${body}`);
  }
}

/**
 * 每 5 分鐘巡一次：
 * 1. 沒有 current task
 * 2. idleSince 已存在
 * 3. 已空白 >= idleReminderMinutes（預設 30）
 * 4. 非睡眠時間
 * 5. 距離上次提醒 >= idleReminderMinutes
 */
exports.checkIdleUsers = onSchedule(
  {
    schedule: "every 5 minutes",
    timeZone: "Asia/Taipei",
    secrets: [LINE_CHANNEL_ACCESS_TOKEN],
    memory: "256MiB",
    timeoutSeconds: 120,
  },
  async () => {
    const now = new Date();
    const nowTimestamp = admin.firestore.Timestamp.fromDate(now);
    const channelAccessToken = LINE_CHANNEL_ACCESS_TOKEN.value();

    const usersSnap = await db.collection("users").get();

    for (const userDoc of usersSnap.docs) {
      try {
        const user = userDoc.data();
        const userId = userDoc.id;

        const lineUserId = user.lineUserId || userId;
        const idleSince = user.idleSince?.toDate ? user.idleSince.toDate() : null;
        const sleepStart = user.sleepStart || "2300";
        const sleepEnd = user.sleepEnd || "0700";
        const idleReminderMinutes = Number(user.idleReminderMinutes || 30);
        const lastReminderAt = user.lastReminderAt?.toDate
          ? user.lastReminderAt.toDate()
          : null;

        if (!lineUserId) continue;
        if (!idleSince) continue;

        // 睡眠時間不提醒
        if (isInSleepTime(now, sleepStart, sleepEnd)) {
          continue;
        }

        // 再查一次目前是否真的沒有任務
        const taskSnap = await db
          .collection("tasks")
          .where("ownerId", "==", userId)
          .where("status", "==", "pending")
          .orderBy("dueAt", "asc")
          .limit(1)
          .get();

        const hasCurrentTask = !taskSnap.empty;
        if (hasCurrentTask) {
          // 有任務就順手清掉 idle 狀態，避免髒資料
          await userDoc.ref.set(
            {
              idleSince: null,
              lastReminderAt: null,
              updatedAt: nowTimestamp,
            },
            { merge: true }
          );
          continue;
        }

        const idleMinutes = Math.floor(
          (now.getTime() - idleSince.getTime()) / 60000
        );

        if (idleMinutes < idleReminderMinutes) {
          continue;
        }

        if (lastReminderAt) {
          const diffMinutes = Math.floor(
            (now.getTime() - lastReminderAt.getTime()) / 60000
          );
          if (diffMinutes < idleReminderMinutes) {
            continue;
          }
        }

        await pushLineMessage(
          lineUserId,
          `你已經空白超過 ${idleReminderMinutes} 分鐘，請安排下一個任務。`,
          channelAccessToken
        );

        await userDoc.ref.set(
          {
            lastReminderAt: nowTimestamp,
            updatedAt: nowTimestamp,
          },
          { merge: true }
        );
      } catch (err) {
        console.error("checkIdleUsers error:", userDoc.id, err);
      }
    }
  }
);
