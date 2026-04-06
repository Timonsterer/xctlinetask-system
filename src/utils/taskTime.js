export function pad2(value) {
  return String(value).padStart(2, '0')
}

export function formatDateTime(date) {
  if (!date) return ''
  const d = date instanceof Date ? date : new Date(date)
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

export function parseTaskTimeInput(input) {
  const raw = (input || '').trim()
  const now = new Date()

  // 空白 = 現在 + 30 分鐘
  if (!raw) {
    return new Date(now.getTime() + 30 * 60 * 1000)
  }

  // HHMM
  if (/^\d{4}$/.test(raw)) {
    const hh = Number(raw.slice(0, 2))
    const mm = Number(raw.slice(2, 4))

    if (hh > 23 || mm > 59) {
      throw new Error('時間格式錯誤，四碼請輸入 HHMM，例如 1430')
    }

    const target = new Date(now)
    target.setHours(hh, mm, 0, 0)
    return target
  }

  // HHMM-MMDD
  if (/^\d{4}-\d{4}$/.test(raw)) {
    const hh = Number(raw.slice(0, 2))
    const mm = Number(raw.slice(2, 4))
    const month = Number(raw.slice(5, 7))
    const day = Number(raw.slice(7, 9))

    if (hh > 23 || mm > 59) {
      throw new Error('時間格式錯誤，請輸入 HHMM-MMDD，例如 1430-0408')
    }
    if (month < 1 || month > 12 || day < 1 || day > 31) {
      throw new Error('日期格式錯誤，請輸入 HHMM-MMDD，例如 1430-0408')
    }

    const year = now.getFullYear()
    const target = new Date(year, month - 1, day, hh, mm, 0, 0)

    if (Number.isNaN(target.getTime())) {
      throw new Error('無法解析日期時間')
    }

    return target
  }

  throw new Error('請輸入 HHMM 或 HHMM-MMDD，例如 1430 或 1430-0408')
}

export function parseDurationInput(input) {
  const raw = (input || '').trim()

  // 空白 = 30 分鐘
  if (!raw) return 30

  if (!/^\d{4}$/.test(raw)) {
    throw new Error('需求時間請輸入四碼，例如 0230 代表 2 小時 30 分')
  }

  const hh = Number(raw.slice(0, 2))
  const mm = Number(raw.slice(2, 4))

  if (mm > 59) {
    throw new Error('需求時間格式錯誤，分鐘不可超過 59')
  }

  return hh * 60 + mm
}

export function durationMinutesToText(minutes = 0) {
  const hh = Math.floor(minutes / 60)
  const mm = minutes % 60

  if (hh > 0 && mm > 0) return `${hh}小時${mm}分鐘`
  if (hh > 0) return `${hh}小時`
  return `${mm}分鐘`
}

export function hhmmToMinutes(hhmm = '0000') {
  const raw = String(hhmm).padStart(4, '0')
  const hh = Number(raw.slice(0, 2))
  const mm = Number(raw.slice(2, 4))
  return hh * 60 + mm
}

export function isInSleepTime(now = new Date(), sleepStart = '2300', sleepEnd = '0700') {
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const startMinutes = hhmmToMinutes(sleepStart)
  const endMinutes = hhmmToMinutes(sleepEnd)

  // 同日區間
  if (startMinutes < endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes
  }

  // 跨午夜區間，例如 2300 ~ 0700
  return currentMinutes >= startMinutes || currentMinutes < endMinutes
}
