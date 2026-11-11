import lunar from 'lunar-javascript'

// Hourly rotating-plate Chaibu; Bangkok civil time, Zi day starts at 23:00.
// Algorithm reference: Jy447/qimen (MIT), see docs/qimen-method.md.
const { Solar } = lunar
const ring = [1, 8, 3, 4, 9, 2, 7, 6]
const stems = [...'戊己庚辛壬癸丁丙乙']
const gates = ['休', '生', '傷', '杜', '景', '死', '驚', '開']
const spirits = ['值符', '騰蛇', '太陰', '六合', '白虎', '玄武', '九地', '九天']
export const palaceDirections = { 1: 'เหนือ', 8: 'ตะวันออกเฉียงเหนือ', 3: 'ตะวันออก', 4: 'ตะวันออกเฉียงใต้', 9: 'ใต้', 2: 'ตะวันตกเฉียงใต้', 7: 'ตะวันตก', 6: 'ตะวันตกเฉียงเหนือ' }
const terms = ['冬至', '小寒', '大寒', '立春', '雨水', '惊蛰', '春分', '清明', '谷雨', '立夏', '小满', '芒种', '夏至', '小暑', '大暑', '立秋', '处暑', '白露', '秋分', '寒露', '霜降', '立冬', '小雪', '大雪']
const juTable = ['174', '285', '396', '852', '963', '174', '396', '417', '528', '417', '528', '639', '936', '825', '714', '258', '147', '936', '714', '693', '582', '693', '582', '471']
const mod = (n, size) => ((n % size) + size) % size
const outer = palace => palace === 5 ? 2 : palace
function cycleIndex(pair) {
  const index = Array.from({ length: 60 }, (_, i) => i).find(i => '甲乙丙丁戊己庚辛壬癸'[i % 10] === pair[0] && '子丑寅卯辰巳午未申酉戌亥'[i % 12] === pair[1])
  if (index === undefined) throw new Error('Invalid sexagenary pillar')
  return index
}
export function buildQimenDirections(date, time = '12:00') {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) throw new Error('Invalid date/time')
  const [y, m, d] = date.split('-').map(Number)
  const [h, minute] = time.split(':').map(Number)
  const solar = Solar.fromYmdHms(y, m, d, h, minute, 0)
  if (h > 23 || minute > 59 || solar.toYmd() !== date) throw new Error('Invalid date/time')
  const local = solar.getLunar()
  // Solar-term tables use UTC+8. Compare the same instant (+1h from Bangkok),
  // while retaining local civil pillars. Never use wholeDay=true at a term boundary.
  const term = solar.nextHour(1).getLunar().getPrevJieQi(false).getName()
  const termIndex = terms.indexOf(term)
  if (termIndex < 0) throw new Error('Unknown solar term')
  const dayIndex = cycleIndex(local.getDayInGanZhiExact())
  const yuan = Math.floor(dayIndex / 5) % 3
  const ju = Number(juTable[termIndex][yuan])
  const sign = termIndex < 12 ? 1 : -1
  const earth = Object.fromEntries(stems.map((stem, i) => [mod(ju - 1 + sign * i, 9) + 1, stem]))
  const hourPillar = local.getTimeInGanZhi()
  const hourIndex = cycleIndex(hourPillar)
  const hiddenStem = stems[Math.floor(hourIndex / 10)]
  const find = stem => Number(Object.keys(earth).find(p => earth[p] === stem))
  const rawChief = find(hiddenStem)
  const chiefHome = outer(rawChief)
  const chiefTarget = outer(find(hourPillar[0] === '甲' ? hiddenStem : hourPillar[0]))
  // Count all nine palaces before lodging a central landing in Kun (2).
  const doorTarget = outer(mod(rawChief - 1 + sign * (hourIndex % 10), 9) + 1)
  const rotation = ring.indexOf(doorTarget) - ring.indexOf(chiefHome)
  const doors = Object.fromEntries(gates.map((gate, i) => [gate, ring[mod(i + rotation, 8)]]))
  const deities = Object.fromEntries(spirits.map((spirit, i) => [spirit, ring[mod(ring.indexOf(chiefTarget) + sign * i, 8)]]))
  const direction = palace => palaceDirections[palace]
  return {
    date, time, term, yuan: ['บน', 'กลาง', 'ล่าง'][yuan], ju, dun: sign === 1 ? 'หยาง' : 'หยิน', hourPillar,
    earth, doors, deities,
    authority: direction(deities['值符']), prayer: direction(deities['九天']), wealth: direction(deities['九地']),
    work: direction(doors['開']), rest: direction(doors['休']), avoid: direction(doors['死']),
  }
}

export function dailyWealthDirection(date) {
  const [y, m, d] = date.split('-').map(Number)
  const trigram = Solar.fromYmdHms(y, m, d, 12, 0, 0).getLunar().getPositionCai()
  return palaceDirections[{ 坎: 1, 艮: 8, 震: 3, 巽: 4, 离: 9, 坤: 2, 兑: 7, 乾: 6 }[trigram]]
}
