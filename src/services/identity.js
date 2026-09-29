import { calculateTenGod } from '@openfate/bazi-engine'
import { lifeRoleProfiles } from './interpretation'
import { getDayMasterStrengthReading } from './day-master-strength-matrix'

const definitions = [
  ['比肩', 'self', 'ตัดสินใจและลงมือด้วยตัวเอง', 'คุณอยากรับผิดชอบงานที่ตัดสินใจเองได้ และเห็นชัดว่าสิ่งที่ทำสำเร็จมาจากฝีมือของคุณ', 'เมื่อคนอื่นเข้ามากำหนดวิธีทำทุกขั้น คุณอาจใช้แรงไปกับการปกป้องวิธีของตัวเองมากกว่าตัวงาน'],
  ['劫财', 'self', 'ชวนคนให้เดินไปด้วยกัน', 'คุณเห็นว่าใครช่วยให้งานเดินหน้าได้ และมีแรงฮึดเมื่อได้ทำงานกับคนที่มีเป้าหมายร่วมกัน', 'เมื่ออยากรักษาทีมไว้ คุณอาจยอมรับหน้าที่หรือส่วนแบ่งที่ไม่ตรงกับสิ่งที่ลงแรงจริง'],
  ['食神', 'output', 'สร้างผลงานและถ่ายทอด', 'คุณชอบทำเรื่องที่เข้าใจให้กลายเป็นสิ่งที่คนอื่นใช้ได้จริง เช่น ตัวอย่าง คู่มือ หรือผลงานที่ค่อย ๆ พัฒนาให้ดีขึ้น', 'เมื่อยังไม่พอใจกับคุณภาพ คุณอาจปรับงานเดิมต่อจนไม่มีจังหวะส่งให้คนอื่นลองใช้'],
  ['伤官', 'output', 'มองเห็นจุดที่ควรเปลี่ยน', 'เมื่อเจอขั้นตอนที่ไม่สมเหตุสมผล คุณมักตั้งคำถามและนึกถึงวิธีที่น่าจะทำได้ดีกว่า', 'การรีบชี้ข้อบกพร่องต่อหน้าคนอื่นอาจทำให้เขาปกป้องตัวเอง ทั้งที่ข้อเสนอของคุณมีประโยชน์'],
  ['正财', 'wealth', 'จัดระบบให้ได้ผลลัพธ์', 'คุณมักดูว่าเหลือเวลา เงิน และคนเท่าไร แล้วจัดลำดับว่าจะทำอย่างไรให้งานเสร็จตามที่ตกลง', 'เมื่อแผนเปลี่ยนบ่อย คุณอาจเผลอควบคุมรายละเอียดทุกอย่างจนไม่มีเวลาให้เรื่องสำคัญ'],
  ['偏财', 'wealth', 'จับโอกาสและต่อยอด', 'คุณสนใจว่าไอเดีย คน หรือทรัพยากรที่มีจะนำมาต่อยอดเป็นงานหรือรายได้รูปแบบใหม่ได้อย่างไร', 'โอกาสใหม่อาจน่าสนใจกว่างานที่กำลังทำ จนคุณกระจายเวลาและเงินไปหลายทางเกินไป'],
  ['正官', 'power', 'รับผิดชอบและสร้างความไว้วางใจ', 'คุณให้ความสำคัญกับสิ่งที่รับปาก และมักอยากให้คนในทีมรู้ว่าใครรับผิดชอบอะไรและใช้มาตรฐานเดียวกัน', 'เมื่อกลัวทำให้คนอื่นผิดหวัง คุณอาจรับหน้าที่เพิ่มทั้งที่งานเดิมยังเต็มมือ'],
  ['七杀', 'power', 'ตัดสินใจเมื่อสถานการณ์เร่งด่วน', 'เมื่อมีเรื่องต้องตัดสินใจ คุณมีแนวโน้มมองหาสิ่งที่ต้องจัดการก่อน แล้วผลักให้เกิดการลงมือ', 'ความเร่งของคุณอาจทำให้คนร่วมงานตามไม่ทัน โดยเฉพาะเมื่อยังไม่ได้อธิบายเหตุผลที่ต้องเปลี่ยนแผน'],
  ['正印', 'resource', 'เข้าใจให้ลึกแล้วอธิบายให้ชัด', 'เมื่อเจอเรื่องใหม่ คุณอยากรู้เหตุผลและหลักการก่อน พอเข้าใจแล้วจึงจัดเรื่องซับซ้อนให้คนอื่นตามทันได้', 'คุณอาจค้นข้อมูลต่อเพราะยังไม่มั่นใจ ทั้งที่ข้อมูลที่มีเพียงพอจะเริ่มทดลองเล็ก ๆ แล้ว'],
  ['偏印', 'resource', 'เชื่อมโยงและคิดทางเลือกใหม่', 'คุณสนใจมุมที่คนอื่นอาจมองข้าม และชอบนำความรู้จากคนละเรื่องมาเชื่อมเป็นคำตอบใหม่', 'คำตอบที่คุณคิดได้อาจข้ามหลายขั้น จนคนฟังยังไม่เข้าใจว่าทำไมจึงได้ข้อสรุปนั้น']
]
const groups = {
  self: 'ความเป็นตัวเองและการร่วมมือ', output: 'การสร้างสรรค์และสื่อสาร',
  wealth: 'การจัดการและต่อยอด', power: 'ความรับผิดชอบและการตัดสินใจ',
  resource: 'การเรียนรู้และทำความเข้าใจ'
}
const elements = { wood: ['ไม้', '#69947b'], fire: ['ไฟ', '#bd7168'], earth: ['ดิน', '#c3a16a'], metal: ['ทอง', '#929ead'], water: ['น้ำ', '#649aaa'] }
function percentages(values) {
  const total = values.reduce((sum, value) => sum + value, 0)
  if (!total) return values.map(() => 0)
  const raw = values.map(value => value / total * 100)
  const result = raw.map(Math.floor)
  const order = raw.map((value, i) => ({ i, fraction: value - result[i] })).sort((a, b) => b.fraction - a.fraction)
  const missing = 100 - result.reduce((sum, value) => sum + value, 0)
  for (let i = 0; i < missing; i++) result[order[i].i]++
  return result
}
export function buildIdentity(chart, assessment) {
  const scores = Object.fromEntries(definitions.map(([god]) => [god, 0]))
  const presence = Object.fromEntries(Object.keys(elements).map(key => [key, 0]))
  for (const [position, pillar] of Object.entries(chart.pillars)) {
    if (!pillar) continue
    presence[pillar.element] += 2
    // The day stem is the reference point, not an additional Friend talent.
    if (position !== 'day') scores[calculateTenGod(chart.dayMaster.char, pillar.stem)] += 2
    pillar.hiddenStems.forEach((hidden, index) => {
      const weight = index === 0 ? 1 : index === 1 ? 0.6 : 0.35
      presence[hidden.element] += weight
      scores[calculateTenGod(chart.dayMaster.char, hidden.stem)] += weight
    })
  }
  const shares = percentages(definitions.map(([god]) => scores[god]))
  const talents = definitions.map(([god, group, title, description, risk], index) => ({
    god, group, title, description, risk, weight: scores[god], share: shares[index], ...{ profile: lifeRoleProfiles[god] }
  })).sort((a, b) => b.weight - a.weight)
  const groupValues = Object.keys(groups).map(key => talents.filter(item => item.group === key).reduce((sum, item) => sum + item.weight, 0))
  const groupShares = percentages(groupValues)
  const elementShares = percentages(Object.values(presence))
  const base = getDayMasterStrengthReading(chart.dayMaster.char, assessment.strengthLevel)
  const top = talents.filter(item => item.weight > 0).slice(0, 3)
  return {
    top, talents, title: top[0].title, introduction: top[0].description,
    nuance: base.identity, pressure: base.risk, pressureAction: top[0].profile.do,
    work: top[0].profile.work, relationship: top[0].profile.home,
    workContext: base.work, relationshipContext: base.relationship,
    careers: [...new Set(top.slice(0, 2).flatMap(item => item.profile.roles))].slice(0, 5),
    environment: top[0].profile.environment,
    groups: Object.entries(groups).map(([key, label], i) => ({ key, label, share: groupShares[i] })).sort((a,b) => b.share-a.share),
    elements: Object.entries(elements).map(([key, [label, color]], i) => ({ key, label, color, share: elementShares[i] }))
  }
}
