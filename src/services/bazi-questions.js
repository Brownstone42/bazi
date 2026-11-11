import { calculateTenGod, detectInteractions } from '@openfate/bazi-engine'
import { calculateChart } from './bazi.js'
import { assessDayMasterStrength } from './strength-engine.js'
import { buildLuckPillarTimeline } from './luck-pillars.js'

export const questionTopics = [
  { id: 'presentation', label: 'นำเสนองาน / สัมภาษณ์', gods: ['食神', '伤官', '正官'], action: 'เตรียมตัวอย่างผลงานและซ้อมตอบคำถาม โดยแยกข้อเท็จจริงออกจากข้อเสนอ', caution: 'ตรวจน้ำเสียงและกติกาการนำเสนอ ไม่ใช้ความมั่นใจแทนหลักฐาน' },
  { id: 'negotiation', label: 'เจรจา / คุยข้อตกลง', gods: ['正财', '偏财', '食神'], action: 'กำหนดเป้าหมาย เงื่อนไขที่ยืดหยุ่นได้ และขอบเขตที่ยอมรับไม่ได้ก่อนคุย', caution: 'ยืนยันข้อตกลงเป็นลายลักษณ์อักษร อย่าอนุมานว่าอีกฝ่ายเข้าใจตรงกัน' },
  { id: 'deadline', label: 'งานเร่งด่วน / ความรับผิดชอบ', gods: ['正官', '七杀', '正印'], action: 'แยกงานจำเป็นกับงานที่เลื่อนได้ และยืนยันผู้ตัดสินใจก่อนลงมือ', caution: 'ตรวจข้อจำกัดและเวลาจริง ไม่รับภาระเพิ่มจากคำอ่านเพียงอย่างเดียว' },
  { id: 'learning', label: 'เรียนรู้ / วางแผน', gods: ['正印', '偏印', '食神'], action: 'เลือกเรื่องที่จะศึกษาให้ชัด และแปลงข้อมูลที่ได้เป็นงานทดลองเล็ก ๆ', caution: 'แยกข้อมูลที่ตรวจสอบได้ออกจากสมมติฐาน ไม่สะสมข้อมูลจนไม่ได้ลงมือ' },
  { id: 'team', label: 'ทีมงาน / คนรอบตัว', gods: ['比肩', '劫财', '正印'], action: 'ตกลงบทบาท เครดิต และทรัพยากรที่ใช้ร่วมกันให้ชัด', caution: 'ถามความต้องการของอีกฝ่ายโดยตรง พื้นดวงไม่สามารถบอกความคิดคนอื่นได้' },
]
const godNames = { 比肩: 'เพื่อนร่วมพลัง', 劫财: 'การแข่งขันและแบ่งทรัพยากร', 食神: 'การสร้างสรรค์ผลงาน', 伤官: 'การแสดงออกนอกกรอบ', 正财: 'รายได้และการจัดการทรัพย์', 偏财: 'โอกาสและทรัพย์หมุนเวียน', 正官: 'กฎเกณฑ์และความรับผิดชอบ', 七杀: 'แรงกดดันและการตัดสินใจ', 正印: 'ความรู้และแรงสนับสนุน', 偏印: 'การเรียนรู้จากมุมเฉพาะ' }
const godActions = { 比肩: 'กำหนดเรื่องที่ตัดสินใจเองและเรื่องที่ต้องร่วมตัดสินใจ', 劫财: 'ตรวจส่วนแบ่งและเจ้าของทรัพยากรที่ใช้ร่วมกัน', 食神: 'ใช้ตัวอย่างผลงานที่จับต้องได้ประกอบคำอธิบาย', 伤官: 'เตรียมเหตุผลรองรับข้อเสนอที่ต่างจากวิธีเดิมและตรวจน้ำเสียง', 正财: 'ตรวจยอด กำหนดส่ง และรายการที่ต้องรับผิดชอบ', 偏财: 'กำหนดขอบเขตการทดลองและตรวจความคุ้มค่าจากข้อมูลจริง', 正官: 'ตรวจลำดับอนุมัติ กติกา และผู้มีอำนาจตัดสินใจ', 七杀: 'จัดลำดับงานเร่งด่วนและเตรียมทางเลือกสำรอง', 正印: 'ตรวจข้อมูลอ้างอิงและขอคำแนะนำจากผู้ที่เกี่ยวข้อง', 偏印: 'ทดสอบสมมติฐานเฉพาะเรื่องก่อนนำไปใช้ทั้งระบบ' }
const positionNames = { year: 'ปีเกิด', month: 'เดือนเกิด', day: 'วันเกิด', hour: 'เวลาเกิด' }
const interactionNames = { CLASH: 'ชง / เคลื่อนไหว', COMBINATION_2: 'ประสาน', TRINE: 'รวมสามกิ่ง', DIRECTIONAL: 'รวมทิศ', PUNISHMENT: 'ลงโทษ', DESTRUCTION: 'แตก / ไม่ต่อเนื่อง', HARM: 'ทำร้าย / แรงเสียดทาน' }
const stemPairs = ['甲己', '乙庚', '丙辛', '丁壬', '戊癸']
export const QUESTION_RULE_VERSION = 'bazi-questions/prototype-0.1'

function parseDate(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('กรุณาเลือกวันที่ให้ถูกต้อง')
  const timestamp = Date.parse(`${date}T12:00:00+07:00`)
  if (!Number.isFinite(timestamp) || new Date(timestamp + 7 * 3600000).toISOString().slice(0, 10) !== date) throw new Error('วันที่ไม่ถูกต้อง')
  const year = Number(date.slice(0, 4))
  if (year < 1900 || year > 2200) throw new Error('รองรับปี ค.ศ. 1900–2200')
  return new Date(timestamp)
}

export function buildQuestionReading({ input, date, topic = 'presentation', chart: suppliedChart, assessment: suppliedAssessment }) {
  const target = parseDate(date)
  const selected = questionTopics.find(item => item.id === topic)
  if (!selected) throw new Error('ไม่พบหัวข้อคำถาม')
  if (!input?.birthTime || !['male', 'female'].includes(input.gender)) throw new Error('กรุณาระบุเวลาเกิดและเพศก่อนใช้ถามปาจื้อ')
  const chart = suppliedChart ?? calculateChart(input)
  const assessment = suppliedAssessment ?? assessDayMasterStrength(chart)
  // Bangkok noon represents a civil day, not an auspicious hour; never reuse birth timezone for the event.
  const transit = calculateChart({ birthDate: date, birthTime: '12:00', gender: input.gender, timezoneId: 'Asia/Bangkok' })
  const cycle = buildLuckPillarTimeline(chart, input.gender, input.timezoneId, target).cycles.find(item => item.isCurrent)
  const layers = [['year', 'ปีจร', transit.pillars.year], ['month', 'เดือนจร', transit.pillars.month], ['day', 'วันจร', transit.pillars.day]]
  if (cycle) layers.unshift(['luck', 'วัยจร 10 ปี', cycle])
  const evidence = []
  const contexts = layers.map(([key, label, pillar]) => {
    const god = calculateTenGod(chart.dayMaster.char, pillar.stem)
    const hidden = (pillar.hiddenStems ?? []).map(item => ({ stem: item.stem, god: calculateTenGod(chart.dayMaster.char, item.stem), main: item.isMain }))
    const roots = Object.entries(chart.pillars).filter(([, natal]) => natal.hiddenStems.some(item => item.element === pillar.element)).map(([position]) => positionNames[position])
    evidence.push({ id: `${key}-god`, layer: label, kind: 'ten-god', text: `${pillar.stem}${pillar.branch} · ${god} (${godNames[god]}) เทียบกับดิถี ${chart.dayMaster.char}`, relevant: selected.gods.includes(god) })
    hidden.forEach(item => evidence.push({ id: `${key}-hidden-${item.stem}`, layer: label, kind: 'hidden', text: `ก้านซ่อน ${item.stem} · ${item.god} (${godNames[item.god]})${item.main ? ' · ก้านหลัก' : ''}`, relevant: selected.gods.includes(item.god) }))
    evidence.push({ id: `${key}-roots`, layer: label, kind: 'roots', text: roots.length ? `ธาตุก้านฟ้าจรพบรากธาตุเดียวกันในเสา${roots.join(' / ')} ไม่ใช่ข้อยืนยันว่าแรงนั้นดีหรือแปรธาตุแล้ว` : 'ไม่พบรากธาตุเดียวกันในก้านซ่อนพื้นดวง ไม่ได้แปลว่าไม่มีผล', relevant: false })
    for (const [position, natal] of Object.entries(chart.pillars)) {
      const pair = detectInteractions({ year: '', month: '', day: '', hour: '', [position]: natal.branch }, pillar.branch)
      pair.filter(item => item.pillars.includes('annual')).forEach(item => evidence.push({ id: `${key}-${position}-${item.type}`, layerKey: key, position, interactionType: item.type, layer: label, kind: 'interaction', text: `${interactionNames[item.type] ?? item.type}: ${item.branches.join('–')} กับเสา${positionNames[position]}${item.resultElement ? ' · ยังไม่ยืนยันการแปรธาตุ' : ''}`, relevant: false }))
      if (stemPairs.some(pair => pair.includes(pillar.stem) && pair.includes(natal.stem) && pillar.stem !== natal.stem)) evidence.push({ id: `${key}-${position}-stem`, layer: label, kind: 'interaction', text: `ก้านฟ้า ${pillar.stem} ประสาน ${natal.stem} ที่เสา${positionNames[position]} · ยังไม่ยืนยันการแปรธาตุ`, relevant: false })
      if (pillar.branch === natal.branch) evidence.push({ id: `${key}-${position}-repeat`, layer: label, kind: 'interaction', text: `กิ่ง ${pillar.branch} ซ้ำกับเสา${positionNames[position]} · เป็นการย้ำองค์ประกอบ ไม่เท่ากับผลดีหรือร้าย`, relevant: false })
    }
    return { key, label, ganZhi: `${pillar.stem}${pillar.branch}`, stem: pillar.stem, branch: pillar.branch, god, godName: godNames[god], hidden, roots }
  })
  const day = contexts.find(item => item.key === 'day')
  const related = evidence.filter(item => item.relevant)
  const interactions = evidence.filter(item => item.kind === 'interaction')
  return { date, topic, topicLabel: selected.label, ruleVersion: QUESTION_RULE_VERSION, contexts, evidence,
    headline: `${selected.label}: วันนี้เน้น${day.godName}`,
    summary: `${day.god} (${day.godName}) เป็นบทบาทของก้านวันจร ส่วนปีจรและเดือนจรมีบทบาทต่างกันตามรายละเอียดด้านล่าง ${related.length ? 'พบองค์ประกอบที่เชื่อมกับหัวข้อที่เลือก' : 'ก้านและก้านซ่อนจรไม่ได้ตรงกับกลุ่มหัวข้อที่เลือกโดยตรง ไม่ได้หมายถึงวันไม่ดี'}`,
    action: `${selected.action} · ตามบทบาทวันจร: ${godActions[day.god]}`, caution: `${selected.caution}${interactions.some(item => item.id.startsWith('day-')) ? ' · พบปฏิสัมพันธ์วันจรกับพื้นดวง ควรดูเสาที่เกี่ยวข้องและเผื่อการปรับแผน ไม่ถือเป็นคำทำนายว่าจะเกิดปัญหาแน่นอน' : ''}`,
    natal: { dayMaster: chart.dayMaster.char, strength: assessment.strengthLevel, season: chart.pillars.month.branch, rootScore: assessment.diagnostics.rootScore, clarity: assessment.structureClarity },
    // Editorial relevance count ONLY: not classical auspiciousness, accuracy, or success probability.
    relevanceCount: related.length,
    interactionCount: interactions.length,
    limits: ['เกณฑ์จับคู่หัวข้อเป็นต้นแบบของแอป ยังไม่ผ่านการตรวจโดยผู้เชี่ยวชาญ', 'ยังไม่ตัดสิน格局 / 用神แบบเต็มระบบ ไม่ยืนยันการแปรธาตุ และยังไม่อ่านปฏิสัมพันธ์ระหว่างดวงจรทุกชั้น', 'ใช้วันที่และเขตเวลาประเทศไทย ไม่ได้เลือกฤกษ์ชั่วโมงหรือใช้เกณฑ์择日', 'เป็นการตีความตามความเชื่อ ไม่รับประกันเหตุการณ์หรือใช้แทนข้อมูลจริง'] }
}

export function findQuestionDates({ input, start, end, topic }) {
  const first = parseDate(start)
  const last = parseDate(end)
  const count = Math.round((last - first) / 86400000) + 1
  if (count < 1 || count > 31) throw new Error('เลือกช่วงวันที่เรียงจากต้นไปปลาย ไม่เกิน 31 วัน')
  const chart = calculateChart(input)
  const assessment = assessDayMasterStrength(chart)
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(first.getTime() + index * 86400000 + 7 * 3600000).toISOString().slice(0, 10)
    return buildQuestionReading({ input, date, topic, chart, assessment })
  }).sort((a, b) => b.relevanceCount - a.relevanceCount || a.date.localeCompare(b.date)).slice(0, 3)
}
