import { calculateBaziChart } from '@openfate/bazi-engine'
import { pathToFileURL } from 'node:url'

export const referenceInputs = [
  { id: 'RC-001', label: 'Default Bangkok chart', birthDate: '1989-08-26', birthTime: '11:30', gender: 'male', timezoneId: 'Asia/Bangkok', focus: ['baseline'] },
  { id: 'RC-002', label: 'Early spring', birthDate: '1990-02-04', birthTime: '12:00', gender: 'male', timezoneId: 'Asia/Bangkok', focus: ['spring'] },
  { id: 'RC-003', label: 'Mid spring', birthDate: '1992-03-21', birthTime: '08:15', gender: 'female', timezoneId: 'Asia/Bangkok', focus: ['spring'] },
  { id: 'RC-004', label: 'Late spring earth month', birthDate: '1994-04-18', birthTime: '17:40', gender: 'male', timezoneId: 'Asia/Bangkok', focus: ['earth_month', 'chen'] },
  { id: 'RC-005', label: 'Early summer', birthDate: '1996-05-12', birthTime: '06:20', gender: 'female', timezoneId: 'Asia/Bangkok', focus: ['summer'] },
  { id: 'RC-006', label: 'Mid summer', birthDate: '1998-06-22', birthTime: '13:10', gender: 'male', timezoneId: 'Asia/Bangkok', focus: ['summer'] },
  { id: 'RC-007', label: 'Late summer earth month', birthDate: '2000-07-19', birthTime: '19:05', gender: 'female', timezoneId: 'Asia/Bangkok', focus: ['earth_month', 'wei'] },
  { id: 'RC-008', label: 'Early autumn', birthDate: '2002-08-15', birthTime: '09:45', gender: 'male', timezoneId: 'Asia/Bangkok', focus: ['autumn'] },
  { id: 'RC-009', label: 'Mid autumn', birthDate: '2004-09-23', birthTime: '15:25', gender: 'female', timezoneId: 'Asia/Bangkok', focus: ['autumn'] },
  { id: 'RC-010', label: 'Late autumn earth month', birthDate: '2006-10-20', birthTime: '21:15', gender: 'male', timezoneId: 'Asia/Bangkok', focus: ['earth_month', 'xu'] },
  { id: 'RC-011', label: 'Early winter', birthDate: '2008-11-14', birthTime: '05:50', gender: 'female', timezoneId: 'Asia/Bangkok', focus: ['winter'] },
  { id: 'RC-012', label: 'Mid winter', birthDate: '2010-12-22', birthTime: '10:35', gender: 'male', timezoneId: 'Asia/Bangkok', focus: ['winter'] },
  { id: 'RC-013', label: 'Late winter earth month', birthDate: '2012-01-17', birthTime: '18:00', gender: 'female', timezoneId: 'Asia/Bangkok', focus: ['earth_month', 'chou'] },
  { id: 'RC-014', label: 'Wood day master candidate A', birthDate: '1985-03-08', birthTime: '03:30', gender: 'male', timezoneId: 'Asia/Bangkok', focus: ['day_master_coverage'] },
  { id: 'RC-015', label: 'Wood day master candidate B', birthDate: '1987-11-03', birthTime: '14:10', gender: 'female', timezoneId: 'Asia/Bangkok', focus: ['day_master_coverage'] },
  { id: 'RC-016', label: 'Fire day master candidate A', birthDate: '1991-07-07', birthTime: '07:05', gender: 'male', timezoneId: 'Asia/Bangkok', focus: ['day_master_coverage'] },
  { id: 'RC-017', label: 'Fire day master candidate B', birthDate: '1993-12-01', birthTime: '20:20', gender: 'female', timezoneId: 'Asia/Bangkok', focus: ['day_master_coverage'] },
  { id: 'RC-018', label: 'Water day master candidate C', birthDate: '2007-09-15', birthTime: '10:00', gender: 'male', timezoneId: 'Asia/Bangkok', focus: ['day_master_coverage'] },
  { id: 'RC-019', label: 'Earth day master candidate B', birthDate: '1997-09-09', birthTime: '16:30', gender: 'female', timezoneId: 'Asia/Bangkok', focus: ['day_master_coverage'] },
  { id: 'RC-020', label: 'Metal day master candidate A', birthDate: '1999-01-30', birthTime: '12:25', gender: 'male', timezoneId: 'Asia/Bangkok', focus: ['day_master_coverage'] },
  { id: 'RC-021', label: 'Metal day master candidate B', birthDate: '2001-04-02', birthTime: '22:10', gender: 'female', timezoneId: 'Asia/Bangkok', focus: ['day_master_coverage'] },
  { id: 'RC-022', label: 'Water day master candidate A', birthDate: '2003-06-16', birthTime: '01:55', gender: 'male', timezoneId: 'Asia/Bangkok', focus: ['day_master_coverage'] },
  { id: 'RC-023', label: 'Water day master candidate B', birthDate: '2005-10-05', birthTime: '11:05', gender: 'female', timezoneId: 'Asia/Bangkok', focus: ['day_master_coverage'] },
  { id: 'RC-024', label: 'Before Zi boundary', birthDate: '2018-03-14', birthTime: '22:59', gender: 'male', timezoneId: 'Asia/Bangkok', focus: ['zi_boundary'] },
  { id: 'RC-025', label: 'At Zi boundary', birthDate: '2018-03-14', birthTime: '23:00', gender: 'male', timezoneId: 'Asia/Bangkok', focus: ['zi_boundary'] },
  { id: 'RC-026', label: 'After Zi boundary', birthDate: '2018-03-14', birthTime: '23:01', gender: 'male', timezoneId: 'Asia/Bangkok', focus: ['zi_boundary'] },
  { id: 'RC-027', label: 'Before 2024 Li Chun boundary', birthDate: '2024-02-04', birthTime: '16:25', gender: 'female', timezoneId: 'Asia/Bangkok', focus: ['solar_term_boundary', 'li_chun'] },
  { id: 'RC-028', label: 'After 2024 Li Chun boundary', birthDate: '2024-02-04', birthTime: '16:30', gender: 'female', timezoneId: 'Asia/Bangkok', focus: ['solar_term_boundary', 'li_chun'] },
  { id: 'RC-029', label: 'New York DST-era chart', birthDate: '2015-07-04', birthTime: '09:30', gender: 'male', timezoneId: 'America/New_York', focus: ['timezone', 'dst'] },
  { id: 'RC-030', label: 'London winter chart', birthDate: '2016-12-31', birthTime: '23:30', gender: 'female', timezoneId: 'Europe/London', focus: ['timezone', 'zi_boundary'] }
]

const expectedById = {
  'RC-001': { strengthLevel: 'strong', patternType: 'regular', primaryUsefulElement: 'metal', supportiveElement: 'water', structureClarity: 'clear', rationale: ['ดิถีดินมีรากและแรง同党/印เด่น', 'เดือนวอกเปิดทางให้ใช้ทองระบายพลังดิน'] },
  'RC-002': { strengthLevel: 'weak', patternType: 'regular', primaryUsefulElement: 'earth', supportiveElement: 'metal', structureClarity: 'clear', rationale: ['ดิถีทองเกิดในฤดูไม้และไม่มีรากเด่น', 'ดินช่วยให้กำเนิดทองก่อนรับแรงระบายและควบคุม'] },
  'RC-003': { strengthLevel: 'weak', patternType: 'regular', primaryUsefulElement: 'wood', supportiveElement: 'fire', structureClarity: 'clear', rationale: ['ดิถีไฟไม่มีรากตรงและมี官杀เด่นมาก', 'เดือนเถาะยังให้แรง印 จึงยังไม่จัดเป็นดวงตาม'] },
  'RC-004': { strengthLevel: 'balanced', patternType: 'regular', primaryUsefulElement: 'fire', supportiveElement: 'earth', structureClarity: 'borderline', rationale: ['ดิถีไม้มีแรงจากก้านร่วมและ印ถ่วงกับ财ดินใกล้เคียงกัน', 'เดือนมะโรงเป็นเดือนดินเปลี่ยนฤดูจึงต้องเผื่อผลทางเลือก'] },
  'RC-005': { strengthLevel: 'strong', patternType: 'regular', primaryUsefulElement: 'metal', supportiveElement: 'water', structureClarity: 'fairly_clear', rationale: ['ดิถีดินได้รับ印ไฟจากเดือนมะเส็งอย่างชัดเจน', 'ทองใช้ระบายดินและต่อวงจรไปสู่น้ำ'] },
  'RC-006': { strengthLevel: 'weak', patternType: 'regular', primaryUsefulElement: 'earth', supportiveElement: 'metal', structureClarity: 'clear', rationale: ['ดิถีทองเกิดในเดือนมะเมียซึ่งไฟครองฤดู', 'แม้มี印ดินแต่ทองไม่มีรากที่เปิดชัด'] },
  'RC-007': { strengthLevel: 'strong', patternType: 'regular', primaryUsefulElement: 'metal', supportiveElement: 'water', structureClarity: 'borderline', rationale: ['ดิถีดินได้เดือนมะแมและมีรากหลายตำแหน่ง', 'แรง财และ食伤มากพอทำให้ผลอยู่ใกล้รอยต่อสมดุล'] },
  'RC-008': { strengthLevel: 'weak', patternType: 'regular', primaryUsefulElement: 'water', supportiveElement: 'wood', structureClarity: 'borderline', rationale: ['ดิถีไม้อยู่ในเดือนวอกซึ่งทองกดไม้', 'มีรากที่กิ่งวันแต่แรง财และ官杀ยังมาก'] },
  'RC-009': { strengthLevel: 'weak', patternType: 'regular', primaryUsefulElement: 'water', supportiveElement: 'wood', structureClarity: 'fairly_clear', rationale: ['ดิถีไม้อยู่ในเดือนระกาซึ่งเสียฤดูกาล', 'ก้านไม้หลายตัวช่วยพยุงแต่รากตรงมีจำกัด'] },
  'RC-010': { strengthLevel: 'weak', patternType: 'regular', primaryUsefulElement: 'metal', supportiveElement: 'water', structureClarity: 'borderline', rationale: ['ดิถีน้ำเกิดในเดือนจอและถูก财กับ官杀ถ่วง', 'มีรากกุนและ印ทองช่วยไว้จึงยังไม่อ่อนสุด'] },
  'RC-011': { strengthLevel: 'weak', patternType: 'regular', primaryUsefulElement: 'fire', supportiveElement: 'earth', structureClarity: 'clear', rationale: ['ดิถีดินเกิดในเดือนกุนซึ่งน้ำเป็น财ครองฤดู', 'ไฟช่วยให้กำเนิดดินก่อนใช้พลังไปจัดการ财官'] },
  'RC-012': { strengthLevel: 'weak', patternType: 'regular', primaryUsefulElement: 'wood', supportiveElement: 'fire', structureClarity: 'clear', rationale: ['ดิถีไฟเกิดในเดือนชวดซึ่งน้ำครองฤดู', 'มีรากมะเมียและมะเส็งทำให้ไม่ถึงระดับอ่อนมาก'] },
  'RC-013': { strengthLevel: 'very_weak', patternType: 'possible_follow', primaryUsefulElement: null, supportiveElement: null, structureClarity: 'borderline', rationale: ['ดิถีไฟไม่มีรากและมี财ทองกับ食伤ดินเด่น', 'อาจเข้าข่ายดวงตาม จึงยังไม่กำหนด用神อัตโนมัติ'] },
  'RC-014': { strengthLevel: 'strong', patternType: 'regular', primaryUsefulElement: 'earth', supportiveElement: 'metal', structureClarity: 'fairly_clear', rationale: ['ดิถีไฟได้印ไม้จากเดือนเถาะและมีรากมะเมีย', 'ดินช่วยระบายไฟและต่อพลังไปสู่财ทอง'] },
  'RC-015': { strengthLevel: 'balanced', patternType: 'regular', primaryUsefulElement: 'earth', supportiveElement: 'metal', structureClarity: 'borderline', rationale: ['ดิถีไฟมีไม้และไฟสนับสนุนหลายตำแหน่ง', 'เดือนจอและ食伤ดินถ่วงกำลังจนใกล้สมดุล'] },
  'RC-016': { strengthLevel: 'strong', patternType: 'regular', primaryUsefulElement: 'metal', supportiveElement: 'water', structureClarity: 'clear', rationale: ['ดิถีดินได้เดือนมะเมียและ印ไฟเปิดเผย', 'ทองเหมาะกับการระบายพลังที่ได้รับจากฤดูไฟ'] },
  'RC-017': { strengthLevel: 'very_weak', patternType: 'possible_follow', primaryUsefulElement: null, supportiveElement: null, structureClarity: 'borderline', rationale: ['ดิถีไฟเกิดเดือนกุนและมี官杀น้ำกับ食伤ดินเด่น', 'แรง印และรากไม่พอชัด จึงต้องตรวจดวงตามก่อนเลือก用神'] },
  'RC-018': { strengthLevel: 'balanced', patternType: 'regular', primaryUsefulElement: 'wood', supportiveElement: 'fire', structureClarity: 'borderline', rationale: ['ดิถีน้ำได้แรง印จากเดือนระกาและมีรากชวด', 'แรงระบาย 财 และ官กระจายใกล้เคียงกัน'] },
  'RC-019': { strengthLevel: 'weak', patternType: 'regular', primaryUsefulElement: 'water', supportiveElement: 'wood', structureClarity: 'clear', rationale: ['ดิถีไม้เกิดเดือนระกาแต่มีรากขาลและ印น้ำ', 'ยังต้องใช้น้ำพยุงก่อนรับ财ดินและ官ทอง'] },
  'RC-020': { strengthLevel: 'weak', patternType: 'regular', primaryUsefulElement: 'metal', supportiveElement: 'water', structureClarity: 'borderline', rationale: ['ดิถีน้ำมีรากและ印น้อยมากเมื่อเทียบกับ财官', 'ยังมีรากน้ำในเดือนฉลู จึงใช้โครงสร้างปกติอย่างระมัดระวัง'] },
  'RC-021': { strengthLevel: 'strong', patternType: 'regular', primaryUsefulElement: 'fire', supportiveElement: 'earth', structureClarity: 'borderline', rationale: ['ดิถีไม้ได้เดือนเถาะและมีรากตามฤดูกาล', 'ไฟช่วยระบายไม้และส่งต่อไปยัง财ดิน'] },
  'RC-022': { strengthLevel: 'weak', patternType: 'regular', primaryUsefulElement: 'earth', supportiveElement: 'metal', structureClarity: 'clear', rationale: ['ดิถีทองเสียฤดูไฟแม้มี印ดินและรากวอกพยุง', 'ดินต้องช่วยให้กำเนิดทองก่อนใช้พลังไปสู่食伤'] },
  'RC-023': { strengthLevel: 'balanced', patternType: 'regular', primaryUsefulElement: 'wood', supportiveElement: 'fire', structureClarity: 'borderline', rationale: ['ดิถีน้ำได้เดือนระกาที่เป็น印แต่ไม่มีรากน้ำชัด', 'แรง印ถ่วงกับ食伤และ财จนอยู่ใกล้สมดุล'] },
  'RC-024': { strengthLevel: 'strong', patternType: 'regular', primaryUsefulElement: 'fire', supportiveElement: 'earth', structureClarity: 'clear', rationale: ['ดิถีไม้ได้เดือนเถาะและมีรากตรง', 'ไฟช่วยระบายพลังไม้ที่ได้ฤดูกาล'] },
  'RC-025': { strengthLevel: 'strong', patternType: 'regular', primaryUsefulElement: 'earth', supportiveElement: 'metal', structureClarity: 'borderline', rationale: ['หลังเปลี่ยนวัน ดิถีไฟได้印จากเดือนเถาะและมีรากมะเมีย', 'ดินที่เปิดเผยช่วยรับและระบายพลังไฟ'] },
  'RC-026': { strengthLevel: 'strong', patternType: 'regular', primaryUsefulElement: 'earth', supportiveElement: 'metal', structureClarity: 'borderline', rationale: ['ผลต้องเหมือน RC-025 เพราะอยู่ในยามเดียวกันหลังขอบ 23:00', 'ใช้ยืนยันความคงที่ภายในช่วงยามชวด'] },
  'RC-027': { strengthLevel: 'balanced', patternType: 'regular', primaryUsefulElement: 'fire', supportiveElement: 'earth', structureClarity: 'borderline', rationale: ['ก่อนลิบชุนยังเป็นเดือนฉลูและดินมีราก', 'ฤดูหนาวทำให้ต้องพิจารณาไฟเพื่อปรับความเย็นร่วมด้วย'] },
  'RC-028': { strengthLevel: 'weak', patternType: 'regular', primaryUsefulElement: 'fire', supportiveElement: 'earth', structureClarity: 'fairly_clear', rationale: ['หลังลิบชุนเปลี่ยนเป็นเดือนขาลซึ่งไม้ควบคุมดิน', 'มีรากดินและ印ไฟช่วยไว้จึงไม่ถึงระดับอ่อนมาก'] },
  'RC-029': { strengthLevel: 'weak', patternType: 'regular', primaryUsefulElement: 'earth', supportiveElement: 'metal', structureClarity: 'borderline', rationale: ['ดิถีทองเกิดในเดือนมะเมียและถูกไฟกดหลายตำแหน่ง', 'ดินช่วยเปลี่ยนแรงไฟมาให้กำเนิดทอง'] },
  'RC-030': { strengthLevel: 'weak', patternType: 'regular', primaryUsefulElement: 'fire', supportiveElement: 'earth', structureClarity: 'borderline', rationale: ['ดิถีดินเกิดในเดือนชวดและ财น้ำครองหลายกิ่ง', 'ไฟช่วยทั้งปรับความเย็นและให้กำเนิดดิน'] }
}

function calculate(input) {
  const [year, month, day] = input.birthDate.split('-').map(Number)
  const [hour, minute] = input.birthTime.split(':').map(Number)
  const chart = calculateBaziChart({
    year,
    month,
    day,
    hour,
    minute,
    gender: input.gender,
    timezoneId: input.timezoneId,
    enableTrueSolarTime: false,
    dayBoundaryMode: 'ZI_HOUR_23',
    calendarType: 'solar'
  })

  return {
    ...input,
    pillars: {
      year: chart.pillars.year.ganZhi,
      month: chart.pillars.month.ganZhi,
      day: chart.pillars.day.ganZhi,
      hour: chart.pillars.hour?.ganZhi ?? null
    },
    dayMaster: {
      char: chart.dayMaster.char,
      element: chart.dayMaster.element,
      polarity: chart.dayMaster.polarity
    },
    expected: {
      status: 'baseline_hypothesis',
      ...expectedById[input.id]
    },
    calculationPolicy: {
      trueSolarTime: false,
      dayBoundaryMode: 'ZI_HOUR_23',
      ruleVersion: 'reference-cases/0.1.0'
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(JSON.stringify(referenceInputs.map(calculate), null, 2))
}

export const buildReferenceCases = () => referenceInputs.map(calculate)
