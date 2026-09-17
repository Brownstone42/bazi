import { calculateBaziChart } from '@openfate/bazi-engine'

function parseBirthDate(value) {
  const thaiOrder = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value)
  const isoOrder = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  const parts = thaiOrder
    ? { day: Number(thaiOrder[1]), month: Number(thaiOrder[2]), year: Number(thaiOrder[3]) }
    : isoOrder
      ? { day: Number(isoOrder[3]), month: Number(isoOrder[2]), year: Number(isoOrder[1]) }
      : null

  if (!parts) throw new Error('กรุณากรอกวันเกิดในรูปแบบ วัน/เดือน/ปี เช่น 26/08/1989')

  const check = new Date(Date.UTC(parts.year, parts.month - 1, parts.day))
  const valid = check.getUTCFullYear() === parts.year &&
    check.getUTCMonth() === parts.month - 1 &&
    check.getUTCDate() === parts.day
  if (!valid) throw new Error('วันเกิดไม่ถูกต้อง กรุณาตรวจสอบวัน เดือน และปีอีกครั้ง')

  return parts
}

function calculateChartFromTime(form, birthTime) {
  const { year, month, day } = parseBirthDate(form.birthDate)
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(birthTime)) {
    throw new Error('เวลาเกิดไม่ถูกต้อง กรุณากรอกแบบ 24 ชั่วโมง เช่น 23:30')
  }
  const [hour, minute] = birthTime.split(':').map(Number)

  return calculateBaziChart({
    year,
    month,
    day,
    hour,
    minute,
    gender: form.gender,
    timezoneId: form.timezoneId,
    enableTrueSolarTime: false,
    dayBoundaryMode: 'ZI_HOUR_23',
    calendarType: 'solar'
  })
}

export function calculateChart(form) {
  if (!form.birthTime) throw new Error('กรุณากรอกเวลาเกิด')
  return calculateChartFromTime(form, form.birthTime)
}

export function calculateChartWithOptionalTime(form) {
  const hasBirthTime = Boolean(form.birthTime)
  return {
    chart: calculateChartFromTime(form, hasBirthTime ? form.birthTime : '12:00'),
    hasBirthTime
  }
}

export function pillarLabel(pillar) {
  if (!pillar) return '—'
  return `${pillar.stem ?? ''}${pillar.branch ?? ''}`
}

const elementThai = {
  wood: 'ไม้',
  fire: 'ไฟ',
  earth: 'ดิน',
  metal: 'ทอง',
  water: 'น้ำ'
}

const polarityThai = {
  yang: 'หยาง',
  yin: 'หยิน'
}

const branchThai = {
  子: 'ชวด',
  丑: 'ฉลู',
  寅: 'ขาล',
  卯: 'เถาะ',
  辰: 'มะโรง',
  巳: 'มะเส็ง',
  午: 'มะเมีย',
  未: 'มะแม',
  申: 'วอก',
  酉: 'ระกา',
  戌: 'จอ',
  亥: 'กุน'
}

export function stemThai(pillar) {
  if (!pillar) return '—'
  return `${elementThai[pillar.element] ?? pillar.element} ${polarityThai[pillar.stemPolarity] ?? pillar.stemPolarity}`
}

export function branchThaiLabel(pillar) {
  if (!pillar) return '—'
  const animal = branchThai[pillar.branch] ?? pillar.branch
  const element = elementThai[pillar.branchElement] ?? pillar.branchElement
  const polarity = polarityThai[pillar.stemPolarity === 'yang' ? 'yang' : 'yin']
  return `${animal} · ${element} ${polarity}`
}

export function elementThaiLabel(element) {
  return elementThai[element] ?? element ?? '—'
}
