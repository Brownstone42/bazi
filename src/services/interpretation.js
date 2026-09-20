import { calculateTenGod } from '@openfate/bazi-engine'
import { assessDayMasterStrength } from './strength-engine.js'
import {
  DAY_MASTER_MATRIX_VERSION,
  getDayMasterStrengthReading,
  strengthLevelLabels
} from './day-master-strength-matrix.js'

const tenGodGroups = {
  self: ['比肩', '劫财'],
  output: ['食神', '伤官'],
  wealth: ['正财', '偏财'],
  power: ['正官', '七杀'],
  resource: ['正印', '偏印']
}

export const groupInsights = {
  self: {
    label: 'พลังตัวตนและคนรอบตัว',
    strength: 'โครงสร้างดวงเน้นความเป็นตัวของตัวเอง การลงมือด้วยแรงของตน และการทำงานร่วมกับคนระดับเดียวกัน',
    action: 'กำหนดบทบาทและขอบเขตกับคนรอบตัวให้ชัด เพื่อให้การแข่งขันกลายเป็นแรงสนับสนุน'
  },
  output: {
    label: 'พลังการแสดงออกและผลงาน',
    strength: 'โครงสร้างดวงเน้นการสื่อสาร ความคิดสร้างสรรค์ และการเปลี่ยนความสามารถให้เป็นผลงานที่คนอื่นมองเห็น',
    action: 'เลือกพื้นที่ที่เปิดให้เสนอความคิด และพิจารณาความพร้อมของผู้ฟังก่อนสื่อสารอย่างตรงไปตรงมา'
  },
  wealth: {
    label: 'พลังผลลัพธ์และทรัพยากร',
    strength: 'โครงสร้างดวงเน้นผลลัพธ์ที่จับต้องได้ การบริหารทรัพยากร และการมองเห็นโอกาสจากผู้คนหรือสถานการณ์',
    action: 'ตั้งเกณฑ์เลือกโอกาสและงบประมาณล่วงหน้า เพื่อไม่ให้ความต้องการผลลัพธ์ทำให้คุณทุ่มเทไปหลายทางพร้อมกัน'
  },
  power: {
    label: 'พลังมาตรฐานและความรับผิดชอบ',
    strength: 'โครงสร้างดวงเน้นหน้าที่ มาตรฐาน การตัดสินใจภายใต้แรงกดดัน และความสัมพันธ์กับกฎหรือผู้มีอำนาจ',
    action: 'ใช้โครงสร้างและเป้าหมายที่ชัด แต่เผื่อพื้นที่สำหรับการทดลองและความไม่สมบูรณ์แบบ'
  },
  resource: {
    label: 'พลังการเรียนรู้และการสนับสนุน',
    strength: 'โครงสร้างดวงเน้นการเรียนรู้ การประมวลข้อมูล และการเติบโตผ่านความรู้ ผู้สนับสนุน หรือประสบการณ์สะสม',
    action: 'กำหนดจุดที่ต้องหยุดศึกษาและเริ่มลงมือ เพื่อให้ความเข้าใจเปลี่ยนเป็นผลลัพธ์จริง'
  }
}

const elementLabels = { wood: 'ไม้', fire: 'ไฟ', earth: 'ดิน', metal: 'ทอง', water: 'น้ำ' }

const lifeRoleProfiles = {
  比肩: {
    label: 'ความเป็นตัวของตัวเอง',
    social: 'คุณมักคบคนแบบเท่าเทียมและไม่ชอบให้ใครก้าวก่ายการตัดสินใจ ความสัมพันธ์ที่ดีจึงต้องเคารพพื้นที่ของกันและกัน',
    work: 'คุณทำงานได้ดีเมื่อมีอิสระรับผิดชอบงานของตนและเห็นผลจากสิ่งที่ลงมือเอง',
    home: 'ในบ้านคุณต้องการความเท่าเทียมและพื้นที่ส่วนตัว การแบ่งหน้าที่ชัดช่วยลดการแข่งกันโดยไม่ตั้งใจ',
    future: 'คุณอยากสร้างสิ่งที่ยืนได้ด้วยตัวเองและมีชื่อของคุณอยู่ในผลงาน',
    money: 'เหมาะกับรายได้ที่ผูกกับฝีมือหรือผลงานของตนเอง และควรแยกเงินส่วนตัวจากเงินที่ใช้ร่วมกับคนอื่น',
    roles: ['เจ้าของกิจการขนาดเล็ก', 'ที่ปรึกษาอิสระ', 'หัวหน้าโครงการ', 'ผู้เชี่ยวชาญเฉพาะด้าน'],
    environment: 'องค์กรที่ให้สิทธิ์ตัดสินใจและวัดผลงานชัด มากกว่าสั่งทุกขั้นตอน',
    do: 'ตั้งขอบเขตและเจ้าของงานให้ชัด',
    avoid: 'รับทุกอย่างมาทำเองหรือปฏิเสธความช่วยเหลือเพียงเพราะต้องการพิสูจน์ตนเอง'
  },
  劫财: {
    label: 'การร่วมมือและการแข่งขัน',
    social: 'ชีวิตมักเดินหน้าเร็วเมื่อมีเพื่อนร่วมทาง แต่คนใกล้ตัวก็อาจกลายเป็นคู่แข่งได้หากผลประโยชน์และเครดิตไม่ชัด',
    work: 'เด่นในงานที่ต้องเข้าหาผู้คน แข่งขัน เจรจา หรือดึงคนหลายฝ่ายมาร่วมเป้าหมายเดียวกัน',
    home: 'คนรอบตัวมีอิทธิพลต่อการตัดสินใจสูง จึงควรแยกความสนิทออกจากเรื่องเงินและหน้าที่',
    future: 'ผลงานระยะยาวเติบโตผ่านทีม หุ้นส่วน หรือชุมชน มากกว่าการทำคนเดียวทั้งหมด',
    money: 'เงินมีโอกาสหมุนผ่านหุ้นส่วน เพื่อน หรือค่าใช้จ่ายร่วม จึงต้องตกลงส่วนแบ่งและสิทธิให้ชัดก่อนเริ่ม',
    roles: ['พัฒนาธุรกิจ', 'ฝ่ายขาย', 'ผู้จัดการชุมชน', 'นายหน้า', 'นักสรรหาบุคลากร'],
    environment: 'ทีมที่คล่องตัว มีเป้าหมายร่วม และมีกติกาเรื่องผลงานกับผลตอบแทนชัดเจน',
    do: 'เลือกทีมจากความสามารถที่เสริมกันและทำข้อตกลงเป็นลายลักษณ์อักษร',
    avoid: 'ใช้ความไว้ใจแทนข้อตกลงหรือรับความเสี่ยงทางการเงินแทนคนอื่น'
  },
  食神: {
    label: 'การสร้างผลงานอย่างต่อเนื่อง',
    social: 'ผู้คนมักเข้าหาคุณเมื่อบรรยากาศผ่อนคลายและได้แลกเปลี่ยนความรู้หรือความสามารถกัน',
    work: 'เด่นด้านการสร้าง อธิบาย สอน และพัฒนางานให้ดีขึ้นทีละขั้น เหมาะกับงานที่ได้ใช้ฝีมือจริง',
    home: 'บ้านที่ดีสำหรับคุณควรมีความสบายใจ มีเวลาร่วมกัน และไม่เร่งทุกเรื่องให้เป็นการแข่งขัน',
    future: 'สิ่งที่คุณสร้างมีแนวโน้มเติบโตจากการฝึกซ้ำ ถ่ายทอด และค่อย ๆ สะสมผู้ติดตามหรือผู้ใช้',
    money: 'รายได้เหมาะกับการเติบโตจากทักษะ เนื้อหา หรือผลงานที่ทำซ้ำได้ มากกว่าการเสี่ยงหวังผลเร็ว',
    roles: ['ครูหรือวิทยากร', 'ผู้ผลิตคอนเทนต์', 'นักเขียน', 'นักออกแบบ', 'ผู้พัฒนาผลิตภัณฑ์'],
    environment: 'ที่ทำงานที่ให้เวลาแก่งานคุณภาพและเปิดให้ถ่ายทอดความรู้',
    do: 'เลือกผลงานหลักและสร้างระบบทำซ้ำอย่างสม่ำเสมอ',
    avoid: 'ทำหลายสิ่งที่ชอบพร้อมกันจนไม่มีผลงานใดเสร็จ'
  },
  伤官: {
    label: 'การคิดต่างและแก้ปัญหา',
    social: 'คุณเห็นจุดที่ควรปรับได้ไวและมักพูดตรง คนรอบตัวจะช่วยคุณได้มากเมื่อทุกฝ่ายรับฟังเหตุผลกันโดยไม่ถือเรื่องลำดับชั้น',
    work: 'เด่นด้านวิเคราะห์ข้อบกพร่อง ตั้งคำถามกับวิธีเดิม และสร้างทางเลือกใหม่ที่ใช้งานได้จริง',
    home: 'คุณต้องการความสัมพันธ์ที่พูดความจริงกันได้ แต่ควรระวังให้อีกฝ่ายรู้สึกเหมือนถูกตรวจหรือถูกแก้ไขตลอดเวลา',
    future: 'คุณอยากทิ้งผลงานที่เปลี่ยนวิธีคิดหรือทำให้ระบบเดิมทำงานดีขึ้น',
    money: 'หาเงินจากความคิดและความสามารถเฉพาะได้ดี แต่ไม่ควรเสี่ยงเพียงเพราะต้องการพิสูจน์ว่าตนคิดถูก',
    roles: ['นักวางกลยุทธ์', 'ที่ปรึกษา', 'นักออกแบบผลิตภัณฑ์', 'วิศวกรแก้ปัญหา', 'นักเขียนโฆษณา'],
    environment: 'องค์กรที่รับฟังข้อเสนอใหม่และตัดสินจากผลงาน ไม่ยึดลำดับชั้นมากเกินไป',
    do: 'เสนอวิธีแก้พร้อมข้อมูล ผลกระทบ และทางเลือก',
    avoid: 'วิจารณ์ก่อนเข้าใจข้อจำกัดหรือสื่อสารตรงจนคนฟังปิดรับ'
  },
  偏财: {
    label: 'โอกาสจากผู้คนและตลาด',
    social: 'คุณมักมองเห็นโอกาสผ่านผู้คนและเชื่อมต่อคนต่างกลุ่มได้ การรู้จักผู้คนจากหลายวงการจึงเป็นข้อได้เปรียบสำคัญ',
    work: 'เด่นในงานขาย เจรจา ลูกค้าสัมพันธ์ และธุรกิจที่ต้องอ่านสถานการณ์แล้วตัดสินใจให้ทัน',
    home: 'คุณต้องการความยืดหยุ่นและพื้นที่พบผู้คน แต่ควรทำให้อีกฝ่ายมั่นใจว่าเวลาหรือความสนใจไม่ได้ถูกแบ่งจนเกินไป',
    future: 'เป้าหมายมักขยายจากโอกาสใหม่ ตลาดใหม่ หรือคนที่พาไปเห็นทางเลือกที่ไม่เคยคิดไว้',
    money: 'มีโอกาสสร้างรายได้หลายทาง แต่กระแสเงินอาจไม่นิ่ง จึงควรกำหนดเงินสำรองและวงเงินเสี่ยงก่อนรับโอกาส',
    roles: ['ฝ่ายขายองค์กร', 'ผู้จัดการลูกค้า', 'พัฒนาธุรกิจ', 'ผู้ประกอบการ', 'นักการตลาด'],
    environment: 'งานที่ได้พบคน เจรจา และปรับแผนตามตลาด โดยมีขอบเขตความเสี่ยงชัด',
    do: 'ตั้งเกณฑ์เลือกลูกค้า โอกาส และวงเงินก่อนตัดสินใจ',
    avoid: 'รับทุกโอกาสเพราะกลัวพลาดหรือประเมินรายรับจากกรณีดีที่สุด'
  },
  正财: {
    label: 'ความมั่นคงและการจัดการทรัพยากร',
    social: 'ผู้คนเชื่อใจคุณจากความสม่ำเสมอและการรับผิดชอบสิ่งที่ตกลงกันไว้ มากกว่าคำพูดที่หวือหวา',
    work: 'เด่นในงานที่มีเป้าหมาย ตัวเลข กระบวนการ และผลลัพธ์ชัด สามารถดูแลรายละเอียดให้ระบบเดินต่อเนื่องได้',
    home: 'คุณให้ความสำคัญกับความมั่นคงและดูแลคนใกล้ตัวผ่านการลงมือทำ แต่ไม่ควรใช้ความรับผิดชอบเป็นเหตุควบคุมกัน',
    future: 'คุณต้องการสร้างฐานที่จับต้องได้ เช่น ทรัพย์สิน ระบบงาน หรือกิจการที่ดำเนินต่อได้',
    money: 'เหมาะกับรายได้สม่ำเสมอ การจัดงบ และการสะสมสินทรัพย์อย่างเป็นขั้นตอน',
    roles: ['นักบัญชี', 'นักวางแผนการเงิน', 'ฝ่ายปฏิบัติการ', 'จัดซื้อ', 'ผู้ประสานโครงการ'],
    environment: 'องค์กรที่มีเป้าหมายและหน้าที่ชัด พร้อมข้อมูลให้ติดตามผล',
    do: 'ทำรายรับ รายจ่าย ภาระ และผลตอบแทนให้มองเห็นได้',
    avoid: 'ยึดความมั่นคงจนไม่ยอมเปลี่ยนสิ่งที่หมดประโยชน์แล้ว'
  },
  七杀: {
    label: 'การตัดสินใจภายใต้แรงกดดัน',
    social: 'คุณรับรู้แรงกดดันและการแข่งขันรอบตัวได้ไว จึงควรเลือกคบคนที่ตรงไปตรงมาและเคารพขอบเขต',
    work: 'เด่นเมื่อเจอโจทย์ยาก งานเร่ง หรือสถานการณ์ที่ต้องตัดสินใจเด็ดขาดภายใต้ข้อจำกัด',
    home: 'แรงกดดันจากภายนอกอาจทำให้ใจร้อนหรือป้องกันตัวในบ้าน ควรมีช่วงเปลี่ยนโหมดก่อนคุยเรื่องสำคัญ',
    future: 'คุณมีแรงผลักให้สร้างความสามารถและความมั่นคงจากการผ่านโจทย์ที่คนอื่นหลีกเลี่ยง',
    money: 'ไม่ควรตัดสินใจเรื่องเงินเพราะถูกเร่งหรือกลัวพลาด ต้องรู้ผลเสียสูงสุดและจุดหยุดก่อนเสี่ยง',
    roles: ['ผู้จัดการเหตุฉุกเฉิน', 'หัวหน้าฝ่ายปฏิบัติการ', 'ผู้บริหารโครงการยาก', 'งานภาคสนาม', 'งานตรวจสอบ'],
    environment: 'งานท้าทายที่มีอำนาจตัดสินใจ ขอบเขต และระบบสนับสนุนชัด',
    do: 'แยกเรื่องเร่งด่วนจากเรื่องสำคัญและกำหนดจุดหยุด',
    avoid: 'รับความเสี่ยงโดยไม่มีข้อมูลหรือทำงานในภาวะตึงเครียดต่อเนื่องโดยไม่พัก'
  },
  正官: {
    label: 'ความรับผิดชอบและมาตรฐาน',
    social: 'ภาพที่คนอื่นเห็นคือความน่าเชื่อถือและการรู้หน้าที่ คุณมักได้รับความไว้วางใจเมื่อรักษามาตรฐานได้สม่ำเสมอ',
    work: 'เด่นในระบบที่มีหน้าที่ กฎ และเส้นทางความก้าวหน้าชัด เหมาะกับการดูแลมาตรฐานและรับผิดชอบคนหรือผลลัพธ์',
    home: 'คุณจริงจังกับสถานะและหน้าที่ในความสัมพันธ์ จึงควรคุยความคาดหวังแทนการคิดว่าอีกฝ่ายควรรู้เอง',
    future: 'คุณต้องการสร้างชื่อจากความน่าเชื่อถือ ตำแหน่ง หรือมาตรฐานที่คนอื่นยอมรับ',
    money: 'เหมาะกับแผนการเงินเป็นระบบและความเสี่ยงต่ำ แต่ควรระวังค่าใช้จ่ายเพื่อรักษาภาพลักษณ์หรือหน้าที่',
    roles: ['ผู้จัดการ', 'ข้าราชการ', 'งานกำกับดูแล', 'งานกฎหมาย', 'ประกันคุณภาพ'],
    environment: 'องค์กรที่กติกาชัด ให้ความก้าวหน้าตามผลงาน และผู้บริหารรับผิดชอบต่อคำตัดสินใจ',
    do: 'ทำความคาดหวัง อำนาจตัดสินใจ และเกณฑ์วัดผลงานให้ชัด',
    avoid: 'แบกมาตรฐานทุกเรื่องหรือกลัวผิดจนไม่กล้าตัดสินใจ'
  },
  偏印: {
    label: 'ความรู้เฉพาะและการมองต่างมุม',
    social: 'คุณมักเชื่อมกับคนผ่านความสนใจเฉพาะหรือการแลกเปลี่ยนมุมมองที่คนทั่วไปไม่ค่อยพูดถึง',
    work: 'เด่นในงานวิจัย วิเคราะห์ เทคโนโลยี และงานเฉพาะทางที่ต้องหาคำตอบจากข้อมูลไม่สมบูรณ์',
    home: 'คุณต้องการเวลาอยู่กับความคิดของตนเอง การบอกว่าต้องการพื้นที่จะดีกว่าหายไปจนคนใกล้ตัวตีความเอง',
    future: 'คุณอยากสร้างองค์ความรู้ วิธีการ หรือเครื่องมือเฉพาะที่แก้ปัญหาได้ต่างจากคนอื่น',
    money: 'รายได้มีโอกาสมาจากความเชี่ยวชาญเฉพาะ แต่ควรทดสอบว่าตลาดต้องการก่อนลงทุนเต็มกำลัง',
    roles: ['นักวิเคราะห์ข้อมูล', 'นักวิจัย', 'นักพัฒนาซอฟต์แวร์', 'ที่ปรึกษาเฉพาะทาง', 'นักออกแบบระบบ'],
    environment: 'ทีมขนาดพอดีที่ให้เวลาคิด ทดลอง และตัดสินจากคุณภาพของคำตอบ',
    do: 'ตั้งคำถามให้ชัดและทดลองทีละสมมติฐาน',
    avoid: 'เก็บข้อมูลไม่จบ เปลี่ยนกรอบคิดบ่อย หรือแยกตัวจนขาดข้อมูลจากคนใช้งานจริง'
  },
  正印: {
    label: 'การเรียนรู้และแรงสนับสนุน',
    social: 'คุณเติบโตผ่านผู้รู้ ผู้สนับสนุน และความสัมพันธ์ที่ให้ความปลอดภัยทางใจ แต่ต้องรักษาความสามารถในการตัดสินใจเอง',
    work: 'เด่นด้านเรียนรู้ ถ่ายทอด ดูแลมาตรฐานความรู้ เอกสาร และระบบสนับสนุนเบื้องหลัง',
    home: 'คุณให้คุณค่ากับการดูแลและความเข้าใจ แต่ควรระวังการช่วยกันมากจนอีกฝ่ายไม่ได้รับผิดชอบชีวิตของตนเอง',
    future: 'คุณต้องการส่งต่อความรู้ ประสบการณ์ หรือระบบที่ช่วยให้คนรุ่นต่อไปเริ่มต้นได้ง่ายขึ้น',
    money: 'เหมาะกับการลงทุนในความรู้และสร้างฐานมั่นคง แต่อย่าเตรียมตัวนานจนยังไม่มีรายได้หรือผลงานจริง',
    roles: ['ครูหรืออาจารย์', 'นักวิจัย', 'ที่ปรึกษา', 'พัฒนาบุคลากร', 'นักเขียนเอกสารความรู้'],
    environment: 'องค์กรที่ให้การเรียนรู้ มีพี่เลี้ยง และเห็นคุณค่าของงานสนับสนุนคุณภาพ',
    do: 'กำหนดว่าความรู้ทุกชิ้นจะนำไปใช้สร้างผลลัพธ์อะไร',
    avoid: 'รอความพร้อมสมบูรณ์หรือพึ่งคำยืนยันจากผู้รู้นานเกินไป'
  }
}

export const usefulElementActions = {
  wood: {
    work: 'งานจะไหลลื่นขึ้นเมื่อมีพื้นที่ให้เรียนรู้ วางแผนการเติบโต และพัฒนาคนหรือกระบวนการอย่างต่อเนื่อง',
    relationship: 'ความสัมพันธ์ดีขึ้นเมื่อใช้คำถาม เปิดพื้นที่ให้อีกฝ่ายเติบโต และคุยกันถึงทิศทางในระยะยาว',
    balance: 'เสริมพลังไม้ผ่านการเรียนรู้ การวางแผน และการลงมือทีละขั้นอย่างมีทิศทาง'
  },
  fire: {
    work: 'งานจะไหลลื่นขึ้นเมื่อสื่อสารเป้าหมายให้เห็นภาพ สร้างแรงจูงใจร่วมกัน และทำให้ผลงานสำคัญได้รับการมองเห็น',
    relationship: 'ความสัมพันธ์ดีขึ้นเมื่อแสดงความรู้สึกและความชื่นชมให้ชัด ไม่ปล่อยให้อีกฝ่ายต้องตีความเอง',
    balance: 'เสริมพลังไฟผ่านการสื่อสาร ความอบอุ่น และการนำสิ่งสำคัญออกมาให้เห็นอย่างเหมาะกับจังหวะ'
  },
  earth: {
    work: 'งานจะไหลลื่นขึ้นเมื่อมีขั้นตอน ขอบเขตความรับผิดชอบ และการติดตามผลที่สม่ำเสมอ',
    relationship: 'ความสัมพันธ์ดีขึ้นเมื่อสร้างความไว้ใจผ่านความสม่ำเสมอ การรักษาคำพูด และข้อตกลงที่ชัดเจน',
    balance: 'เสริมพลังดินผ่านกิจวัตร ระบบ และการทำสิ่งสำคัญให้มั่นคงก่อนรับเรื่องใหม่'
  },
  metal: {
    work: 'งานจะไหลลื่นขึ้นเมื่อจัดลำดับความสำคัญ กำหนดมาตรฐาน และตัดสิ่งที่ไม่จำเป็นออก',
    relationship: 'ความสัมพันธ์ดีขึ้นเมื่อกำหนดขอบเขตและความคาดหวังให้ชัด พร้อมเลือกถ้อยคำที่ตรงแต่ไม่บาดคนฟัง',
    balance: 'เสริมพลังทองผ่านวินัย การตัดสินใจ และการรักษาขอบเขตที่จำเป็น'
  },
  water: {
    work: 'งานจะไหลลื่นขึ้นเมื่อเริ่มจากข้อมูล รับฟังหลายฝ่าย และเผื่อทางเลือกให้ปรับตามสถานการณ์',
    relationship: 'ความสัมพันธ์ดีขึ้นเมื่อฟังเพื่อเข้าใจ เว้นจังหวะก่อนตอบ และยอมให้บทสนทนาเคลื่อนไปอย่างเป็นธรรมชาติ',
    balance: 'เสริมพลังน้ำผ่านการรับฟัง การเก็บข้อมูล และการปรับวิธีโดยไม่เสียเป้าหมายหลัก'
  }
}

export const interpretationFallbacks = {
  work: 'ควรพิจารณาโครงสร้างพิเศษเพิ่มเติมก่อนให้คำแนะนำเรื่องวิธีเสริมพลัง',
  relationship: 'ในช่วงนี้ควรเน้นการสื่อสารตรง ๆ และตรวจสอบความต้องการของทั้งสองฝ่ายก่อนใช้คำแนะนำตามธาตุ'
}

export const INTERPRETATION_METHODOLOGY = 'คำอ่านใช้ Matrix ดิถีร่วมกับกำลังของดิถี แล้วจึงพิจารณาธาตุให้คุณ ธาตุสนับสนุน และกลุ่มสิบเทพที่เด่น โดยแปลงธาตุเป็นแนวทางพฤติกรรม ไม่ใช่การรับรองเหตุการณ์หรือผลลัพธ์'

function getTenGodGroup(tenGod) {
  return Object.entries(tenGodGroups).find(([, gods]) => gods.includes(tenGod))?.[0]
}

function scoreChart(chart) {
  const groups = { self: 0, output: 0, wealth: 0, power: 0, resource: 0 }
  const elements = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 }

  Object.values(chart.pillars).filter(Boolean).forEach((pillar) => {
    elements[pillar.element] += 2
    const stemGroup = getTenGodGroup(pillar.stemTenGod)
    if (stemGroup) groups[stemGroup] += 2

    pillar.hiddenStems.forEach((hidden) => {
      const weight = hidden.isMain ? 1 : 0.5
      elements[hidden.element] += weight
      const hiddenGroup = getTenGodGroup(hidden.tenGod)
      if (hiddenGroup) groups[hiddenGroup] += weight
    })
  })

  return { groups, elements }
}

function largestEntry(scores) {
  return Object.entries(scores).sort((a, b) => b[1] - a[1])[0]
}

function uniqueProfiles(items) {
  return [...new Set(items.filter(Boolean))]
}

function profilesForPillar(chart, pillar) {
  if (!pillar) return []
  const hiddenProfiles = pillar.hiddenStems
    .map((hidden) => lifeRoleProfiles[calculateTenGod(chart.dayMaster.char, hidden.stem)])
  return uniqueProfiles([lifeRoleProfiles[pillar.stemTenGod], ...hiddenProfiles]).slice(0, 3)
}

function joinProfileField(profiles, field) {
  return [...new Set(profiles.map((profile) => profile[field]).filter(Boolean))].join(' ')
}

function interactionNote(chart, position, subject) {
  const related = chart.interactions.filter((item) => item.pillars.includes(position))
  const hasChange = related.some((item) => ['CLASH', 'PUNISHMENT', 'DESTRUCTION', 'HARM'].includes(item.type))
  const hasConnection = related.some((item) => ['COMBINATION_2', 'TRINE', 'DIRECTIONAL'].includes(item.type))
  if (hasChange && hasConnection) return `${subject}เชื่อมกับด้านอื่นของชีวิตมากและมีจุดให้ปรับเป็นระยะ การตัดสินใจเรื่องหนึ่งจึงมักกระทบอีกเรื่อง ควรคุยเงื่อนไขให้ชัดก่อนเปลี่ยนแผน`
  if (hasChange) return `${subject}มีจุดเสียดทานที่ผลักให้คุณต้องปรับตัว คุณจึงได้ผลดีเมื่อคุยเงื่อนไขให้ชัดและยอมเปลี่ยนวิธีตามสถานการณ์`
  if (hasConnection) return `${subject}เชื่อมโยงกับคนหรือด้านอื่นของชีวิตค่อนข้างมาก การตัดสินใจเรื่องหนึ่งจึงมักส่งผลต่ออีกเรื่องตามมา`
  return ''
}

function rankCareerProfiles(chart, assessment) {
  const scores = Object.fromEntries(Object.keys(lifeRoleProfiles).map((god) => [god, 0]))
  const positionWeights = { year: 1, month: 4, day: 1, hour: 2 }
  const helpful = new Set([assessment.primaryUsefulElement, assessment.supportiveElement].filter(Boolean))
  const caution = new Set(assessment.cautionElements ?? [])

  Object.entries(chart.pillars).filter(([, pillar]) => Boolean(pillar)).forEach(([position, pillar]) => {
    if (lifeRoleProfiles[pillar.stemTenGod]) {
      const adjustment = helpful.has(pillar.element) ? 1.35 : caution.has(pillar.element) ? 0.8 : 1
      scores[pillar.stemTenGod] += positionWeights[position] * adjustment
    }
    pillar.hiddenStems.forEach((hidden, index) => {
      const god = calculateTenGod(chart.dayMaster.char, hidden.stem)
      if (!lifeRoleProfiles[god]) return
      const base = positionWeights[position] * (hidden.isMain ? 0.8 : index === 1 ? 0.35 : 0.2)
      const adjustment = helpful.has(hidden.element) ? 1.35 : caution.has(hidden.element) ? 0.8 : 1
      scores[god] += base * adjustment
    })
  })

  return Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([god]) => lifeRoleProfiles[god])
}

function buildCareerFit(chart, assessment, dayProfile) {
  const ranked = rankCareerProfiles(chart, assessment)
  const roles = [...new Set(ranked.flatMap((profile) => profile.roles))].slice(0, 6)
  return {
    ranked,
    roles,
    summary: `${joinProfileField(ranked, 'work')} เมื่อเทียบกับรูปแบบตัวตนแล้ว ${dayProfile.work}`,
    environment: joinProfileField(ranked.slice(0, 2), 'environment'),
    shouldDo: joinProfileField(ranked.slice(0, 2), 'do'),
    shouldAvoid: joinProfileField(ranked.slice(0, 2), 'avoid')
  }
}

const wellbeingPatterns = {
  wood: 'คุณมีแนวโน้มใช้พลังกับการวางแผน การพัฒนา และการรับเป้าหมายใหม่ จึงควรปิดงานเดิมให้จบก่อนเพิ่มสิ่งที่ต้องดูแล',
  fire: 'คุณมีแนวโน้มใช้พลังกับการสื่อสาร ผู้คน และการทำให้สิ่งต่าง ๆ เดินหน้า จึงควรมีช่วงที่ไม่ต้องตอบสนองใครเพื่อให้ใจได้พัก',
  earth: 'คุณมีแนวโน้มรับภาระและรักษาความต่อเนื่องได้นาน แต่เมื่อแบกหลายเรื่องพร้อมกันอาจไม่รู้ตัวว่าความล้าสะสม',
  metal: 'คุณมีแนวโน้มใช้พลังกับมาตรฐาน การตัดสินใจ และการควบคุมรายละเอียด จึงควรแยกสิ่งที่ต้องสมบูรณ์ออกจากสิ่งที่เพียงพอแล้ว',
  water: 'คุณมีแนวโน้มใช้พลังกับการคิด รับข้อมูล และปรับตัวตามสถานการณ์ จึงควรกำหนดเวลาหยุดคิดและกลับมาอยู่กับกิจวัตรที่แน่นอน'
}

const wellbeingAvoidance = {
  wood: 'เริ่มเป้าหมายใหม่ก่อนปิดงานเดิม หรือเพิ่มสิ่งที่ต้องรับผิดชอบจนไม่มีเวลาฟื้นกำลัง',
  fire: 'ตอบสนองคนรอบตัวตลอดเวลา รับนัดต่อเนื่อง หรือปล่อยให้ความคึกคักรบกวนเวลาพัก',
  earth: 'รับภาระของทุกคนไว้เอง ทำงานต่อเพราะคิดว่ายังไหว หรือรอจนความล้าสะสมจึงยอมหยุด',
  metal: 'กดดันตนเองให้ทุกอย่างสมบูรณ์ ควบคุมรายละเอียดทุกเรื่อง หรือใช้เวลาพักไปกับการตรวจงานซ้ำ',
  water: 'คิดวนหรือรับข้อมูลต่อเนื่องจนดึก เปลี่ยนเวลานอนบ่อย หรือปล่อยให้กิจวัตรขึ้นอยู่กับสถานการณ์แต่ละวัน'
}

function buildLifeAreas(chart, assessment, dayProfile, scores) {
  const socialProfiles = profilesForPillar(chart, chart.pillars.year)
  const workProfiles = profilesForPillar(chart, chart.pillars.month)
  const homeProfiles = profilesForPillar(chart, chart.pillars.day)
  const futureProfiles = profilesForPillar(chart, chart.pillars.hour)
  const career = buildCareerFit(chart, assessment, dayProfile)
  const [dominantElement] = largestEntry(scores.elements)
  const needsSupport = ['weak', 'very_weak'].includes(assessment.strengthLevel)
  const wellbeingLead = needsSupport
    ? 'คุณทำได้ดีขึ้นเมื่อมีจังหวะพัก คนช่วยคิด และขอบเขตภาระที่ชัด การฝืนรับทุกเรื่องพร้อมกันทำให้กำลังตกได้ง่าย'
    : 'คุณมีแรงขับและรับภาระต่อเนื่องได้ดี แต่ควรระวังใช้จุดแข็งเดิมซ้ำจนไม่มีช่วงฟื้นตัว'
  const wellbeingSupportAvoidance = needsSupport
    ? 'ฝืนจัดการทุกอย่างคนเดียวหรือรับภาระเพิ่มในช่วงที่กำลังยังไม่ฟื้น รวมถึง'
    : 'ใช้กำลังที่มีจนเต็มต่อเนื่องโดยไม่เผื่อเวลาพัก รวมถึง'

  return [
    {
      id: 'social-world', icon: 'pi-users', title: 'คนรอบตัว ญาติ และภูมิหลัง',
      verdict: socialProfiles.map((profile) => profile.label).join(' · '),
      text: `${joinProfileField(socialProfiles, 'social')} ${interactionNote(chart, 'year', 'เรื่องคนรอบตัวและสภาพแวดล้อม')}`,
      shouldDo: 'เลือกคบคนที่เคารพขอบเขตและคุยเรื่องหน้าที่ เงิน หรือผลประโยชน์กันได้ตรงไปตรงมา',
      shouldAvoid: 'ใช้ความสนิทแทนข้อตกลง รับภาระของญาติโดยไม่มีขอบเขต หรืออยู่ในวงที่ต้องแข่งขันกันตลอดเวลา'
    },
    {
      id: 'career-path', icon: 'pi-briefcase', title: 'งาน องค์กร และอาชีพที่เหมาะ',
      verdict: `อาชีพที่เด่นที่สุด: ${career.roles.slice(0, 3).join(' · ')}`,
      text: `${career.summary} ${interactionNote(chart, 'month', 'เรื่องงาน ผู้ใหญ่ และโครงสร้างชีวิต')}`,
      recommendations: career.roles,
      environment: career.environment,
      shouldDo: career.shouldDo,
      shouldAvoid: career.shouldAvoid
    },
    {
      id: 'money-style', icon: 'pi-wallet', title: 'การเงินและวิธีสร้างรายได้',
      verdict: workProfiles.map((profile) => profile.label).join(' · '),
      text: `${joinProfileField(workProfiles, 'money')} ${dayProfile.finance}`,
      shouldDo: joinProfileField(workProfiles.slice(0, 2), 'do'),
      shouldAvoid: joinProfileField(workProfiles.slice(0, 2), 'avoid')
    },
    {
      id: 'home-partner', icon: 'pi-heart', title: 'บ้าน ชีวิตส่วนตัว และคู่ครอง',
      verdict: homeProfiles.map((profile) => profile.label).join(' · '),
      text: `${joinProfileField(homeProfiles, 'home')} ${dayProfile.relationship} ${interactionNote(chart, 'day', 'เรื่องบ้านและความสัมพันธ์ใกล้ชิด')}`,
      shouldDo: 'คุยเรื่องเวลา เงิน งานบ้าน พื้นที่ส่วนตัว และความคาดหวังให้ชัดก่อนสะสมเป็นความไม่พอใจ',
      shouldAvoid: 'เดาใจ แก้ปัญหาแทนอีกฝ่ายทุกเรื่อง หรือนำความกดดันจากภายนอกกลับมาตัดสินคนในบ้าน'
    },
    {
      id: 'future-output', icon: 'pi-flag', title: 'เป้าหมาย ลูกน้อง ลูกหลาน และสิ่งที่อยากสร้าง',
      verdict: futureProfiles.map((profile) => profile.label).join(' · '),
      text: `${joinProfileField(futureProfiles, 'future')} ${interactionNote(chart, 'hour', 'เรื่องเป้าหมายและสิ่งที่ต้องการส่งต่อ')}`,
      shouldDo: 'เลือกเป้าหมายระยะยาวที่สำคัญจริง แบ่งเป็นช่วงที่วัดผลได้ และกำหนดว่าเรื่องใดควรทำเองหรือส่งต่อให้คนอื่น',
      shouldAvoid: 'รับหลายเป้าหมายพร้อมกัน ควบคุมทุกขั้นตอน หรือปล่อยให้โครงการระยะสั้นดึงเวลาออกจากสิ่งที่ต้องการสร้างจริง ๆ'
    },
    {
      id: 'wellbeing', icon: 'pi-sun', title: 'สุขภาวะและการใช้พลัง',
      verdict: needsSupport ? 'ต้องจัดสภาพแวดล้อมและเวลาพักให้ดี' : 'มีแรงขับดี แต่ต้องมีจังหวะฟื้นตัว',
      text: `${wellbeingLead} ${wellbeingPatterns[dominantElement]}`,
      shouldDo: 'รักษาเวลานอน มื้ออาหาร การเคลื่อนไหวร่างกาย และช่วงพักให้สม่ำเสมอ โดยเฉพาะเมื่อภาระเพิ่มขึ้น',
      shouldAvoid: `${wellbeingSupportAvoidance}${wellbeingAvoidance[dominantElement]}`,
      disclaimer: 'หมายเหตุ: ส่วนนี้อธิบายรูปแบบการใช้พลังเท่านั้น ไม่ใช่การตรวจหรือวินิจฉัยสุขภาพ หากมีอาการผิดปกติควรปรึกษาแพทย์ตามปกติ'
    }
  ]
}

export function interpretNatalChart(chart, suppliedAssessment) {
  const master = chart.dayMaster.char
  const assessment = suppliedAssessment ?? assessDayMasterStrength(chart)
  const profile = getDayMasterStrengthReading(master, assessment.strengthLevel)
  const scores = scoreChart(chart)
  const { groups, elements } = scores
  const [dominantGroup] = largestEntry(groups)
  const [dominantElement] = largestEntry(elements)
  const group = groupInsights[dominantGroup]
  const strengthLabel = strengthLevelLabels[assessment.strengthLevel]
  const usefulAction = assessment.primaryUsefulElement
    ? usefulElementActions[assessment.primaryUsefulElement]
    : null
  const evidence = {
    master: `ดิถี ${master} · ${elementLabels[chart.dayMaster.element]}${chart.dayMaster.polarity === 'yang' ? 'หยาง' : 'หยิน'}`,
    pattern: `กลุ่มสิบเทพเด่น: ${group.label}`,
    element: `ธาตุที่ปรากฏมาก: ${elementLabels[dominantElement]}`,
    strength: `กำลังของดิถี: ${strengthLabel}`,
    useful: assessment.primaryUsefulElement
      ? `ธาตุให้คุณหลัก: ${elementLabels[assessment.primaryUsefulElement]}`
      : 'โครงสร้างอาจเป็นกรณีพิเศษ จึงยังไม่ฟันธงธาตุให้คุณ',
    clarity: `ความชัดเจน: ${assessment.structureClarity === 'clear' ? 'โครงสร้างชัดเจน' : assessment.structureClarity === 'fairly_clear' ? 'โครงสร้างค่อนข้างชัด' : 'โครงสร้างก้ำกึ่ง'}`
  }

  return {
    headline: profile.title,
    summary: profile.identity,
    strengthPresentation: profile.strengthPresentation,
    lifeAreas: buildLifeAreas(chart, assessment, profile, scores),
    cards: [
      {
        id: 'strength',
        icon: 'pi-bolt',
        title: 'จุดแข็งที่ควรใช้',
        text: `${profile.strength} ${group.strength}`,
        evidence: [evidence.master, evidence.strength, evidence.pattern, evidence.clarity]
      },
      {
        id: 'work',
        icon: 'pi-briefcase',
        title: 'รูปแบบงานที่เหมาะ',
        text: `${profile.work} ${usefulAction?.work ?? interpretationFallbacks.work}`,
        evidence: [evidence.master, evidence.strength, evidence.useful, evidence.element]
      },
      {
        id: 'finance',
        icon: 'pi-wallet',
        title: 'การเงินและการจัดการทรัพยากร',
        text: profile.finance,
        evidence: [evidence.master, evidence.strength, evidence.pattern, evidence.element]
      },
      {
        id: 'relationship',
        icon: 'pi-heart',
        title: 'ความสัมพันธ์',
        text: `${profile.relationship} ${usefulAction?.relationship ?? interpretationFallbacks.relationship}`,
        evidence: [evidence.master, evidence.strength, evidence.useful]
      },
      {
        id: 'balance',
        icon: 'pi-compass',
        title: 'สิ่งที่ควรรักษาสมดุล',
        text: `${profile.risk} ${usefulAction?.balance ?? group.action}`,
        evidence: [evidence.master, evidence.strength, evidence.useful, evidence.pattern]
      }
    ],
    methodology: INTERPRETATION_METHODOLOGY,
    contentVersion: DAY_MASTER_MATRIX_VERSION
  }
}
