import { calculateTenGod } from '@openfate/bazi-engine'
import { seasonalStrength } from './strength-engine.js'

export const TEN_GOD_STRENGTH_VERSION = 'ten-god-strength/experimental-0.1'
const stems = [...'甲乙丙丁戊己庚辛壬癸']
const elements = ['wood', 'wood', 'fire', 'fire', 'earth', 'earth', 'metal', 'metal', 'water', 'water']
const positionWeights = { year: 1, month: 1.3, day: 1.2, hour: 1 }
const positionNames = { year: 'ปี', month: 'เดือน', day: 'วัน', hour: 'ยาม' }
const names = { 比肩: 'เพื่อนร่วมพลัง', 劫财: 'การแข่งขันและแบ่งทรัพยากร', 食神: 'การสร้างสรรค์', 伤官: 'การแสดงออก', 正财: 'การจัดการทรัพย์', 偏财: 'โอกาสและทรัพยากร', 正官: 'ความรับผิดชอบ', 七杀: 'แรงผลักดัน', 正印: 'แรงสนับสนุน', 偏印: 'ความรู้เฉพาะทาง' }
const round = value => Math.round(value * 10000) / 10000
const elementOf = stem => elements[stems.indexOf(stem)]

/**
 * App-defined, auditable natal presence/season index, NOT classical measured qi.
 * Conceptual reference (no numerical weights prescribed by the source):
 * https://changxianyi.com/guji/ziping/wz-20260914/chapter-007/
 * index = (visible mass + hidden mass) * (1 + seasonalStrength / 10).
 * Each non-DM visible stem contributes 1 * position weight; each branch splits
 * ONE unit among its hidden stems (1; .7/.3; .6/.3/.1), main qi first.
 * Exact roots are the same hidden occurrences, NOT an extra additive bonus.
 * Same-element/opposite-polarity roots are context only: never duplicate their mass.
 * No automatic clash discounts, transformations, rescue, or use-god decisions.
 */
export function assessTenGodStrength(chart) {
  const dm = chart?.dayMaster?.char
  const monthBranch = chart?.pillars?.month?.branch
  if (!stems.includes(dm) || !seasonalStrength[monthBranch]) throw new Error('ข้อมูลดิถีหรือเดือนเกิดไม่ครบสำหรับกำลังสิบเทพ')
  const occurrences = []
  for (const [position, weight] of Object.entries(positionWeights)) {
    const pillar = chart.pillars[position]
    if (!pillar || !stems.includes(pillar.stem) || !Array.isArray(pillar.hiddenStems) || !pillar.hiddenStems.length || pillar.hiddenStems.length > 3) throw new Error('ต้องมีข้อมูลสี่เสาและก้านซ่อนครบก่อนคำนวณกำลังสิบเทพ')
    if (position !== 'day') occurrences.push({ id: `tg-${position}-visible`, position, kind: 'visible', stem: pillar.stem, mass: weight })
    const hidden = [...pillar.hiddenStems]
    if (hidden.some(item => !stems.includes(item.stem)) || new Set(hidden.map(item => item.stem)).size !== hidden.length || hidden.filter(item => item.isMain).length > 1) throw new Error('ข้อมูลก้านซ่อนไม่ถูกต้อง')
    // Honor the engine's explicit main marker; preserve secondary order.
    const mainIndex = hidden.findIndex(item => item.isMain)
    if (mainIndex > 0) hidden.unshift(...hidden.splice(mainIndex, 1))
    const shares = hidden.length === 1 ? [1] : hidden.length === 2 ? [0.7, 0.3] : [0.6, 0.3, 0.1]
    hidden.forEach((item, index) => occurrences.push({ id: `tg-${position}-hidden-${item.stem}`, position, kind: 'hidden', stem: item.stem, branch: pillar.branch,
      rank: index, share: shares[index], mass: round(weight * shares[index]) }))
  }
  const gods = stems.map((stem, index) => {
    const element = elements[index]
    const god = calculateTenGod(dm, stem)
    const visible = occurrences.filter(item => item.stem === stem && item.kind === 'visible')
    const roots = occurrences.filter(item => item.stem === stem && item.kind === 'hidden')
    const elementRoots = occurrences.filter(item => item.kind === 'hidden' && item.stem !== stem && elementOf(item.stem) === element)
    const visibleMass = round(visible.reduce((sum, item) => sum + item.mass, 0))
    const hiddenMass = round(roots.reduce((sum, item) => sum + item.mass, 0))
    const seasonValue = seasonalStrength[monthBranch][element]
    const seasonMultiplier = round(1 + seasonValue / 10)
    const rawMass = round(visibleMass + hiddenMass)
    const strengthIndex = round(rawMass * seasonMultiplier)
    const presence = !rawMass ? 'absent' : !visible.length ? 'hidden-only' : !roots.length ? 'visible-without-exact-root' : 'visible-with-exact-root'
    const presenceLabel = { absent: 'ไม่พบในพื้นดวง', 'hidden-only': 'พบในก้านซ่อน', 'visible-without-exact-root': 'ปรากฏบนฟ้า ไม่มีรากตรงก้าน', 'visible-with-exact-root': 'ปรากฏบนฟ้าและมีรากตรงก้าน' }[presence]
    const level = !rawMass ? 'absent' : strengthIndex < 1 ? 'low' : strengthIndex < 2.5 ? 'medium' : 'high'
    const levelLabel = { absent: 'ไม่พบ', low: 'น้ำหนักน้อย', medium: 'น้ำหนักปานกลาง', high: 'น้ำหนักมาก' }[level]
    const affectedPositions = new Set([...visible, ...roots].map(item => item.position))
    const interactions = (chart.interactions ?? []).filter(item => item.pillars?.some(position => affectedPositions.has(position)))
      .map(item => ({ type: item.type, pillars: [...item.pillars], branches: [...(item.branches ?? [])] }))
    const evidence = [...visible, ...roots].map(item => ({ ...item,
      text: `${item.kind === 'visible' ? 'ก้านฟ้า' : `ก้านซ่อน${['หลัก', 'รอง', 'ปลาย'][item.rank]}`} ${stem} ที่เสา${positionNames[item.position]} · น้ำหนัก ${item.mass}` }))
    evidence.push({ id: `tg-${stem}-season`, text: `ฤดูกาลกิ่งเดือน ${monthBranch}: ค่าฐาน ${seasonValue} → ตัวคูณ ${seasonMultiplier} ไม่สร้างกำลังให้สิบเทพที่ไม่ปรากฏ` })
    return { god, name: names[god], stem, element, presence, presenceLabel, level, levelLabel, visible, roots, elementRoots,
      visibleMass, hiddenMass, rawMass, strengthIndex, season: { monthBranch, value: seasonValue, multiplier: seasonMultiplier },
      interactions, evidence, certainty: interactions.length || ['辰', '戌', '丑', '未'].includes(monthBranch) ? 'needs-review' : 'baseline-only',
      summary: `${god} (${names[god]}): ${presenceLabel} · ${levelLabel}ตามสูตรทดลอง ${strengthIndex}` }
  })
  return { ruleVersion: TEN_GOD_STRENGTH_VERSION, gods,
    method: 'น้ำหนักกำลัง = (ก้านฟ้า + ก้านซ่อนตามตำแหน่ง) × ตัวคูณฤดูกาล รากตรงก้านนับอยู่ในก้านซ่อนแล้ว ไม่บวกซ้ำ',
    limits: ['น้ำหนัก สัดส่วนก้านซ่อน และจุดแบ่งระดับเป็นสูตรทดลองของแอป ไม่ใช่ค่ามาตรฐานจากตำรา',
      'ไม่นับก้านดิถีเป็น比肩เพิ่มอีกตัว แต่ยังนับก้านซ่อนในเสาวัน',
      'แยกรากตรงก้านกับรากธาตุเดียวกันต่างขั้ว ไม่รวมเป็นสิบเทพเดียวกัน',
      'ยังไม่ปรับกำลังจากการประสาน ชง แปรธาตุ หรือการส่งกำลังระหว่างธาตุ จึงยังไม่ยืนยันว่าทำหน้าที่ได้จริง',
      'กำลังมากไม่แปลว่าให้คุณ และกำลังน้อยไม่แปลว่าให้โทษ ไม่ใช่เปอร์เซ็นต์ความแม่นยำ'] }
}
