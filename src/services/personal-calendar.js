import { calculateChart } from './bazi'

const elements = ['wood', 'fire', 'earth', 'metal', 'water']
const produces = { wood: 'fire', fire: 'earth', earth: 'metal', metal: 'water', water: 'wood' }
const controls = { wood: 'earth', earth: 'water', water: 'fire', fire: 'metal', metal: 'wood' }
const branchClashes = new Set(['子午', '丑未', '寅申', '卯酉', '辰戌', '巳亥'])
const branchCombinations = new Set(['子丑', '寅亥', '卯戌', '辰酉', '巳申', '午未'])
const branchHarms = new Set(['子未', '丑午', '寅巳', '卯辰', '申亥', '酉戌'])
const thaiMonths = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
]

export const calendarFocusOptions = [
  { label: 'ภาพรวมทุกเรื่อง', value: 'all', icon: 'pi-sparkles' },
  { label: 'งานและธุรกิจ', value: 'work', icon: 'pi-briefcase' },
  { label: 'การเงิน', value: 'money', icon: 'pi-wallet' },
  { label: 'ความรัก', value: 'love', icon: 'pi-heart' },
  { label: 'การเจรจา', value: 'communication', icon: 'pi-comments' },
  { label: 'การพักและดูแลตัวเอง', value: 'wellbeing', icon: 'pi-sun' }
]

const focusProfiles = {
  work: {
    label: 'งานและธุรกิจ', positions: ['month', 'hour'], preferred: ['output', 'power', 'wealth'],
    goodTag: 'งานเดินหน้า', mixedTag: 'จัดลำดับงาน', cautionTag: 'อย่าฝืนจังหวะ',
    goodDo: 'ใช้วันนี้กับงานสำคัญ การเสนอความคิด การขอคำตอบ หรือการตัดสินใจที่เตรียมข้อมูลไว้แล้ว',
    mixedDo: 'เลือกงานหลักเพียงหนึ่งเรื่อง ทำขอบเขตและผู้รับผิดชอบให้ชัดก่อนเริ่ม',
    cautionDo: 'ทบทวนข้อมูล ลดขอบเขตงาน และเผื่อเวลาให้การตัดสินใจมากกว่าปกติ'
  },
  money: {
    label: 'การเงิน', positions: ['month'], preferred: ['wealth', 'output'],
    goodTag: 'เหมาะจัดการเงิน', mixedTag: 'ตรวจตัวเลขก่อน', cautionTag: 'เงินรั่วง่าย',
    goodDo: 'เหมาะกับการทบทวนราคา ต่อรองรายได้ ติดตามเงินค้าง หรือจัดการทรัพย์สินที่มีข้อมูลพร้อม',
    mixedDo: 'ทำรายการเงินเข้าออกและกำหนดเพดานก่อนตัดสินใจเรื่องค่าใช้จ่ายหรือการลงทุน',
    cautionDo: 'รักษาสภาพคล่อง ตรวจเงื่อนไขซ้ำ และชะลอข้อเสนอที่กดดันให้ตัดสินใจทันที'
  },
  love: {
    label: 'ความรัก', positions: ['day'], preferred: ['wealth', 'power', 'resource'],
    goodTag: 'คุยกันได้ดี', mixedTag: 'ฟังให้มากขึ้น', cautionTag: 'ระวังปะทะ',
    goodDo: 'ใช้เวลากับอีกฝ่าย พูดความต้องการอย่างตรงไปตรงมา และคุยเรื่องที่ต้องการความร่วมมือ',
    mixedDo: 'ถามความรู้สึกและความต้องการก่อนเสนอทางแก้ เพื่อไม่ให้อีกฝ่ายรู้สึกว่าถูกตัดสิน',
    cautionDo: 'คุยทีละประเด็น เลือกเวลาที่ทั้งสองฝ่ายไม่เร่งรีบ และหยุดพักเมื่อเริ่มใช้อารมณ์'
  },
  communication: {
    label: 'การเจรจา', positions: ['month', 'day'], preferred: ['output', 'wealth'],
    goodTag: 'เหมาะเจรจา', mixedTag: 'พูดให้กระชับ', cautionTag: 'ระวังคำพูด',
    goodDo: 'เหมาะกับการนำเสนอ นัดหมาย ต่อรอง และขอความร่วมมือ โดยเฉพาะเรื่องที่มีข้อมูลรองรับ',
    mixedDo: 'กำหนดประเด็นหลักและผลลัพธ์ที่ต้องการก่อนเริ่มคุย เพื่อไม่ให้บทสนทนากระจาย',
    cautionDo: 'สื่อสารด้วยข้อเท็จจริง ใช้คำถามแทนการสรุปแทนอีกฝ่าย และตรวจข้อความก่อนส่ง'
  },
  wellbeing: {
    label: 'การพักและดูแลตัวเอง', positions: ['year', 'month', 'day', 'hour'], preferred: ['resource', 'peer'],
    goodTag: 'ฟื้นกำลังได้ดี', mixedTag: 'รักษาจังหวะ', cautionTag: 'ควรพักเพิ่ม',
    goodDo: 'จัดเวลานอน อาหาร การเคลื่อนไหว และช่วงพักให้เป็นกิจวัตร พร้อมลดเรื่องที่ไม่จำเป็นออกจากตาราง',
    mixedDo: 'สลับงานใช้สมาธิกับช่วงพักสั้น ๆ และกำหนดเวลาหยุดรับข้อมูลให้ชัด',
    cautionDo: 'ลดภาระที่เลื่อนได้ ขอความช่วยเหลือ และเว้นช่วงฟื้นตัวก่อนรับเรื่องใหม่'
  }
}

const relationGuidance = {
  peer: 'ให้คนที่เกี่ยวข้องมีส่วนร่วมตั้งแต่ต้น และตกลงว่าใครรับผิดชอบเรื่องใดเพื่อไม่ให้เกิดการแข่งกันโดยไม่จำเป็น',
  resource: 'ใช้ข้อมูลเดิม คำแนะนำจากคนที่ไว้ใจ หรือเวลาสำหรับเตรียมตัวให้เต็มที่ก่อนลงมือ',
  output: 'เปลี่ยนความคิดให้เป็นสิ่งที่มองเห็นได้ เช่น ร่างข้อเสนอ ตัวอย่าง หรือข้อความสั้น ๆ แล้วค่อยขอความคิดเห็น',
  wealth: 'กำหนดผลลัพธ์ งบประมาณ และสิ่งที่ยอมแลกได้ให้ชัด เพื่อให้โอกาสที่เข้ามาไม่กลายเป็นภาระเกินตัว',
  power: 'ตรวจเงื่อนไข กติกา และผู้มีอำนาจตัดสินใจก่อนเดินหน้า อย่ารับปากในส่วนที่ยังควบคุมไม่ได้',
  neutral: 'เลือกเป้าหมายที่สำคัญที่สุดหนึ่งเรื่อง และใช้ข้อมูลจากสถานการณ์จริงมากกว่าความรู้สึกเร่งด่วน'
}

function hasPair(collection, a, b) {
  return collection.has(`${a}${b}`) || collection.has(`${b}${a}`)
}

function relationToDayMaster(dayMasterElement, targetElement) {
  if (targetElement === dayMasterElement) return 'peer'
  if (produces[targetElement] === dayMasterElement) return 'resource'
  if (produces[dayMasterElement] === targetElement) return 'output'
  if (controls[dayMasterElement] === targetElement) return 'wealth'
  if (controls[targetElement] === dayMasterElement) return 'power'
  return 'neutral'
}

function formatDateInput(year, month, day) {
  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`
}

function dateKey(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

function mondayFirstWeekday(year, month, day = 1) {
  return (new Date(Date.UTC(year, month - 1, day)).getUTCDay() + 6) % 7
}

function scoreElement(element, assessment) {
  if (element === assessment.primaryUsefulElement) return 2
  if (element === assessment.supportiveElement) return 1
  if ((assessment.cautionElements ?? []).includes(element)) return -1.5
  return 0
}

function collectInteractions(dayBranch, chart, positions) {
  const interactions = []
  positions.forEach((position) => {
    const natalBranch = chart.pillars[position]?.branch
    if (!natalBranch) return
    if (hasPair(branchClashes, dayBranch, natalBranch)) interactions.push({ type: 'clash', position })
    else if (hasPair(branchCombinations, dayBranch, natalBranch)) interactions.push({ type: 'combine', position })
    else if (hasPair(branchHarms, dayBranch, natalBranch)) interactions.push({ type: 'harm', position })
    else if (dayBranch === natalBranch) interactions.push({ type: 'repeat', position })
  })
  return interactions
}

function levelFromScore(score) {
  if (score >= 3) return 'strong'
  if (score >= 1) return 'supportive'
  if (score > -2) return 'balanced'
  return 'caution'
}

function joinThaiList(items) {
  if (items.length <= 1) return items[0] ?? ''
  if (items.length === 2) return `${items[0]}และ${items[1]}`
  return `${items.slice(0, -1).join(', ')} และ${items.at(-1)}`
}

function buildDayReading({ year, month, day, chart, assessment, input, focus, currentLuckCycle, todayKey, transit: suppliedTransit }) {
  const profile = focusProfiles[focus]
  const transit = suppliedTransit ?? calculateChart({
    birthDate: formatDateInput(year, month, day),
    birthTime: '12:00',
    gender: input.gender,
    timezoneId: input.timezoneId
  })
  const dayPillar = transit.pillars.day
  const monthPillar = transit.pillars.month
  const yearPillar = transit.pillars.year
  const relation = relationToDayMaster(chart.dayMaster.element, dayPillar.element)
  const interactions = collectInteractions(dayPillar.branch, chart, profile.positions)
  let score = scoreElement(dayPillar.element, assessment) + scoreElement(dayPillar.branchElement, assessment) * 0.7
  if (profile.preferred.includes(relation)) score += 1.25
  interactions.forEach((interaction) => {
    if (interaction.type === 'combine') score += 1.5
    if (interaction.type === 'clash') score -= 2.5
    if (interaction.type === 'harm') score -= 1.25
    if (interaction.type === 'repeat') score += score >= 0 ? 0.5 : -0.5
  })
  if (currentLuckCycle?.branch) {
    if (hasPair(branchCombinations, dayPillar.branch, currentLuckCycle.branch)) score += 0.75
    if (hasPair(branchClashes, dayPillar.branch, currentLuckCycle.branch)) score -= 1
  }
  score = Math.max(-5, Math.min(5, score))
  const level = levelFromScore(score)
  const hasClash = interactions.some((item) => item.type === 'clash')
  const hasCombine = interactions.some((item) => item.type === 'combine')
  const isPositive = ['strong', 'supportive'].includes(level)
  const tag = isPositive ? profile.goodTag : level === 'caution' ? profile.cautionTag : profile.mixedTag
  const baseAdvice = level === 'caution' ? profile.cautionDo : isPositive ? profile.goodDo : profile.mixedDo
  const dailyAdvice = `${baseAdvice} ${relationGuidance[relation]}`
  const context = hasClash
    ? 'วันนี้มีแรงเสียดทานกับเรื่องที่คุณกำลังสนใจ จึงควรเผื่อเวลาและไม่บังคับให้ทุกอย่างได้ข้อสรุปทันที'
    : hasCombine
      ? 'วันนี้มีจังหวะที่ช่วยให้เรื่องนี้เชื่อมต่อกับคนหรือทรัพยากรได้ง่ายขึ้น หากคุณเป็นฝ่ายเริ่มอย่างชัดเจน'
      : isPositive
        ? 'พลังของวันนี้สนับสนุนวิธีลงมือที่เข้ากับพื้นดวงและช่วงชีวิตปัจจุบันของคุณ'
        : 'วันนี้ไม่ได้ขวางเรื่องนี้โดยตรง แต่ผลลัพธ์จะขึ้นกับการเตรียมตัวและการรักษาจังหวะมากกว่าปกติ'

  return {
    key: dateKey(year, month, day),
    day,
    weekday: mondayFirstWeekday(year, month, day),
    isToday: dateKey(year, month, day) === todayKey,
    score: Math.round(score * 10) / 10,
    level,
    focus,
    focusLabel: profile.label,
    status: isPositive ? 'เหมาะเดินหน้า' : level === 'caution' ? 'เพิ่มความระวัง' : 'ใช้ได้เมื่อเตรียมตัว',
    tag,
    headline: `${tag}สำหรับ${profile.label}`,
    summary: context,
    dailyAdvice,
    confidence: Math.abs(score) >= 3 || interactions.length >= 2 ? 'ค่อนข้างชัด' : 'ปานกลาง',
    contextPillars: {
      year: yearPillar.ganZhi,
      month: monthPillar.ganZhi,
      day: dayPillar.ganZhi
    }
  }
}

function buildOverviewDay(args) {
  const transit = calculateChart({
    birthDate: formatDateInput(args.year, args.month, args.day),
    birthTime: '12:00',
    gender: args.input.gender,
    timezoneId: args.input.timezoneId
  })
  const topicReadings = Object.keys(focusProfiles).map((focus) => buildDayReading({ ...args, focus, transit }))
  const positive = topicReadings.filter((item) => ['strong', 'supportive'].includes(item.level))
  const caution = topicReadings.filter((item) => item.level === 'caution')
  const score = topicReadings.reduce((total, item) => total + item.score, 0) / topicReadings.length
  const level = caution.length >= 2
    ? 'caution'
    : positive.length >= 3
      ? score >= 3 ? 'strong' : 'supportive'
      : 'balanced'
  const positiveLabels = joinThaiList(positive.map((item) => item.focusLabel))
  const cautionLabels = joinThaiList(caution.map((item) => item.focusLabel))
  const tag = level === 'caution' ? 'ลดความเร่ง' : positive.length >= 3 ? 'หลายเรื่องเดินหน้า' : 'เลือกเรื่องสำคัญ'
  const summary = positive.length && caution.length
    ? `วันนี้${positiveLabels}มีจังหวะให้เดินหน้า ขณะที่${cautionLabels}ควรเพิ่มความระมัดระวังและไม่รีบเอาข้อสรุป`
    : positive.length
      ? `วันนี้จังหวะโดยรวมสนับสนุน${positiveLabels} ส่วนเรื่องอื่นใช้ได้เมื่อเตรียมตัวและกำหนดเป้าหมายให้ชัด`
      : caution.length
        ? `วันนี้ควรลดความเร่งในเรื่อง${cautionLabels} และใช้เวลากับการเตรียมข้อมูลหรือเก็บงานมากกว่าการบังคับผลลัพธ์`
        : 'วันนี้ภาพรวมอยู่ในระดับกลาง เหมาะกับการทำเรื่องที่เตรียมไว้แล้วมากกว่าการเพิ่มภาระหรือเปลี่ยนแผนกะทันหัน'
  const dailyAdvice = positive.length && caution.length
    ? `ใช้จังหวะกับ${positiveLabels}ได้ แต่แยกเวลาออกจากเรื่อง${cautionLabels} อย่านำความเร่งจากเรื่องหนึ่งไปตัดสินอีกเรื่องหนึ่ง`
    : positive.length
      ? `เลือกเรื่องสำคัญในด้าน${positiveLabels}หนึ่งเรื่องแล้วเดินหน้าให้เกิดผลลัพธ์ที่ชัด ส่วนเรื่องอื่นรักษาแผนเดิมไว้ก่อน`
      : caution.length
        ? `ลดขอบเขตสิ่งที่ต้องตัดสินใจเกี่ยวกับ${cautionLabels} ตรวจเงื่อนไขซ้ำ และเผื่อทางเลือกหากสถานการณ์ไม่เป็นไปตามแผน`
        : 'จัดลำดับสิ่งสำคัญหนึ่งเรื่อง ลงมือจากข้อมูลที่มี และยังไม่จำเป็นต้องเร่งตัดสินใจในเรื่องที่เงื่อนไขไม่ชัด'

  return {
    ...topicReadings[0],
    score: Math.round(score * 10) / 10,
    level,
    tag,
    headline: tag,
    summary,
    dailyAdvice,
    confidence: topicReadings.some((item) => item.confidence === 'ค่อนข้างชัด') ? 'ค่อนข้างชัด' : 'ปานกลาง',
    topicReadings: topicReadings.map(({ focus, focusLabel, level: topicLevel, status, tag: topicTag }) => ({
      focus, focusLabel, level: topicLevel, status, tag: topicTag
    }))
  }
}

function todayInTimezone(timezoneId, now) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezoneId,
    year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(now)
  const read = (type) => Number(parts.find((part) => part.type === type)?.value)
  return { year: read('year'), month: read('month'), day: read('day') }
}

export function buildPersonalMonth({ chart, assessment, input, year, month, focus = 'all', currentLuckCycle = null, now = new Date() }) {
  if (!chart || !assessment || !input) return null
  if (!elements.includes(chart.dayMaster.element)) throw new Error('ไม่สามารถอ่านธาตุประจำตัวได้')
  if (focus !== 'all' && !focusProfiles[focus]) throw new Error('หัวข้อปฏิทินไม่ถูกต้อง')
  const today = todayInTimezone(input.timezoneId, now)
  const todayKey = dateKey(today.year, today.month, today.day)
  const count = daysInMonth(year, month)
  const days = Array.from({ length: count }, (_, index) => {
    const args = { year, month, day: index + 1, chart, assessment, input, currentLuckCycle, todayKey }
    return focus === 'all' ? buildOverviewDay(args) : buildDayReading({ ...args, focus })
  })
  const ranked = [...days].sort((a, b) => b.score - a.score || a.day - b.day)
  const recommended = ranked.slice(0, 3)
  const caution = [...days].sort((a, b) => a.score - b.score || a.day - b.day).slice(0, 2)
  const supportiveCount = days.filter((item) => ['strong', 'supportive'].includes(item.level)).length
  const cautionCount = days.filter((item) => item.level === 'caution').length
  const focusLabel = focus === 'all' ? 'ภาพรวมทุกเรื่อง' : focusProfiles[focus].label

  return {
    year,
    month,
    monthLabel: `${thaiMonths[month - 1]} ${year + 543}`,
    focus,
    focusLabel,
    leadingBlanks: mondayFirstWeekday(year, month),
    days,
    recommended,
    caution,
    summary: focus === 'all'
      ? 'ภาพรวมเดือนนี้ไม่ได้ดีหรือควรระวังพร้อมกันทุกด้าน กดแต่ละวันเพื่อดูว่างาน เงิน ความรัก การเจรจา และการพักอยู่ในจังหวะแบบใด'
      : supportiveCount >= cautionCount
        ? `เดือนนี้มีจังหวะให้เดินหน้าเรื่อง${focusLabel}เป็นระยะ เลือกใช้วันที่เด่นกับเรื่องสำคัญ และใช้วันกลาง ๆ สำหรับเตรียมข้อมูลหรือเก็บงาน`
        : `เดือนนี้เรื่อง${focusLabel}ต้องอาศัยการวางแผนมากกว่าการเร่งผล เลือกวันสำคัญอย่างตั้งใจและเผื่อทางเลือกเมื่อเงื่อนไขเปลี่ยน`,
    counts: { supportive: supportiveCount, caution: cautionCount }
  }
}

export function shiftCalendarMonth(year, month, amount) {
  const shifted = new Date(Date.UTC(year, month - 1 + amount, 1))
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1 }
}
