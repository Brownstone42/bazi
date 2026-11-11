import { calculateTenGod } from '@openfate/bazi-engine'
import { scoreLevel } from './score-level.js'

const stems = [...'甲乙丙丁戊己庚辛壬癸']
const clashes = { 子: '午', 午: '子', 丑: '未', 未: '丑', 寅: '申', 申: '寅', 卯: '酉', 酉: '卯', 辰: '戌', 戌: '辰', 巳: '亥', 亥: '巳' }
const themes = {
  比肩: ['วันร่วมแรง', 'วันลดความดื้อ'],
  劫财: ['วันแข่งขัน', 'วันระวังการแย่งชิง'],
  食神: ['วันสร้างสรรค์', 'วันระวังผัดผ่อน'],
  伤官: ['วันแสดงความคิด', 'วันระวังคำพูด'],
  偏财: ['วันมองหาโอกาส', 'วันระวังเสี่ยงเกินตัว'],
  正财: ['วันเก็บเกี่ยว', 'วันรอบคอบเรื่องเงิน'],
  七杀: ['วันรับความท้าทาย', 'วันลดแรงกดดัน'],
  正官: ['วันสร้างความไว้วางใจ', 'วันรอบคอบเรื่องหน้าที่'],
  偏印: ['วันค้นพบมุมใหม่', 'วันระวังคิดวน'],
  正印: ['วันรับแรงสนับสนุน', 'วันระวังรอความช่วยเหลือ']
}

// Presentation rules for the local preview, not a reconstruction of another
// site's scoring. Preserve all engine scores: day/year clash overrides theme;
// otherwise the shared 0–45 caution band selects the caution wording.
// Repeated branches alone do not introduce a new punishment or score penalty.
export function dailyTheme(day, chart) {
  const pillar = day?.contextPillars?.day
  const dm = chart?.dayMaster?.char
  if (!stems.includes(dm) || !stems.includes(pillar?.[0]) || !Number.isFinite(day?.personalScore)) {
    return { title: 'วันวางแผนของคุณ', god: null, reason: 'unavailable' }
  }
  const god = calculateTenGod(dm, pillar[0])
  const caution = scoreLevel(day.personalScore).key === 'caution'
  for (const position of ['day', 'year']) {
    if (clashes[pillar[1]] && clashes[pillar[1]] === chart.pillars?.[position]?.branch) {
      return { title: position === 'day' ? 'วันชงวันเกิด' : 'วันชงปีเกิด', god, reason: `clash-${position}` }
    }
  }
  return { title: themes[god]?.[caution ? 1 : 0] ?? 'วันวางแผนของคุณ', god, reason: caution ? 'caution-score' : 'ten-god' }
}

export const dailyHeadline = (day, chart) => dailyTheme(day, chart).title
