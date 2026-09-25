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
    overviewGood: 'งานและธุรกิจเหมาะกับการเดินหน้างานที่เตรียมข้อมูลไว้แล้ว',
    overviewCaution: 'งานและธุรกิจควรลดขอบเขตและเผื่อเวลาตัดสินใจ',
    goodDo: 'ใช้วันนี้กับงานสำคัญ การเสนอความคิด การขอคำตอบ หรือการตัดสินใจที่เตรียมข้อมูลไว้แล้ว',
    mixedDo: 'เลือกงานหลักเพียงหนึ่งเรื่อง ทำขอบเขตและผู้รับผิดชอบให้ชัดก่อนเริ่ม',
    cautionDo: 'ทบทวนข้อมูล ลดขอบเขตงาน และเผื่อเวลาให้การตัดสินใจมากกว่าปกติ'
  },
  money: {
    label: 'การเงิน', positions: ['month'], preferred: ['wealth', 'output'],
    goodTag: 'เหมาะจัดการเงิน', mixedTag: 'ตรวจตัวเลขก่อน', cautionTag: 'เงินรั่วง่าย',
    overviewGood: 'การเงินเหมาะกับการติดตามรายได้ ทบทวนราคา หรือจัดการรายการค้าง',
    overviewCaution: 'การเงินควรรักษาสภาพคล่องและตรวจเงื่อนไขให้รอบคอบ',
    goodDo: 'เหมาะกับการทบทวนราคา ต่อรองรายได้ ติดตามเงินค้าง หรือจัดการทรัพย์สินที่มีข้อมูลพร้อม',
    mixedDo: 'ทำรายการเงินเข้าออกและกำหนดเพดานก่อนตัดสินใจเรื่องค่าใช้จ่ายหรือการลงทุน',
    cautionDo: 'รักษาสภาพคล่อง ตรวจเงื่อนไขซ้ำ และชะลอข้อเสนอที่กดดันให้ตัดสินใจทันที'
  },
  love: {
    label: 'ความรัก', positions: ['day'], preferred: ['wealth', 'power', 'resource'],
    goodTag: 'คุยกันได้ดี', mixedTag: 'ฟังให้มากขึ้น', cautionTag: 'ระวังปะทะ',
    overviewGood: 'ความรักเหมาะกับการพูดคุยหรือแสดงความรู้สึก',
    overviewCaution: 'ความรักควรคุยทีละประเด็นและหลีกเลี่ยงการคุยตอนอารมณ์ร้อน',
    goodDo: 'ใช้เวลากับอีกฝ่าย พูดความต้องการอย่างตรงไปตรงมา และคุยเรื่องที่ต้องการความร่วมมือ',
    mixedDo: 'ถามความรู้สึกและความต้องการก่อนเสนอทางแก้ เพื่อไม่ให้อีกฝ่ายรู้สึกว่าถูกตัดสิน',
    cautionDo: 'คุยทีละประเด็น เลือกเวลาที่ทั้งสองฝ่ายไม่เร่งรีบ และหยุดพักเมื่อเริ่มใช้อารมณ์'
  },
  communication: {
    label: 'การเจรจา', positions: ['month', 'day'], preferred: ['output', 'wealth'],
    goodTag: 'เหมาะเจรจา', mixedTag: 'พูดให้กระชับ', cautionTag: 'ระวังคำพูด',
    overviewGood: 'การเจรจาเหมาะกับการนำเสนอ นัดหมาย หรือขอความร่วมมือ',
    overviewCaution: 'การเจรจาควรยึดข้อเท็จจริงและตรวจข้อความก่อนส่ง',
    goodDo: 'เหมาะกับการนำเสนอ นัดหมาย ต่อรอง และขอความร่วมมือ โดยเฉพาะเรื่องที่มีข้อมูลรองรับ',
    mixedDo: 'กำหนดประเด็นหลักและผลลัพธ์ที่ต้องการก่อนเริ่มคุย เพื่อไม่ให้บทสนทนากระจาย',
    cautionDo: 'สื่อสารด้วยข้อเท็จจริง ใช้คำถามแทนการสรุปแทนอีกฝ่าย และตรวจข้อความก่อนส่ง'
  },
  wellbeing: {
    label: 'การพักและดูแลตัวเอง', positions: ['year', 'month', 'day', 'hour'], preferred: ['resource', 'peer'],
    goodTag: 'ฟื้นกำลังได้ดี', mixedTag: 'รักษาจังหวะ', cautionTag: 'ควรพักเพิ่ม',
    overviewGood: 'การพักและดูแลตัวเองเหมาะกับการจัดเวลาพักและฟื้นกำลังให้เป็นกิจวัตร',
    overviewCaution: 'การพักและดูแลตัวเองควรลดความหักโหมและเว้นเวลาฟื้นตัว',
    goodDo: 'จัดเวลานอน อาหาร การเคลื่อนไหว และช่วงพักให้เป็นกิจวัตร พร้อมลดเรื่องที่ไม่จำเป็นออกจากตาราง',
    mixedDo: 'สลับงานใช้สมาธิกับช่วงพักสั้น ๆ และกำหนดเวลาหยุดรับข้อมูลให้ชัด',
    cautionDo: 'ลดภาระที่เลื่อนได้ ขอความช่วยเหลือ และเว้นช่วงฟื้นตัวก่อนรับเรื่องใหม่'
  }
}

const relationGuidance = {
  work: {
    peer: 'ชวนคนที่เกี่ยวข้องคุยตั้งแต่ต้นและแบ่งความรับผิดชอบให้ชัด',
    resource: 'ใช้ข้อมูลเดิมหรือขอคำแนะนำจากคนที่ไว้ใจก่อนลงมือ',
    output: 'ทำร่างข้อเสนอหรือตัวอย่างให้เห็นภาพก่อนขอความคิดเห็น',
    wealth: 'กำหนดผลลัพธ์ งบประมาณ และขอบเขตที่รับได้ให้ชัด',
    power: 'ตรวจเงื่อนไขและผู้มีอำนาจตัดสินใจก่อนรับปาก',
    neutral: 'เลือกงานสำคัญที่สุดหนึ่งเรื่องและตัดสินใจจากข้อมูลที่มี'
  },
  money: {
    peer: 'หากมีเงินร่วมกับผู้อื่น ควรตกลงวงเงินและหน้าที่ของแต่ละคนให้ชัด',
    resource: 'ย้อนดูรายรับรายจ่ายเดิมหรือขอความเห็นจากคนที่ไว้ใจก่อนตัดสินใจ',
    output: 'เขียนตัวเลขและทางเลือกออกมาเปรียบเทียบก่อนใช้เงิน',
    wealth: 'กำหนดงบและเพดานความเสียหายที่ยอมรับได้ล่วงหน้า',
    power: 'อ่านสัญญา ค่าธรรมเนียม และเงื่อนไขผูกพันให้ครบก่อนตกลง',
    neutral: 'เลือกจัดการเรื่องเงินที่สำคัญที่สุดหนึ่งเรื่องก่อน'
  },
  love: {
    peer: 'เปิดโอกาสให้ทั้งสองฝ่ายเสนอความต้องการและตัดสินใจร่วมกัน',
    resource: 'ฟังอีกฝ่ายให้จบและให้เวลาความสัมพันธ์มากกว่าการรีบหาคำตอบ',
    output: 'พูดความรู้สึกหรือแสดงความใส่ใจให้ชัด แทนการคาดหวังให้อีกฝ่ายเดา',
    wealth: 'คุยความคาดหวังเรื่องเวลา เงิน และความรับผิดชอบให้ตรงกัน',
    power: 'รักษาขอบเขตของทั้งสองฝ่ายและหลีกเลี่ยงการกดดันให้ตอบทันที',
    neutral: 'เลือกคุยเรื่องสำคัญเพียงเรื่องเดียวและฟังคำตอบตามจริง'
  },
  communication: {
    peer: 'ให้ทุกฝ่ายได้พูดและสรุปสิ่งที่ตกลงร่วมกันก่อนจบการคุย',
    resource: 'เตรียมข้อมูลและตัวอย่างที่ตรวจสอบได้ไว้รองรับประเด็นสำคัญ',
    output: 'เริ่มจากใจความหลัก แล้วใช้ตัวอย่างสั้น ๆ ช่วยให้เข้าใจตรงกัน',
    wealth: 'บอกผลลัพธ์ที่ต้องการและสิ่งที่ยืดหยุ่นได้ให้ชัด',
    power: 'ตรวจว่าใครเป็นผู้ตัดสินใจและมีเงื่อนไขใดที่ต้องทำตาม',
    neutral: 'กำหนดเป้าหมายของการคุยหนึ่งเรื่องและไม่ออกนอกประเด็น'
  },
  wellbeing: {
    peer: 'แบ่งเบาภาระกับคนรอบตัวและขอความช่วยเหลือในเรื่องที่ไม่จำเป็นต้องทำคนเดียว',
    resource: 'กลับไปใช้กิจวัตรที่ช่วยให้พักได้จริงและจัดเวลานอนให้เพียงพอ',
    output: 'เปลี่ยนความตั้งใจดูแลตัวเองให้เป็นช่วงเวลาที่ระบุไว้ในตาราง',
    wealth: 'กันเวลาและพลังงานไว้ให้ตัวเองก่อนรับภาระเพิ่มเติม',
    power: 'ลดสิ่งที่เลื่อนได้และไม่รับปากเพิ่มเมื่อเวลาพักไม่พอ',
    neutral: 'เลือกทำสิ่งที่ช่วยฟื้นกำลังได้จริงหนึ่งอย่างในวันนี้'
  }
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
  const dailyAdvice = `${baseAdvice} ${relationGuidance[focus][relation]}`
  const context = hasClash
    ? `วันนี้เรื่อง${profile.label}อาจมีบางอย่างไม่เป็นไปตามแผน ควรเผื่อเวลาและจัดการทีละประเด็น`
    : hasCombine
      ? `วันนี้เรื่อง${profile.label}มีแนวโน้มได้รับความร่วมมือหรือหาทางออกได้ง่ายขึ้น หากคุณเริ่มต้นด้วยเป้าหมายที่ชัดเจน`
      : isPositive
        ? `วันนี้เรื่อง${profile.label}มีแนวโน้มราบรื่นกว่าปกติ เหมาะกับการลงมือในสิ่งที่เตรียมไว้แล้ว`
        : `วันนี้เรื่อง${profile.label}ทำได้ตามแผน แต่ควรเตรียมข้อมูลและเผื่อเวลามากกว่าปกติ`

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
  const leadingPositive = [...positive].sort((a, b) => b.score - a.score)[0]
  const leadingCaution = [...caution].sort((a, b) => a.score - b.score)[0]
  const positiveDescription = leadingPositive ? focusProfiles[leadingPositive.focus].overviewGood : ''
  const cautionDescription = leadingCaution ? focusProfiles[leadingCaution.focus].overviewCaution : ''
  const tag = level === 'caution' ? 'ลดความเร่ง' : positive.length >= 3 ? 'หลายเรื่องเดินหน้า' : 'เลือกเรื่องสำคัญ'
  const summary = positive.length && caution.length
    ? `วันนี้${positiveDescription} ส่วน${cautionDescription}`
    : positive.length
      ? `วันนี้${positiveDescription} และหัวข้ออื่นอยู่ในจังหวะที่ทำตามแผนได้เมื่อเตรียมตัวให้พร้อม`
      : caution.length
        ? `วันนี้${cautionDescription} ส่วนหัวข้ออื่นควรรักษาแผนเดิมและไม่เพิ่มภาระโดยไม่จำเป็น`
        : 'วันนี้ภาพรวมอยู่ในระดับกลาง เหมาะกับการทำเรื่องที่เตรียมไว้แล้วมากกว่าการเพิ่มภาระหรือเปลี่ยนแผนกะทันหัน'
  const dailyAdvice = positive.length && caution.length
    ? `เรื่อง${leadingPositive.focusLabel}: ${focusProfiles[leadingPositive.focus].goodDo} ส่วนเรื่อง${leadingCaution.focusLabel}: ${focusProfiles[leadingCaution.focus].cautionDo}`
    : positive.length
      ? `เรื่อง${leadingPositive.focusLabel}: ${focusProfiles[leadingPositive.focus].goodDo} ส่วนหัวข้ออื่นให้ทำตามแผนเดิมและไม่ต้องเร่งเพิ่ม`
      : caution.length
        ? `เรื่อง${leadingCaution.focusLabel}: ${focusProfiles[leadingCaution.focus].cautionDo} ส่วนหัวข้ออื่นให้ลดงานที่ไม่จำเป็นและเผื่อเวลาไว้`
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
