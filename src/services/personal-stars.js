// Traditional lookup tables: Joey Yap, Hack Your Destiny With BaZi, pp.15–16.
// https://www.joeyyap.com/notes/hydb/Hack_Your_Destiny_With_BaZi.pdf
// Day-stem stars use natal day stem; branch-group stars use natal YEAR branch.
// It is a limited daily-transit reading, not a complete Tong Shu or star system.
const nobleman = { 甲: '丑未', 戊: '丑未', 庚: '丑未', 乙: '子申', 己: '子申', 丙: '亥酉', 丁: '亥酉', 壬: '卯巳', 癸: '卯巳', 辛: '午寅' }
const intelligence = { 甲: '巳', 乙: '午', 丙: '申', 丁: '酉', 戊: '申', 己: '酉', 庚: '亥', 辛: '子', 壬: '寅', 癸: '卯' }
// Lu Shen (祿神), not Fu Xing: https://www.chinesebazi.com/Home/Symbolic-Stars-Bazi/?id=3&str=Prosperity+star
const prosperity = { 甲: '寅', 乙: '卯', 丙: '巳', 丁: '午', 戊: '巳', 己: '午', 庚: '申', 辛: '酉', 壬: '亥', 癸: '子' }
const groups = [
  { natal: '寅午戌', peach: '卯', travel: '申' },
  { natal: '巳酉丑', peach: '午', travel: '亥' },
  { natal: '申子辰', peach: '酉', travel: '寅' },
  { natal: '亥卯未', peach: '子', travel: '巳' }
]
const solitude = [
  { natal: '寅卯辰', solitary: '巳', lonely: '丑' },
  { natal: '巳午未', solitary: '申', lonely: '辰' },
  { natal: '申酉戌', solitary: '亥', lonely: '未' },
  { natal: '亥子丑', solitary: '寅', lonely: '戌' }
]

export function personalStars(dayMaster, dayBranch, { yearBranch } = {}) {
  if (!'子丑寅卯辰巳午未申酉戌亥'.includes(dayBranch) || dayBranch?.length !== 1) return []
  const stars = []
  if (nobleman[dayMaster]?.includes(dayBranch)) stars.push({
    id: 'nobleman', name: 'ดาวผู้ช่วยเหลือ', icon: 'pi-users', reference: 'day-stem',
    meaning: 'ในคำอ่านแบบดาวประกอบ เชื่อมโยงกับการขอคำแนะนำและแรงสนับสนุนจากคนอื่น',
    advice: 'ถ้ามีเรื่องติดขัด ลองนัดคนที่มีประสบการณ์ เตรียมคำถามและบอกให้ชัดว่าต้องการความช่วยเหลือตรงไหน'
  })
  if (intelligence[dayMaster] === dayBranch) stars.push({
    id: 'intelligence', name: 'ดาวการเรียนรู้', icon: 'pi-book', reference: 'day-stem',
    meaning: 'ในคำอ่านแบบดาวประกอบ เชื่อมโยงกับการเรียนรู้ การเขียน และการอธิบายความคิด',
    advice: 'ใช้เวลากับการอ่าน เตรียมเนื้อหา หรือร่างข้อเสนอ แล้วตรวจความครบถ้วนก่อนนำไปใช้'
  })
  const group = yearBranch?.length === 1 ? groups.find(item => item.natal.includes(yearBranch)) : null
  if (group?.peach === dayBranch) stars.push({
    id: 'peach-blossom', name: 'ดาวเสน่ห์และการพบปะ', icon: 'pi-heart', reference: 'year-branch',
    meaning: 'ดาวนี้เชื่อมโยงกับการเป็นที่สนใจ การพบปะ และความสัมพันธ์ ไม่ได้จำกัดเฉพาะเรื่องคู่รัก',
    advice: 'ถ้ามีนัดพบลูกค้าหรือคนที่อยากรู้จัก ใช้โอกาสนี้แนะนำตัวและฟังอีกฝ่ายให้มาก ความประทับใจแรกยังไม่ใช่ข้อยืนยันว่าไว้ใจได้ทุกเรื่อง'
  })
  if (group?.travel === dayBranch) stars.push({
    id: 'sky-horse', name: 'ดาวการเดินทางและเปลี่ยนแปลง', icon: 'pi-send', reference: 'year-branch',
    meaning: 'ดาวนี้เชื่อมโยงกับการเคลื่อนไหว การเปลี่ยนสถานที่ และการปรับแผน ไม่ได้บอกว่าการเดินทางจะราบรื่นเสมอ',
    advice: 'เหมาะนำมาอ่านประกอบวันที่ต้องออกไปพบคนหรือทำงานนอกสถานที่ ตรวจนัดหมาย เส้นทาง และเผื่อเวลาสำหรับแผนที่เปลี่ยน'
  })
  if (prosperity[dayMaster] === dayBranch) stars.push({
    id: 'prosperity', name: 'ดาวงานและรายได้', icon: 'pi-briefcase', reference: 'day-stem',
    meaning: 'ดาวลกเชื่อมโยงกับความสามารถ อาชีพ และผลตอบแทนจากงาน'
  })
  const space = yearBranch?.length === 1 ? solitude.find(item => item.natal.includes(yearBranch)) : null
  if (space && [space.solitary, space.lonely].includes(dayBranch)) stars.push({
    id: 'personal-space', name: 'ดาวพื้นที่ส่วนตัว', icon: 'pi-moon', reference: 'year-branch',
    sourceStar: space.solitary === dayBranch ? 'solitary' : 'loneliness',
    meaning: 'รวมดาวที่เชื่อมโยงกับความโดดเดี่ยวและระยะห่างไว้ในกลุ่มเดียว เพื่อชวนสังเกตการสื่อสาร ไม่ได้ทำนายว่าจะเลิกราหรือต้องอยู่คนเดียว',
    advice: 'ถ้าต้องการเวลาอยู่กับตัวเอง ให้บอกคนใกล้ชิดว่าต้องการพักและจะกลับมาคุยเมื่อไร แทนการเงียบหายจนอีกฝ่ายต้องเดา'
  })
  return stars
}
