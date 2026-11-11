import lunar from 'lunar-javascript'
import { calculateTenGod } from '@openfate/bazi-engine'
import { dailyTheme } from './daily-headline.js'
import { scoreLevel, scoreLevels } from './score-level.js'

const shortTitles = {
  'วันร่วมแรง': 'ร่วมแรง', 'วันลดความดื้อ': 'ลดความดื้อ', 'วันแข่งขัน': 'แข่งขัน', 'วันระวังการแย่งชิง': 'แย่งชิง',
  'วันสร้างสรรค์': 'สร้างสรรค์', 'วันระวังผัดผ่อน': 'ผัดผ่อน', 'วันแสดงความคิด': 'แสดงออก', 'วันระวังคำพูด': 'คำพูด',
  'วันมองหาโอกาส': 'โอกาส', 'วันระวังเสี่ยงเกินตัว': 'ลดเสี่ยง', 'วันเก็บเกี่ยว': 'เก็บเกี่ยว', 'วันรอบคอบเรื่องเงิน': 'รอบคอบเงิน',
  'วันรับความท้าทาย': 'ท้าทาย', 'วันลดแรงกดดัน': 'ลดกดดัน', 'วันสร้างความไว้วางใจ': 'ไว้วางใจ', 'วันรอบคอบเรื่องหน้าที่': 'หน้าที่',
  'วันค้นพบมุมใหม่': 'มุมใหม่', 'วันระวังคิดวน': 'คิดวน', 'วันรับแรงสนับสนุน': 'สนับสนุน', 'วันระวังรอความช่วยเหลือ': 'อย่ารอ',
  'วันชงวันเกิด': 'ชงวัน', 'วันชงปีเกิด': 'ชงปี'
}
export const monthThemes = {
  比肩: ['ร่วมมือและยืนหยัด', 'แบ่งหน้าที่ให้ชัด และเปิดรับมุมมองของคนร่วมงาน'],
  劫财: ['แข่งขันและแบ่งปัน', 'เลือกสนามที่ถนัด ตกลงเรื่องเงินและทรัพยากรที่ใช้ร่วมกัน'],
  食神: ['สร้างสรรค์และต่อยอด', 'ใช้ทักษะที่มีสร้างชิ้นงาน และจัดเวลาให้ทำได้จนจบ'],
  伤官: ['สื่อสารและแสดงความคิด', 'เสนอความเห็นพร้อมเหตุผล และฟังคำตอบก่อนสรุป'],
  偏财: ['สำรวจโอกาสใหม่', 'ลองทางเลือกใหม่ในขอบเขตที่รับไหว ตรวจเงื่อนไขก่อนลงทุน'],
  正财: ['จัดระเบียบทรัพยากร', 'ติดตามงานและรายรับที่ค้าง วางงบให้สัมพันธ์กับภาระจริง'],
  七杀: ['รับมือความท้าทาย', 'เลือกปัญหาที่สำคัญ จัดลำดับและขอแรงช่วยเมื่อจำเป็น'],
  正官: ['หน้าที่และความน่าเชื่อถือ', 'รักษาข้อตกลง ตรวจรายละเอียด และทำงานตามขั้นตอน'],
  偏印: ['เรียนรู้มุมมองใหม่', 'ค้นคว้าให้ลึก แล้วทดลองใช้ความรู้กับเรื่องเล็กที่วัดผลได้'],
  正印: ['เรียนรู้และรับการสนับสนุน', 'ขอคำแนะนำจากคนที่ไว้ใจ และกันเวลาทบทวนก่อนลงมือ']
}
export const stemNames = { 甲: 'ไม้หยาง', 乙: 'ไม้หยิน', 丙: 'ไฟหยาง', 丁: 'ไฟหยิน', 戊: 'ดินหยาง', 己: 'ดินหยิน', 庚: 'ทองหยาง', 辛: 'ทองหยิน', 壬: 'น้ำหยาง', 癸: 'น้ำหยิน' }
export const branchNames = { 子: 'ชวด', 丑: 'ฉลู', 寅: 'ขาล', 卯: 'เถาะ', 辰: 'มะโรง', 巳: 'มะเส็ง', 午: 'มะเมีย', 未: 'มะแม', 申: 'วอก', 酉: 'ระกา', 戌: 'จอ', 亥: 'กุน' }

export function presentMonth(month, chart, today) {
  const days = month.days.map(day => {
    const theme = dailyTheme(day, chart)
    const [y, m, d] = day.key.split('-').map(Number)
    const lunarDay = lunar.Solar.fromYmdHms(y, m, d, 12, 0, 0).getLunar().getDay()
    return { ...day, ...theme, shortTitle: shortTitles[theme.title] ?? 'วางแผน', rating: scoreLevel(day.personalScore),
      weekdayLabel: ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'][new Date(Date.UTC(y, m - 1, d)).getUTCDay()],
      festival: lunarDay === 1 ? 'วันชิวอิด' : lunarDay === 15 ? 'วันจับหง่อ' : null }
  })
  const counts = [...scoreLevels].reverse().map(level => ({ ...level, count: days.filter(day => day.rating.key === level.key).length }))
  let best = [], current = []
  for (const day of days) {
    if (day.personalScore > 60 && !day.reason.startsWith('clash-')) {
      current.push(day)
      if (current.length > best.length) best = [...current]
    } else current = []
  }
  const currentMonth = today.slice(0, 7) === days[0]?.key.slice(0, 7)
  const available = days.filter(day => !currentMonth || day.key >= today)
  const highlights = available.filter(day => day.personalScore > 60 && !day.reason.startsWith('clash-'))
    .sort((a, b) => b.personalScore - a.personalScore || a.day - b.day).slice(0, 5).sort((a, b) => a.day - b.day)
  const caution = available.filter(day => day.personalScore <= 45 || day.reason.startsWith('clash-'))
  const segments = []
  for (const day of days) {
    const pillar = day.contextPillars.month
    const last = segments.at(-1)
    if (last?.pillar === pillar) last.end = day.day
    else {
      const god = calculateTenGod(chart.dayMaster.char, pillar[0])
      const [title, advice] = monthThemes[god]
      segments.push({ pillar, start: day.day, end: day.day, title, advice, label: `${stemNames[pillar[0]]} · ${branchNames[pillar[1]]}` })
    }
  }
  const average = Math.round(days.reduce((sum, day) => sum + day.personalScore, 0) / days.length)
  return { days, counts, best, highlights, caution, segments, currentMonth, average,
    title: average > 75 ? 'หลายวันพร้อมให้เดินหน้า' : average > 60 ? 'มีจังหวะดีให้เลือกใช้' : average > 45 ? 'ค่อย ๆ วางแผนทีละเรื่อง' : 'เผื่อเวลาทบทวนและพักเพิ่ม',
    leadingBlanks: (month.leadingBlanks + 1) % 7 }
}
