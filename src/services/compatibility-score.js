import { assessDayMasterStrength } from './strength-engine.js'

const elements = ['wood', 'fire', 'earth', 'metal', 'water']
const pairs = values => new Set(values.flatMap(([a, b]) => [a + b, b + a]))
const harmonies = pairs([['子', '丑'], ['寅', '亥'], ['卯', '戌'], ['辰', '酉'], ['巳', '申'], ['午', '未']])
const clashes = pairs([['子', '午'], ['丑', '未'], ['寅', '申'], ['卯', '酉'], ['辰', '戌'], ['巳', '亥']])
const positions = {
  love: { day: 5, month: 2, year: 1, hour: 2 },
  family: { day: 4, month: 3, year: 2, hour: 3 },
  work: { day: 2, month: 5, year: 2, hour: 3 },
  friendship: { day: 3, month: 2, year: 5, hour: 1 },
  overview: { day: 3, month: 3, year: 3, hour: 3 }
}
const areas = { day: 'ชีวิตส่วนตัวและความใกล้ชิด', month: 'หน้าที่และความคาดหวัง', year: 'การเข้าสังคมและคนรอบตัว', hour: 'แผนระยะยาว' }

// Product rubric v1, not a classical or empirically validated probability.
// Exclude the day stem from supply: it has its own 20% component.
function presence(chart) {
  const result = Object.fromEntries(elements.map(element => [element, 0]))
  for (const [position, pillar] of Object.entries(chart.pillars)) {
    if (!pillar) continue
    if (position !== 'day') result[pillar.element] += 2
    pillar.hiddenStems.forEach((stem, index) => { result[stem.element] += [1, 0.6, 0.35][index] ?? 0.35 })
  }
  return result
}

function suitability(element, assessment) {
  if (element === assessment.primaryUsefulElement) return 90
  if (element === assessment.supportiveElement || assessment.supportiveElements?.includes(element)) return 75
  if (assessment.cautionElements.includes(element)) return 25
  return 50
}

function branchComponent(first, second, focus) {
  let sum = 0
  let total = 0
  const evidence = []
  for (const [position, weight] of Object.entries(positions[focus] ?? positions.overview)) {
    const a = first.pillars[position]
    const b = second.pillars[position]
    if (!a || !b) continue
    const key = a.branch + b.branch
    const value = harmonies.has(key) ? 80 : clashes.has(key) ? 25 : 50
    sum += value * weight
    total += weight
    if (value !== 50) evidence.push(`${areas[position]}: ${value > 50 ? 'มีจุดที่ช่วยให้เข้าหากันได้' : 'มีความต่างที่ควรคุยให้ชัด'}`)
  }
  return { value: sum / total, explanation: evidence.join(' · ') || 'ยังไม่พบคู่ที่ส่งเสริมหรือขัดแย้งกันโดยตรงในตำแหน่งที่ตรวจ จึงใช้ค่ากลาง ไม่ได้หมายความว่าไม่มีปัญหา' }
}

function direction(source, receiver, branch) {
  const assessment = assessDayMasterStrength(receiver)
  if (!assessment.primaryUsefulElement) return { value: null, components: [], explanation: 'ดวงนี้มีเงื่อนไขพิเศษที่เกณฑ์รุ่นทดลองยังประเมินการส่งเสริมไม่ได้ จึงยังไม่สรุปเป็นคะแนน' }
  const supply = presence(source)
  const total = Object.values(supply).reduce((a, b) => a + b, 0)
  const support = elements.reduce((sum, element) => sum + supply[element] * suitability(element, assessment), 0) / total
  const core = suitability(source.dayMaster.element, assessment)
  const components = [
    { label: 'การส่งเสริมกัน', weight: 40, value: support, explanation: support >= 60 ? 'ส่วนประกอบของดวงฝ่ายนี้มีแนวโน้มช่วยเสริมสมดุลให้อีกฝ่าย' : support < 45 ? 'ส่วนประกอบของดวงฝ่ายนี้อาจเพิ่มสิ่งที่อีกฝ่ายมีมากอยู่แล้ว จึงควรให้พื้นที่กัน' : 'มีทั้งส่วนที่ช่วยส่งเสริมและส่วนที่ต้องปรับเข้าหากัน' },
    { label: 'จุดที่เข้ากันและต้องปรับ', weight: 40, value: branch.value, explanation: branch.explanation },
    { label: 'ผลจากธาตุประจำตัว', weight: 20, value: core, explanation: core >= 75 ? 'ธาตุประจำตัวฝ่ายนี้อยู่ในกลุ่มที่ระบบประเมินว่าช่วยเสริมสมดุลให้อีกฝ่าย' : core < 50 ? 'ธาตุประจำตัวฝ่ายนี้อยู่ในกลุ่มที่อีกฝ่ายควรระวังเมื่อมีมากเกินไป ไม่ได้หมายถึงเข้ากันไม่ได้' : 'ธาตุประจำตัวฝ่ายนี้ไม่ได้เป็นตัวส่งเสริมหรือข้อควรระวังหลักของอีกฝ่าย' }
  ]
  return {
    value: Math.round(components.reduce((sum, item) => sum + item.value * item.weight / 100, 0)),
    components: components.map(item => ({ ...item, value: Math.round(item.value) })),
    explanation: components[0].explanation,
    borderline: assessment.structureClarity === 'borderline'
  }
}

export function calculateCompatibilityScore(first, second, options = {}) {
  const hasBirthTime = options.hasBirthTime !== false
  const other = hasBirthTime ? second : {
    ...second,
    pillars: { ...second.pillars, hour: null },
    interactions: second.interactions.filter(item => !item.pillars?.includes('hour'))
  }
  const branch = branchComponent(first, other, options.focus)
  const forward = direction(first, other, branch)
  const reverse = direction(other, first, branch)
  const value = forward.value === null || reverse.value === null ? null : Math.round((forward.value + reverse.value) / 2)
  return {
    version: 'compatibility/0.2.0', value, forward, reverse,
    label: value === null ? 'ยังไม่สรุปคะแนน' : value >= 70 ? 'มีส่วนที่ส่งเสริมกันเด่น' : value >= 55 ? 'ส่งเสริมกันได้ โดยมีจุดที่ต้องปรับ' : value >= 40 ? 'มีทั้งส่วนที่เข้ากันและต้องปรับ' : 'ควรให้ความสำคัญกับการปรับเข้าหากัน',
    note: !hasBirthTime ? 'คะแนนเบื้องต้นจากข้อมูลที่ทราบ ไม่ใช้เวลาเที่ยงสมมติและไม่หักคะแนนเพราะไม่ทราบเวลาเกิด หากเกิดหลัง 23:00 ตำแหน่งวันอาจเปลี่ยนและส่งผลต่อคะแนนด้วย' : forward.borderline || reverse.borderline ? 'การประเมินสมดุลของดวงอยู่ใกล้รอยต่อ คะแนนนี้จึงควรอ่านร่วมกับคำอธิบาย' : null
  }
}
