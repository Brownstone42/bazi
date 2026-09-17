import {
  BRANCH_HIDDEN_STEMS,
  BRANCH_TO_ELEMENT,
  calculateTenGod,
  detectInteractions,
  STEM_TO_ELEMENT,
  STEM_TO_POLARITY
} from '@openfate/bazi-engine'

const elementThai = {
  wood: 'ไม้',
  fire: 'ไฟ',
  earth: 'ดิน',
  metal: 'ทอง',
  water: 'น้ำ'
}

const polarityThai = {
  yang: 'หยาง',
  yin: 'หยิน'
}

const branchThai = {
  子: 'ชวด', 丑: 'ฉลู', 寅: 'ขาล', 卯: 'เถาะ', 辰: 'มะโรง', 巳: 'มะเส็ง',
  午: 'มะเมีย', 未: 'มะแม', 申: 'วอก', 酉: 'ระกา', 戌: 'จอ', 亥: 'กุน'
}

const genderThai = {
  male: 'ชาย',
  female: 'หญิง'
}

const tenGodThai = {
  比肩: 'เพื่อนร่วมพลัง',
  劫财: 'การแข่งขันและแบ่งทรัพยากร',
  食神: 'การสร้างสรรค์',
  伤官: 'การแสดงออกนอกกรอบ',
  偏财: 'โอกาสและทรัพย์หมุนเวียน',
  正财: 'รายได้และการจัดการทรัพย์',
  七杀: 'แรงกดดันและการตัดสินใจ',
  正官: 'กฎเกณฑ์และความรับผิดชอบ',
  偏印: 'การเรียนรู้จากมุมเฉพาะ',
  正印: 'ความรู้และแรงสนับสนุน'
}

const tenGodProfiles = {
  比肩: {
    label: 'การยืนด้วยตนเอง',
    visible: 'ความเป็นตัวของตัวเอง การรับบทนำ และการตัดสินใจด้วยตนเองเด่นขึ้น',
    foundation: 'ฐานของช่วงนี้ให้ความสำคัญกับความมั่นคงในตัวเองและคนที่มีสถานะใกล้เคียงกัน',
    opportunity: 'สร้างฐานที่พึ่งพาตนเองได้และร่วมมือกับคนที่เคารพขอบเขตกัน',
    risk: 'การยืนยันวิธีของตนเองมากเกินไปอาจทำให้รับความเห็นจากคนอื่นได้ยาก',
    action: 'เลือกเรื่องที่ควรตัดสินใจเอง และเปิดพื้นที่ให้ผู้อื่นมีเจ้าของงานของตนชัดเจน',
    work: 'งานที่เปิดโอกาสให้ตัดสินใจและรับผิดชอบด้วยตนเองมีแนวโน้มไปได้ดีกว่างานที่ถูกกำกับทุกขั้น',
    money: 'การเงินขึ้นอยู่กับวินัยและการพึ่งกำลังของตนเอง ควรแยกเงินส่วนตัวออกจากเงินที่ใช้ร่วมกับผู้อื่น',
    relationship: 'ความสัมพันธ์ต้องการความเท่าเทียมและพื้นที่ส่วนตัว การตกลงบทบาทให้ชัดจะช่วยลดการแข่งกันโดยไม่รู้ตัว'
  },
  劫财: {
    label: 'การร่วมมือและการแข่งขัน',
    visible: 'การรวมกลุ่ม การแข่งขัน และการแบ่งทรัพยากรกับคนรอบตัวปรากฏชัดขึ้น',
    foundation: 'ฐานของช่วงนี้มีทั้งแรงหนุนจากพวกพ้องและแรงแย่งพื้นที่หรือผลประโยชน์',
    opportunity: 'ทำความรู้จักผู้คนเพิ่มขึ้นและร่วมมือกับคนที่มีความสามารถเสริมกัน',
    risk: 'ข้อตกลงที่ไม่ชัดอาจนำไปสู่การเสียเปรียบหรือความขัดแย้งเรื่องเงินและเครดิต',
    action: 'กำหนดส่วนแบ่ง อำนาจตัดสินใจ และความรับผิดชอบก่อนร่วมงานหรือใช้เงินร่วมกัน',
    work: 'มีโอกาสพบทั้งเพื่อนร่วมทางและคู่แข่ง การเลือกทีมและข้อตกลงที่ชัดมีผลต่อความสำเร็จมาก',
    money: 'เงินมีโอกาสหมุนออกผ่านหุ้นส่วน เพื่อน หรือค่าใช้จ่ายร่วม ควรตรวจส่วนแบ่งและสิทธิในผลประโยชน์',
    relationship: 'คนรอบตัวมีบทบาทมากขึ้น ทั้งในฐานะแรงสนับสนุนและแรงกดดัน จึงควรหลีกเลี่ยงการเปรียบเทียบหรือเลือกข้างเร็วเกินไป'
  },
  食神: {
    label: 'ผลงานที่ค่อย ๆ เติบโต',
    visible: 'ความสามารถในการสร้างผลงาน ถ่ายทอด และทำสิ่งยากให้เข้าใจง่ายถูกนำออกมาใช้',
    foundation: 'ฐานของช่วงนี้สนับสนุนการผลิตผลงานอย่างต่อเนื่องและการดูแลคุณภาพชีวิต',
    opportunity: 'เปลี่ยนความถนัดให้เป็นผลงานที่เติบโตได้อย่างสม่ำเสมอ',
    risk: 'ความสบายหรือการทำหลายสิ่งที่ชอบพร้อมกันอาจลดความต่อเนื่องของเป้าหมายหลัก',
    action: 'เลือกผลงานหลักหนึ่งเรื่องและวางจังหวะทำซ้ำที่รักษาได้จริง',
    work: 'เหมาะกับงานสร้างสรรค์ การสื่อสาร การสอน หรือการพัฒนาผลงานที่ต้องอาศัยความต่อเนื่อง',
    money: 'รายได้มีแนวโน้มเติบโตจากทักษะและผลงานมากกว่าการเร่งผลระยะสั้น ควรสร้างช่องทางที่ทำซ้ำได้',
    relationship: 'บรรยากาศความสัมพันธ์มีโอกาสผ่อนคลายขึ้นเมื่อได้แบ่งปันเวลา ความสนใจ และความสุขเรียบง่ายร่วมกัน'
  },
  伤官: {
    label: 'การท้าทายกรอบเดิม',
    visible: 'ความคิดวิพากษ์ การสื่อสารตรง และความต้องการปรับสิ่งที่ไม่ตอบโจทย์เด่นขึ้น',
    foundation: 'ฐานของช่วงนี้ผลักให้หาวิธีของตนเองมากกว่าทำตามรูปแบบเดิมทั้งหมด',
    opportunity: 'ใช้มุมมองที่ต่างเพื่อแก้ปัญหาและสร้างผลงานที่มีลายเซ็นของตนเอง',
    risk: 'การวิจารณ์ก่อนเข้าใจข้อจำกัดของระบบอาจทำให้เกิดแรงต้านที่ไม่จำเป็น',
    action: 'เสนอทางเลือกพร้อมเหตุผลและผลลัพธ์ แทนการชี้เฉพาะสิ่งที่ไม่เห็นด้วย',
    work: 'เหมาะกับการแก้ปัญหา ปรับระบบ และนำเสนอแนวคิดใหม่ แต่การสื่อสารกับผู้มีอำนาจต้องเลือกจังหวะ',
    money: 'หาเงินจากความคิดหรือความสามารถเฉพาะได้ดีขึ้น แต่ไม่ควรตัดสินใจทางการเงินเพียงเพราะต้องการพิสูจน์ว่าตนคิดถูก',
    relationship: 'มีแนวโน้มพูดสิ่งที่คิดตรงขึ้น ควรแยกความตั้งใจดีออกจากน้ำเสียงที่อีกฝ่ายอาจรู้สึกว่าถูกตำหนิ'
  },
  偏财: {
    label: 'โอกาสจากตลาดและผู้คน',
    visible: 'โอกาสจากลูกค้า คนรู้จัก การต่อรอง และทรัพยากรที่หมุนเร็วเข้ามามีบทบาท',
    foundation: 'ฐานของช่วงนี้เปิดรับโอกาสหลายทางและต้องอาศัยความคล่องตัวในการจัดการ',
    opportunity: 'ใช้ความสัมพันธ์และการมองเห็นโอกาสเพื่อสร้างมูลค่าจากสิ่งที่มี',
    risk: 'โอกาสที่เข้ามาเร็วอาจทำให้รับภาระหรือลงทรัพยากรเกินกำลัง',
    action: 'ตั้งเกณฑ์รับโอกาสและเพดานความเสี่ยงก่อนเจรจาหรือลงทรัพยากร',
    work: 'งานขาย ธุรกิจ การเจรจา และงานที่ต้องพบผู้คนมีโอกาสเปิดทางใหม่ได้มากกว่างานที่อยู่กับรูปแบบเดิม',
    money: 'มีช่องทางหาเงินหรือโอกาสพิเศษเข้ามาได้ แต่รายรับอาจไม่สม่ำเสมอ จึงต้องกำหนดวงเงินเสี่ยงล่วงหน้า',
    relationship: 'วงสังคมอาจกว้างขึ้นและมีคนเข้ามาหลายแบบ ควรระวังการให้เวลาและความหวังเกินกว่าที่ดูแลได้จริง'
  },
  正财: {
    label: 'รายได้และภาระที่จับต้องได้',
    visible: 'การจัดการรายได้ ทรัพย์สิน งานประจำ และความรับผิดชอบที่วัดผลได้เด่นขึ้น',
    foundation: 'ฐานของช่วงนี้ต้องการความสม่ำเสมอ วินัย และการบริหารสิ่งที่มีอยู่จริง',
    opportunity: 'สร้างความมั่นคงจากระบบรายรับรายจ่ายและงานที่ให้ผลต่อเนื่อง',
    risk: 'การยึดกับความมั่นคงมากเกินไปอาจทำให้พลาดทางเลือกที่เหมาะกว่า',
    action: 'ทำให้ภาระและกระแสเงินมองเห็นได้ แล้วตัดสิ่งที่ใช้แรงแต่ไม่สร้างคุณค่า',
    work: 'งานที่มีเป้าหมาย ตัวเลข และความรับผิดชอบชัดมีแนวโน้มสร้างผลที่มั่นคงกว่างานที่เปลี่ยนทิศบ่อย',
    money: 'เหมาะกับการจัดงบ สะสมทรัพย์ และสร้างรายได้สม่ำเสมอ แต่ควรเผื่อพื้นที่สำหรับโอกาสใหม่ด้วย',
    relationship: 'ให้ความสำคัญกับความมั่นคงและการดูแลกันผ่านการลงมือทำ แต่อย่าเปลี่ยนความรับผิดชอบให้กลายเป็นการควบคุม'
  },
  七杀: {
    label: 'แรงกดดันที่เร่งการตัดสินใจ',
    visible: 'โจทย์ที่ต้องตัดสินใจเร็ว แข่งขัน หรือรับมือกับอำนาจและความไม่แน่นอนเด่นขึ้น',
    foundation: 'ฐานของช่วงนี้สร้างแรงผลักสูง จึงให้ทั้งความกล้าและความตึงเครียด',
    opportunity: 'ฝึกความเด็ดขาดและรับบทที่ต้องแก้ปัญหาภายใต้ข้อจำกัด',
    risk: 'การตอบสนองต่อแรงกดดันโดยไม่มีข้อมูลหรือขอบเขตอาจทำให้เสี่ยงเกินจำเป็น',
    action: 'แยกเรื่องเร่งด่วนออกจากเรื่องสำคัญ และกำหนดจุดหยุดก่อนรับความเสี่ยง',
    work: 'อาจได้รับโจทย์ยาก การแข่งขัน หรือความรับผิดชอบที่ต้องตัดสินใจเร็ว หากมีขอบเขตชัดจะกลายเป็นช่วงสร้างความสามารถ',
    money: 'ไม่เหมาะกับการเสี่ยงเพราะถูกกดดันหรือกลัวพลาดโอกาส ควรตรวจผลเสียสูงสุดก่อนตัดสินใจทุกครั้ง',
    relationship: 'แรงกดดันภายนอกอาจทำให้ใจร้อนหรือป้องกันตัวมากขึ้น ควรเว้นระยะก่อนตอบโต้เรื่องสำคัญ'
  },
  正官: {
    label: 'บทบาทและมาตรฐาน',
    visible: 'หน้าที่ กติกา ตำแหน่ง และความน่าเชื่อถือในระบบถูกเน้นให้เห็นชัด',
    foundation: 'ฐานของช่วงนี้ต้องการระเบียบ ความรับผิดชอบ และการทำสิ่งต่าง ๆ ให้ตรวจสอบได้',
    opportunity: 'สร้างชื่อจากมาตรฐานที่สม่ำเสมอและการรับผิดชอบต่อบทบาท',
    risk: 'ความกลัวผิดกฎหรือผิดความคาดหวังอาจจำกัดการตัดสินใจของตนเอง',
    action: 'ทำความคาดหวังและขอบเขตอำนาจให้ชัด แล้วรักษามาตรฐานเฉพาะเรื่องสำคัญ',
    work: 'มีโอกาสรับตำแหน่ง หน้าที่ หรือความไว้วางใจมากขึ้น ความก้าวหน้าจะมาจากความสม่ำเสมอและการทำตามข้อตกลง',
    money: 'การเงินเหมาะกับแผนที่มีระบบและความเสี่ยงต่ำ ควรระวังค่าใช้จ่ายที่เกิดจากภาพลักษณ์หรือหน้าที่ทางสังคม',
    relationship: 'ความสัมพันธ์มีแนวโน้มจริงจังกับสถานะและความรับผิดชอบมากขึ้น ควรคุยความคาดหวังแทนการเดาใจอีกฝ่าย'
  },
  偏印: {
    label: 'การปรับตัวด้วยความรู้เฉพาะ',
    visible: 'การเรียนรู้ทางลัด มุมมองเฉพาะตัว และการแก้ปัญหาจากข้อมูลที่คนอื่นมองข้ามเด่นขึ้น',
    foundation: 'ฐานของช่วงนี้ต้องอาศัยการสังเกต การปรับตัว และความรู้ที่ไม่เป็นเส้นตรง',
    opportunity: 'พัฒนาความเชี่ยวชาญเฉพาะและใช้มุมมองใหม่กับปัญหาเดิม',
    risk: 'การเปลี่ยนกรอบคิดบ่อยหรือเก็บข้อมูลมากเกินไปอาจทำให้ลงมือไม่ต่อเนื่อง',
    action: 'กำหนดคำถามให้ชัด ทดลองทีละสมมติฐาน และเก็บเฉพาะข้อมูลที่ช่วยตัดสินใจ',
    work: 'เหมาะกับงานวิเคราะห์ งานเฉพาะทาง และการแก้ปัญหาที่ไม่มีคำตอบสำเร็จรูป แต่อาจเบื่องานซ้ำได้ง่าย',
    money: 'รายได้อาจมาจากความรู้เฉพาะหรือวิธีที่คนอื่นยังมองไม่เห็น ควรทดสอบตลาดก่อนลงทุนเต็มกำลัง',
    relationship: 'อาจต้องการเวลาอยู่กับความคิดของตนเองมากขึ้น การบอกความต้องการตรง ๆ จะช่วยไม่ให้อีกฝ่ายตีความว่าเป็นการถอยห่าง'
  },
  正印: {
    label: 'การเรียนรู้และแรงสนับสนุน',
    visible: 'ความรู้ ผู้สนับสนุน เอกสาร และระบบที่ช่วยรองรับการเติบโตเข้ามามีบทบาท',
    foundation: 'ฐานของช่วงนี้เหมาะกับการสะสมความรู้ ฟื้นกำลัง และสร้างความมั่นคงเบื้องหลัง',
    opportunity: 'ใช้ผู้รู้ ระบบ และการเรียนที่มีโครงสร้างเพื่อยกระดับฐานของตนเอง',
    risk: 'การรอความพร้อมหรือการรับความช่วยเหลือมากเกินไปอาจลดการตัดสินใจด้วยตนเอง',
    action: 'กำหนดว่าความรู้หรือความช่วยเหลือใดต้องนำไปใช้กับผลลัพธ์ใดและเมื่อไร',
    work: 'การเรียนเพิ่ม ขอคำแนะนำ หรือทำงานกับระบบที่มีผู้สนับสนุนมีแนวโน้มช่วยเปิดทางมากกว่าการฝืนทำทุกอย่างคนเดียว',
    money: 'เหมาะกับการสร้างความมั่นคงและลงทุนกับความรู้มากกว่าหวังผลเร็ว แต่ต้องระวังเตรียมตัวนานจนไม่ได้สร้างรายได้จริง',
    relationship: 'มีโอกาสได้รับการดูแลหรือคำแนะนำจากคนใกล้ตัว ควรรักษาสมดุลระหว่างการรับความช่วยเหลือกับการตัดสินใจเอง'
  }
}

const stemCombinations = {
  '己甲': 'earth', '乙庚': 'metal', '丙辛': 'water', '丁壬': 'wood', '戊癸': 'fire'
}

const stemClashes = new Set(['庚甲', '乙辛', '丙壬', '丁癸'])
const branchClashes = new Set(['子午', '丑未', '寅申', '卯酉', '辰戌', '巳亥'])
const branchCombinations = { 子丑: 'earth', 寅亥: 'wood', 卯戌: 'fire', 辰酉: 'metal', 巳申: 'water', 午未: 'fire' }
const branchDestructions = new Set(['子酉', '丑辰', '寅亥', '卯午', '巳申', '未戌'])
const branchHarms = new Set(['子未', '丑午', '寅巳', '卯辰', '申亥', '酉戌'])
const selfPunishmentBranches = new Set(['辰', '午', '酉', '亥'])

const interactionThai = {
  CLASH: 'เกิดแรงปะทะ (冲)',
  COMBINATION_2: 'เกิดการประสาน (六合)',
  TRINE: 'เกิดโครงสามสัมพันธ์ (三合)',
  DIRECTIONAL: 'เกิดโครงสามทิศ (三会)',
  PUNISHMENT: 'เกิดแรงกดดันซ้ำ (刑)',
  DESTRUCTION: 'เกิดความไม่ต่อเนื่อง (破)',
  HARM: 'เกิดแรงเสียดทานที่มองเห็นยาก (害)'
}

const pillarTopics = {
  year: 'สังคมและสภาพแวดล้อมภายนอก',
  month: 'งาน ระบบ และครอบครัวเดิม',
  day: 'ตัวตนและความสัมพันธ์ใกล้ชิด',
  hour: 'เป้าหมายระยะยาวและสิ่งที่กำลังสร้าง'
}

const pillarThai = { year: 'ปี', month: 'เดือน', day: 'วัน', hour: 'ยาม' }
const produces = { wood: 'fire', fire: 'earth', earth: 'metal', metal: 'water', water: 'wood' }
const controls = { wood: 'earth', earth: 'water', water: 'fire', fire: 'metal', metal: 'wood' }

const thaiMonths = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
]

function parseEngineDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):\d{2}$/.exec(value)
  if (!match) return null
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5])
  }
}

function dateKey(parts) {
  return parts.year * 10000 + parts.month * 100 + parts.day
}

function todayInTimezone(now, timezoneId) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezoneId,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(now)
  const get = (type) => Number(parts.find((part) => part.type === type)?.value)
  return { year: get('year'), month: get('month'), day: get('day') }
}

export function formatLuckStartOffset(offset) {
  const parts = [
    offset.years ? `${offset.years} ปี` : '',
    offset.months ? `${offset.months} เดือน` : '',
    offset.days ? `${offset.days} วัน` : '',
    offset.hours ? `${offset.hours} ชั่วโมง` : ''
  ].filter(Boolean)
  return parts.join(' ') || 'เริ่มตั้งแต่เกิด'
}

export function formatLuckStartDate(value) {
  const parsed = parseEngineDate(value)
  if (!parsed) return value
  return `${parsed.day} ${thaiMonths[parsed.month - 1]} ${parsed.year} เวลา ${String(parsed.hour).padStart(2, '0')}:${String(parsed.minute).padStart(2, '0')}`
}

export function tenGodThaiLabel(value) {
  return `${value} (${tenGodThai[value] ?? value})`
}

function lookupPair(collection, first, second) {
  return collection[first + second] ?? collection[second + first]
}

function hasPair(collection, first, second) {
  return collection.has(first + second) || collection.has(second + first)
}

function getLuckHiddenStems(chart, branch) {
  return (BRANCH_HIDDEN_STEMS[branch] ?? []).map((item) => ({
    ...item,
    element: STEM_TO_ELEMENT[item.stem],
    tenGod: calculateTenGod(chart.dayMaster.char, item.stem)
  }))
}

function describeElementFlow(incomingElement, natalElement) {
  if (incomingElement === natalElement) return 'เสริมพลังชนิดเดียวกัน'
  if (produces[incomingElement] === natalElement) return 'ส่งพลังให้'
  if (produces[natalElement] === incomingElement) return 'รับพลังจาก'
  if (controls[incomingElement] === natalElement) return 'ควบคุม'
  if (controls[natalElement] === incomingElement) return 'ถูกควบคุมโดย'
  return 'สัมพันธ์กับ'
}

function describeStemInteractions(chart, cycle) {
  const results = []

  Object.entries(chart.pillars).filter(([, pillar]) => Boolean(pillar)).forEach(([position, pillar]) => {
    const affected = pillarTopics[position]
    const combinationElement = lookupPair(stemCombinations, cycle.stem, pillar.stem)

    if (cycle.ganZhi === pillar.ganZhi) {
      results.push({
        type: 'REPEATED_PILLAR', position, affected,
        text: `เสา ${cycle.ganZhi} ซ้ำกับเสา${pillarThai[position]}เดิม (伏吟) จึงย้ำประเด็นด้าน${affected}เป็นพิเศษ`
      })
    } else if (cycle.stem === pillar.stem) {
      results.push({
        type: 'SAME_STEM', position, affected,
        text: `ก้านฟ้า ${cycle.stem} ซ้ำกับก้านเสา${pillarThai[position]} ทำให้ประเด็นด้าน${affected}ปรากฏชัดขึ้น`
      })
    }

    if (combinationElement) {
      results.push({
        type: 'STEM_COMBINATION', position, affected, resultElement: combinationElement,
        text: `ก้านฟ้า ${cycle.stem} ผสาน (合) กับ ${pillar.stem} ที่เสา${pillarThai[position]} เชื่อมเรื่อง${affected}เข้ากับช่วงนี้ โดยมีธาตุ${elementThai[combinationElement]}เป็นทิศทางที่อาจเกิดขึ้นหากเงื่อนไขครบ`
      })
    } else if (hasPair(stemClashes, cycle.stem, pillar.stem)) {
      results.push({
        type: 'STEM_CLASH', position, affected,
        text: `ก้านฟ้า ${cycle.stem} ปะทะกับ ${pillar.stem} ที่เสา${pillarThai[position]} ทำให้วิธีแสดงออกหรือการตัดสินใจในเรื่อง${affected}ต้องปรับตัว`
      })
    }
  })

  return results
}

function describeBranchInteractions(chart, branch) {
  const natalBranches = {
    year: chart.pillars.year.branch,
    month: chart.pillars.month.branch,
    day: chart.pillars.day.branch,
    hour: chart.pillars.hour?.branch ?? ''
  }

  const pairResults = []
  Object.entries(natalBranches).filter(([, natalBranch]) => Boolean(natalBranch)).forEach(([position, natalBranch]) => {
    const affected = pillarTopics[position]
    const add = (type, text, resultElement) => pairResults.push({ type, position, affected, text, resultElement })

    if (branch === natalBranch) {
      add('SAME_BRANCH', `กิ่งดิน ${branch} ซ้ำกับกิ่งเสา${pillarThai[position]} จึงย้ำเรื่อง${affected}`)
      if (selfPunishmentBranches.has(branch)) {
        add('PUNISHMENT', `กิ่ง ${branch} เกิดภาวะลงโทษตนเอง (自刑) กับเสา${pillarThai[position]} ควรระวังแรงกดดันหรือรูปแบบเดิมที่เกิดซ้ำในเรื่อง${affected}`)
      }
    }
    if (hasPair(branchClashes, branch, natalBranch)) {
      add('CLASH', `กิ่ง ${branch} ปะทะ (冲) กับ ${natalBranch} ที่เสา${pillarThai[position]} เรื่อง${affected}จึงมีแรงเปลี่ยนแปลงหรือเคลื่อนไหวมากขึ้น`)
    }
    const combinationElement = lookupPair(branchCombinations, branch, natalBranch)
    if (combinationElement) {
      add('COMBINATION_2', `กิ่ง ${branch} ประสาน (六合) กับ ${natalBranch} ที่เสา${pillarThai[position]} เรื่อง${affected}มีแนวโน้มถูกเชื่อม ผูกพัน หรือดึงเข้าหากัน`, combinationElement)
    }
    if (hasPair(branchDestructions, branch, natalBranch)) {
      add('DESTRUCTION', `กิ่ง ${branch} เกิดภาวะไม่ต่อเนื่อง (破) กับ ${natalBranch} ที่เสา${pillarThai[position]} ควรเผื่อการแก้แผนในเรื่อง${affected}`)
    }
    if (hasPair(branchHarms, branch, natalBranch)) {
      add('HARM', `กิ่ง ${branch} เกิดแรงเสียดทานที่มองเห็นยาก (害) กับ ${natalBranch} ที่เสา${pillarThai[position]} ควรตรวจความเข้าใจและเงื่อนไขที่ไม่ได้พูดในเรื่อง${affected}`)
    }
  })

  const groupResults = detectInteractions(natalBranches, branch)
    .filter((interaction) => interaction.pillars.includes('annual'))
    .filter((interaction) => ['TRINE', 'DIRECTIONAL', 'PUNISHMENT'].includes(interaction.type))
    .map((interaction) => {
      const positions = [...new Set(interaction.pillars.filter((pillar) => pillar !== 'annual'))]
      const affectedTopics = positions
        .filter((pillar) => pillar !== 'annual')
        .map((pillar) => pillarTopics[pillar])
      const resultText = interaction.resultElement
        ? `และอาจรวมแรงไปทางธาตุ${elementThai[interaction.resultElement]}หากเงื่อนไขการแปรธาตุครบ`
        : ''
      return {
        type: interaction.type,
        position: positions,
        affected: affectedTopics.join(' และ '),
        resultElement: interaction.resultElement,
        text: `${interactionThai[interaction.type] ?? interaction.type} เชื่อมกิ่ง ${interaction.branches.join('–')} เข้ากับด้าน${affectedTopics.join(' และ ')} ${resultText}`.trim()
      }
    })

  return [...pairResults, ...groupResults]
}

function getLifeStage(cycle) {
  const midpoint = (cycle.startAge + cycle.endAge) / 2
  if (midpoint < 16) return { key: 'child', label: 'วัยเรียนรู้พื้นฐาน', guidance: 'ใช้จังหวะนี้กับการเรียนรู้ การสร้างทักษะ และการปรับตัวกับครอบครัวหรือเพื่อน' }
  if (midpoint < 26) return { key: 'explore', label: 'วัยทดลองเส้นทาง', guidance: 'ใช้จังหวะนี้ทดลองเส้นทาง สะสมประสบการณ์ และเรียนรู้ผลของการตัดสินใจ' }
  if (midpoint < 46) return { key: 'build', label: 'วัยสร้างฐานชีวิต', guidance: 'ใช้จังหวะนี้กับงาน ความสัมพันธ์ และการวางฐานทรัพยากรระยะยาว' }
  if (midpoint < 66) return { key: 'mature', label: 'วัยใช้ประสบการณ์', guidance: 'ใช้จังหวะนี้คัดเลือกบทบาท ถ่ายทอดความเชี่ยวชาญ และรักษาจังหวะชีวิตที่ยั่งยืน' }
  return { key: 'later', label: 'วัยส่งต่อและจัดลำดับสิ่งสำคัญ', guidance: 'ใช้จังหวะนี้กับการส่งต่อประสบการณ์ ดูแลความสัมพันธ์สำคัญ และเลือกภาระที่มีความหมาย' }
}

function buildSupportingFactors(cycle, assessment, profiles, interactions, hiddenStems) {
  const helpful = [assessment.primaryUsefulElement, assessment.supportiveElement].filter(Boolean)
  const opportunities = [...new Set(profiles.map((profile) => profile.opportunity))].join(' ')
  if (!helpful.length) {
    return `${opportunities} แต่ข้อมูลโครงสร้างพื้นดวงยังไม่เพียงพอสำหรับยืนยันธาตุที่ช่วยหนุน`
  }

  const helpfulNames = [...new Set(helpful)].map((element) => `ธาตุ${elementThai[element]}`).join('และ')
  const matches = []
  if (helpful.includes(cycle.stemElement)) matches.push(`ก้านฟ้า ${cycle.stem} เป็นธาตุ${elementThai[cycle.stemElement]}`)
  if (helpful.includes(cycle.branchElement)) matches.push(`พลังหลักของกิ่ง ${cycle.branch} เป็นธาตุ${elementThai[cycle.branchElement]}`)
  hiddenStems.filter((item) => helpful.includes(item.element) && !item.isMain)
    .forEach((item) => matches.push(`ก้านซ่อน ${item.stem} มีธาตุ${elementThai[item.element]}คอยหนุนอยู่ภายใน`))
  interactions.filter((item) => helpful.includes(item.resultElement))
    .forEach((item) => matches.push(`ความสัมพันธ์กับพื้นดวงมีทิศทางไปทางธาตุ${elementThai[item.resultElement]}`))

  return matches.length
    ? `${opportunities} จุดที่สอดคล้องกับธาตุหนุน ${helpfulNames} คือ ${[...new Set(matches)].join(' และ ')}`
    : `${opportunities} อย่างไรก็ตาม พลังที่เข้ามาในเสานี้ไม่ตรงกับธาตุหนุนหลัก คือ ${helpfulNames} โดยตรง จึงต้องอาศัยจังหวะและเงื่อนไขจากพื้นดวงช่วย`
}

function buildCautionFactors(cycle, assessment, profiles, interactions, hiddenStems) {
  const cautions = [...new Set(profiles.map((profile) => profile.risk))]
  const cautionElements = assessment.cautionElements ?? []
  const exposedCautions = []
  if (cautionElements.includes(cycle.stemElement)) exposedCautions.push(`ก้านฟ้า ${cycle.stem}`)
  if (cautionElements.includes(cycle.branchElement)) exposedCautions.push(`กิ่งดิน ${cycle.branch}`)
  hiddenStems.filter((item) => cautionElements.includes(item.element) && !item.isMain)
    .forEach((item) => exposedCautions.push(`ก้านซ่อน ${item.stem}`))
  if (exposedCautions.length) cautions.push(`${exposedCautions.join(' และ ')}นำธาตุที่พื้นดวงต้องบริหารเข้ามา`)

  const disruptive = interactions.filter((item) => ['CLASH', 'STEM_CLASH', 'PUNISHMENT', 'DESTRUCTION', 'HARM'].includes(item.type))
  if (disruptive.length) {
    const affected = [...new Set(disruptive.map((item) => item.affected).filter(Boolean))]
    cautions.push(`พบแรงเปลี่ยนแปลงหรือเสียดทานในด้าน${affected.join(' และ ')}`)
  }
  return cautions.join(' ')
}

function joinProfileText(profiles, field) {
  return [...new Set(profiles.map((profile) => profile[field]))].join(' ')
}

function joinThaiList(items) {
  if (items.length <= 1) return items[0] ?? ''
  if (items.length === 2) return `${items[0]}และ${items[1]}`
  return `${items.slice(0, -1).join(', ')} และ${items.at(-1)}`
}

function buildPublicReadings(profiles, interactions, stage) {
  const disruptiveTypes = new Set(['CLASH', 'STEM_CLASH', 'PUNISHMENT', 'DESTRUCTION', 'HARM'])
  const connectiveTypes = new Set(['STEM_COMBINATION', 'COMBINATION_2', 'TRINE', 'DIRECTIONAL'])
  const affects = (position, types) => interactions.some((item) => {
    const positions = Array.isArray(item.position) ? item.position : [item.position]
    return positions.includes(position) && (!types || types.has(item.type))
  })

  const workNotes = []
  if (stage.key === 'child') workNotes.push('ในวัยนี้ให้ดูแนวโน้มด้านนี้ผ่านการเรียน กิจกรรม และการทำงานร่วมกับผู้อื่นเป็นหลัก')
  workNotes.push(joinProfileText(profiles, 'work'))
  if (affects('month', disruptiveTypes)) workNotes.push('โครงสร้างงาน ผู้ใหญ่ หรือกติกาที่เคยใช้มีแนวโน้มต้องปรับ จึงควรเผื่อทางเลือกก่อนรับเงื่อนไขระยะยาว')
  if (affects('month', connectiveTypes)) workNotes.push('มีโอกาสเชื่อมงานเดิมเข้ากับคนหรือระบบใหม่ แต่ควรตกลงบทบาทและผลลัพธ์ให้ชัด')
  if (affects('hour', disruptiveTypes)) workNotes.push('แผนระยะยาวอาจต้องเปลี่ยนวิธีหรือแบ่งเป็นระยะสั้นขึ้น เพื่อไม่ให้เสียกำลังกับเป้าหมายที่ยังไม่นิ่ง')

  const relationshipNotes = [joinProfileText(profiles, 'relationship')]
  if (affects('day', disruptiveTypes)) relationshipNotes.push('ชีวิตส่วนตัวหรือความสัมพันธ์ใกล้ชิดมีจุดให้ปรับตัว ควรคุยเรื่องขอบเขต เวลา และความคาดหวังให้ตรงกัน')
  if (affects('day', connectiveTypes)) relationshipNotes.push('ความสัมพันธ์ใกล้ชิดมีแนวโน้มผูกพันหรือพึ่งพากันมากขึ้น จึงควรแยกความใกล้ชิดออกจากการรับภาระแทนกัน')
  if (affects('year', disruptiveTypes)) relationshipNotes.push('วงสังคมหรือสภาพแวดล้อมอาจเปลี่ยน ทำให้ต้องเลือกว่าความสัมพันธ์ใดควรรักษาและความสัมพันธ์ใดควรเว้นระยะ')

  const avoidNotes = [...new Set(profiles.map((profile) => profile.risk))]
  const changedAreas = []
  if (affects('month', disruptiveTypes)) changedAreas.push('งานและความคาดหวังจากผู้ใหญ่')
  if (affects('day', disruptiveTypes)) changedAreas.push('ชีวิตส่วนตัวและความสัมพันธ์ใกล้ชิด')
  if (affects('year', disruptiveTypes)) changedAreas.push('วงสังคมและสภาพแวดล้อม')
  if (affects('hour', disruptiveTypes)) changedAreas.push('เป้าหมายระยะยาว')
  if (changedAreas.length) avoidNotes.push(`อย่าฝืนใช้แผนเดิมเมื่อเห็นสัญญาณเปลี่ยนแปลงใน${joinThaiList(changedAreas)}`)

  const moneyOutlook = stage.key === 'child'
    ? `ในวัยนี้เรื่องเงินสะท้อนวิธีใช้สิ่งที่มีและนิสัยทางการเงินที่ได้รับจากครอบครัว มากกว่าจะหมายถึงรายได้โดยตรง ${joinProfileText(profiles, 'opportunity')} ${joinProfileText(profiles, 'risk')}`
    : joinProfileText(profiles, 'money')
  const secondaryTheme = profiles[1]?.foundation.replace(/^ฐานของช่วงนี้/, 'อีกด้านหนึ่งของช่วงนี้')

  return {
    keyThemes: `${profiles[0].visible}${secondaryTheme ? ` ${secondaryTheme}` : ''}`,
    workOutlook: workNotes.join(' '),
    moneyOutlook,
    relationshipOutlook: relationshipNotes.join(' '),
    shouldDo: `${stage.guidance} ${joinProfileText(profiles, 'action')}`,
    shouldAvoid: avoidNotes.join(' ')
  }
}

export function interpretLuckPillar(chart, assessment, cycle) {
  if (!cycle) return null

  const stemProfile = tenGodProfiles[cycle.stemTenGod]
  const branchProfile = tenGodProfiles[cycle.branchTenGod]
  const profiles = [...new Set([stemProfile, branchProfile])]
  const hiddenStems = getLuckHiddenStems(chart, cycle.branch)
  const stemInteractions = describeStemInteractions(chart, cycle)
  const branchInteractions = describeBranchInteractions(chart, cycle.branch)
  const interactionDetails = [...stemInteractions, ...branchInteractions]
  const interactions = interactionDetails.map((item) => item.text)
  const affectedPositions = [...new Set(interactionDetails.flatMap((item) => Array.isArray(item.position) ? item.position : [item.position]).filter(Boolean))]
  const stage = getLifeStage(cycle)
  const publicReadings = buildPublicReadings(profiles, interactionDetails, stage)
  const hiddenDescription = hiddenStems
    .map((item) => `${item.stem} ${tenGodThaiLabel(item.tenGod)}${item.isMain ? ' ซึ่งเป็นพลังหลัก' : ''}`)
    .join(', ')
  const interactionSummary = interactions.length
    ? interactions.join(' ')
    : 'ยังไม่พบการซ้ำ ผสาน ปะทะ ลงโทษ เบียดเบียน หรือทำลายโดยตรงระหว่างเสานี้กับพื้นดวง'
  const activatedAreas = affectedPositions.length
    ? affectedPositions.map((position) => `เสา${pillarThai[position]}: ${pillarTopics[position]}`).join(' · ')
    : `ประเด็นหลักมาจาก${stemProfile.label}และ${branchProfile.label} แต่ยังไม่มีเสาพื้นดวงตำแหน่งใดถูกกระตุ้นด้วยความสัมพันธ์โดยตรง`
  const elementFlows = Object.entries(chart.pillars).filter(([, pillar]) => Boolean(pillar)).map(([position, pillar]) =>
    `ธาตุ${elementThai[cycle.stemElement]}ของก้านจร${describeElementFlow(cycle.stemElement, pillar.element)}ธาตุ${elementThai[pillar.element]}ที่ก้านเสา${pillarThai[position]}`
  )

  return {
    ganZhi: cycle.ganZhi,
    index: cycle.index,
    isCurrent: cycle.isCurrent,
    ageRange: `${cycle.startAge}–${cycle.endAge} ปี`,
    yearRange: `${cycle.startYear}–${cycle.endYear}`,
    headline: stemProfile === branchProfile
      ? `${stemProfile.label}เป็นแกนหลักของช่วงนี้`
      : `${stemProfile.label}นำหน้า · ${branchProfile.label}เป็นฐาน`,
    summary: `ใน${stage.label} ประเด็นหลักคือ${stemProfile.label}${stemProfile !== branchProfile ? `ควบคู่กับ${branchProfile.label}` : ''}${interactions.length ? ` โดยมี ${affectedPositions.length} ด้านของชีวิตที่ต้องใส่ใจเป็นพิเศษ` : ''}`,
    incomingEnergy: `ก้านฟ้า ${cycle.stem} เป็น${tenGodThaiLabel(cycle.stemTenGod)}: ${stemProfile.visible} กิ่งดิน ${cycle.branch} เป็น${tenGodThaiLabel(cycle.branchTenGod)}: ${branchProfile.foundation} ภายในกิ่งนี้ซ่อน ${hiddenDescription}`,
    natalInteraction: interactionSummary,
    activatedAreas,
    supportingFactors: buildSupportingFactors(cycle, assessment, profiles, interactionDetails, hiddenStems),
    cautionFactors: buildCautionFactors(cycle, assessment, profiles, interactionDetails, hiddenStems),
    practicalGuidance: `${stage.guidance} ${[...new Set(profiles.map((profile) => profile.action))].join(' ')}`,
    ...publicReadings,
    interactions,
    evidence: [
      `เสาถนนสิบปี ${cycle.ganZhi}`,
      `ก้านฟ้า ${cycle.stem}: ${cycle.stemTenGodLabel}`,
      `กิ่งดิน ${cycle.branch}: ${cycle.branchTenGodLabel}`,
      `ธาตุในเสา: ${elementThai[cycle.stemElement]} และ ${elementThai[cycle.branchElement]}`,
      `ก้านซ่อนใน ${cycle.branch}: ${hiddenDescription}`,
      ...elementFlows,
      ...interactions
    ]
  }
}

export function interpretCurrentLuckPillar(chart, assessment, timeline) {
  return interpretLuckPillar(
    chart,
    assessment,
    timeline.cycles.find((item) => item.isCurrent)
  )
}

export function buildLuckPillarTimeline(chart, gender, timezoneId, now = new Date()) {
  const start = parseEngineDate(chart.daYun.startDate)
  const currentKey = dateKey(todayInTimezone(now, timezoneId))
  const direction = chart.daYun.isForward ? 'เดินหน้า' : 'เดินถอยหลัง'
  const yearPolarity = chart.pillars.year.stemPolarity

  const cycles = chart.daYun.cycles.map((cycle, index) => {
    const cycleStart = start
      ? dateKey({ ...start, year: start.year + index * 10 })
      : cycle.startYear * 10000 + 101
    const nextCycleStart = start
      ? dateKey({ ...start, year: start.year + (index + 1) * 10 })
      : (cycle.endYear + 1) * 10000 + 101

    const stemProfile = tenGodProfiles[cycle.stemTenGod]
    const branchProfile = tenGodProfiles[cycle.branchTenGod]
    return {
      ...cycle,
      isCurrent: currentKey >= cycleStart && currentKey < nextCycleStart,
      stemElement: STEM_TO_ELEMENT[cycle.stem],
      branchElement: BRANCH_TO_ELEMENT[cycle.branch],
      stemDescription: `${elementThai[STEM_TO_ELEMENT[cycle.stem]]} ${polarityThai[STEM_TO_POLARITY[cycle.stem]]}`,
      branchDescription: `${branchThai[cycle.branch]} · ${elementThai[BRANCH_TO_ELEMENT[cycle.branch]]}`,
      stemTenGodLabel: tenGodThaiLabel(cycle.stemTenGod),
      branchTenGodLabel: tenGodThaiLabel(cycle.branchTenGod),
      publicTitle: stemProfile === branchProfile
        ? stemProfile.label
        : `${stemProfile.label} · ${branchProfile.label}`,
      publicSummary: stemProfile === branchProfile
        ? 'เรื่องนี้เป็นแกนหลักตลอดช่วง'
        : 'สองเรื่องนี้ทำงานควบคู่กันในช่วงเดียวกัน'
    }
  })

  return {
    direction,
    directionReason: `ก้านปี ${chart.pillars.year.stem} เป็น${polarityThai[yearPolarity]} และเพศ${genderThai[gender]} จึง${direction}`,
    startAgeLabel: formatLuckStartOffset(chart.daYun.startOffset),
    startDateLabel: formatLuckStartDate(chart.daYun.startDate),
    cycles
  }
}
