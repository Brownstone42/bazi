import { calculateChart } from './bazi.js'
import { buildQuestionReading } from './bazi-questions.js'
import { analyzeRegularStructure } from './regular-structure.js'
import { analyzeStructureTransits } from './structure-transits.js'
import { peachBranch } from './single-love.js'
import { scoreSingleLove } from './single-love-score.js'
import { identity60, identityFromChart, identityElements } from './identity60.js'
import { scoreLevel } from './score-level.js'
import { currentSolarYear } from './year-preview.js'

const stemPairs = ['甲己','乙庚','丙辛','丁壬','戊癸']
const branchPairs = ['子丑','寅亥','卯戌','辰酉','巳申','午未']
const pairs = (list,a,b) => a !== b && list.some(pair => pair.includes(a) && pair.includes(b))
const dateKey = date => date.toISOString().slice(0,10)
export const loveStatus = value => ['partner','married','coupled'].includes(value) ? 'coupled' : 'single'
const zodiacNames = ['ชวด','ฉลู','ขาล','เถาะ','มะโรง','มะเส็ง','มะเมีย','มะแม','วอก','ระกา','จอ','กุน']

// Reuse natal/transit analysis and the existing experimental love rubric.
// Each period is read at its own layer: never substitute a sampled day's score.
export function buildLovePreview({chart,assessment,input,today}) {
  const structure = analyzeRegularStructure(chart,assessment)
  function period(date,key) {
    const base = buildQuestionReading({input,date,chart,assessment})
    const all = analyzeStructureTransits({chart,structure,contexts:base.contexts})
    const layer = base.contexts.find(item => item.key === key)
    const activation = all.layers.find(item => item.key === key)
    const peach = ['year','day'].filter(position => peachBranch(chart.pillars[position].branch) === layer.branch)
      .map(position => ({id:`${key}-peach-${position}`,text:`${layer.label} ${layer.branch} ตรงดาวเสน่ห์อ้างอิงกิ่ง${position === 'year' ? 'ปี' : 'วัน'}เกิด ${chart.pillars[position].branch}`}))
    const contacts = base.evidence.filter(item => item.layerKey === key && item.position === 'day')
    const combine = contacts.filter(item => item.interactionType === 'COMBINATION_2')
    const friction = contacts.filter(item => ['CLASH','PUNISHMENT','DESTRUCTION','HARM'].includes(item.interactionType))
    return {date,key,pillar:layer.ganZhi,activation,peach,combine,friction}
  }
  // Solar-month boundaries follow the existing Bangkok-noon convention.
  const start = new Date(`${today}T12:00:00Z`)
  start.setUTCDate(1); start.setUTCMonth(start.getUTCMonth()-1)
  const months=[]
  for(let i=0;i<430;i++) {
    const day = new Date(start.getTime()+i*86400000)
    const date = dateKey(day)
    const pillar = calculateChart({birthDate:date,birthTime:'12:00',gender:input.gender,timezoneId:'Asia/Bangkok'}).pillars.month.ganZhi
    if(months.at(-1)?.pillar === pillar) months.at(-1).end=date
    else months.push({pillar,start:date,end:date})
  }
  const upcoming = months.filter(month=>month.end>=today).slice(0,12).map(month=>({...period(month.start,'month'),...month,
    label:new Intl.DateTimeFormat('th-TH',{month:'short',timeZone:'UTC'}).format(new Date(`${month.start}T12:00:00Z`)),
    current:month.start<=today && month.end>=today}))
  const year=currentSolarYear(today,input)
  const years=Array.from({length:10},(_,index)=>({ ...period(`${year+index}-07-01`,'year'),year:year+index,label:String(year+index+543)}))
  const identity=identityFromChart(chart)
  const compatible=identity60.map(item=>{
    const reasons=[]
    if(pairs(stemPairs,chart.pillars.day.stem,item.id[0])) reasons.push('ก้านวันประสานกัน')
    if(pairs(branchPairs,chart.pillars.day.branch,item.id[1])) reasons.push('กิ่งวังคู่ประสานกัน')
    return {...item,reasons,soulmate:reasons.length===2,
      elementLabel:`${identityElements.find(element=>element.key===item.element).label}${item.stemIndex%2===0?'หยาง':'หยิน'}`,
      zodiacLabel:`ปี${zodiacNames[item.branchIndex]}`}
  }).filter(item=>item.reasons.length).sort((a,b)=>b.reasons.length-a.reasons.length||a.number-b.number).slice(0,3)
  const natalPeach=Object.values(chart.pillars).some(p=>['year','day'].some(position=>peachBranch(chart.pillars[position].branch)===p.branch))
  return {months:upcoming,years,identity,compatible,natalPeach}
}

export function presentLovePeriod(period,status) {
  status=loveStatus(status)
  const score=scoreSingleLove({topic:status==='single'?'love-meet':'love-caution',status:period.activation.status,
    peach:period.peach,combine:period.combine,friction:period.friction,
    transits:{layers:[{...period.activation,key:'day'}]}})
  const factors=score.factors.map(factor=>({...factor,label:factor.label.replaceAll('วันจร',period.key==='month'?'เดือนจร':'ปีจร'),
    reason:factor.reason.replaceAll('ของวันที่เลือก','ของช่วงที่เลือก').replaceAll('ของวันที่','ของช่วงที่')}))
  const category=period.friction.length?'friction':period.peach.length?'peach':period.combine.length?'combine':score.delta>0?'support':score.delta<0?'caution':'neutral'
  const copy={
    single:{friction:'ค่อย ๆ รู้จักกัน อย่ารีบผูกมัดก่อนเห็นความสม่ำเสมอ',peach:'เหมาะเปิดวงสังคมและเริ่มคุยกับคนใหม่',combine:'ลองชวนคนที่สนใจทำกิจกรรมร่วมกัน',support:'เริ่มบทสนทนาได้ แล้วดูว่าอีกฝ่ายตอบรับอย่างไร',caution:'ลดความคาดหวังและให้เวลาทำความรู้จักกัน',neutral:'ค่อย ๆ เปิดใจผ่านกิจกรรมที่คุณชอบ'},
    coupled:{friction:'คุยทีละเรื่อง และเว้นพักเมื่อเริ่มใช้อารมณ์',peach:'รักษาขอบเขตกับคนรอบตัว และให้เวลาคนรัก',combine:'เหมาะจัดเวลาร่วมกันและคุยแผนที่ต้องร่วมตัดสินใจ',support:'ชวนกันทำสิ่งเล็ก ๆ ที่ช่วยให้ใกล้ชิดขึ้น',caution:'ฟังความต้องการของกันและกันก่อนหาข้อสรุป',neutral:'ดูแลความสัมพันธ์ด้วยความใส่ใจที่สม่ำเสมอ'},
    complicated:{friction:'อย่าเร่งคำตอบตอนอารมณ์แรง ให้เวลาตัวเองคิดก่อน',peach:'แยกความตื่นเต้นจากความตั้งใจจริงก่อนตัดสินใจ',combine:'ลองคุยว่าต่างฝ่ายต้องการความสัมพันธ์แบบไหน',support:'บอกความต้องการให้ชัดและเปิดพื้นที่ให้อีกฝ่ายตอบ',caution:'ทบทวนขอบเขตที่คุณรับได้ก่อนเดินหน้าต่อ',neutral:'ดูความสม่ำเสมอของการกระทำควบคู่กับคำพูด'}
  }
  const tags=[period.peach.length?'ดาวเสน่ห์':null,period.combine.length?'วังคู่ประสาน':null,period.friction.length?'วังคู่มีแรงกระทบ':null].filter(Boolean)
  const value=score.value===null?null:Math.round(Math.max(0,Math.min(5,score.value))*20)
  return {...period,score:value,delta:score.delta,factors,tags,summary:copy[status][category],rating:value===null?{label:'ยังไม่ชัด',color:'#ded9e4',background:'#f1eef4',ink:'#85788f'}:scoreLevel(value)}
}
