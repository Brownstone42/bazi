import { buildQuestionReading } from './bazi-questions.js'
import { calculateChart } from './bazi.js'
import { assessDayMasterStrength } from './strength-engine.js'
import { analyzeRegularStructure } from './regular-structure.js'
import { analyzeStructureTransits } from './structure-transits.js'
import { presentSingleLove } from './single-love-presentation.js'
import { scoreSingleLove } from './single-love-score.js'

export const LOVE_RULE_VERSION = 'single-love/transits-0.4'
export const singleLoveQuestions = [
  { id: 'love-overview', label: 'วันนี้ความรักเป็นอย่างไร?' },
  { id: 'love-meet', label: 'วันนี้เหมาะกับการพบคนใหม่ไหม?' },
  { id: 'love-charm', label: 'วันนี้ควรแสดงเสน่ห์แบบไหน?' },
  { id: 'love-caution', label: 'วันนี้ควรระวังอะไรเรื่องความรัก?' },
  { id: 'love-attraction', label: 'วันนี้จะเจอคนที่ถูกใจมั้ย?' },
]

// Auxiliary Shen Sha, using both natal year and day, retaining each reference.
// https://wiki.openfate.ai/en/bazi/fate-stars/peach-blossom
// It is NOT a probability of romance, nor a substitute for the natal structure.
const peachGroups = [['申子辰', '酉'], ['寅午戌', '卯'], ['巳酉丑', '午'], ['亥卯未', '子']]
export function peachBranch(branch) {
  return peachGroups.find(([group]) => branch?.length === 1 && group.includes(branch))?.[1] ?? null
}
const outward = ['食神', '伤官', '比肩', '劫财']
const inward = ['正印', '偏印']
const frictionTypes = ['CLASH', 'PUNISHMENT', 'DESTRUCTION', 'HARM']
const styles = {
  比肩: ['เป็นตัวเองและคุยแบบเท่าเทียม', 'ชวนคุยเรื่องที่คุณชอบ แล้วเปิดพื้นที่ให้อีกฝ่ายเล่า', 'อย่าเปลี่ยนการทำความรู้จักเป็นการพิสูจน์ว่าใครเก่งกว่า'],
  劫财: ['เป็นกันเองผ่านกิจกรรมร่วมกัน', 'เริ่มจากกิจกรรมกลุ่มหรือเพื่อนแนะนำ และคุยทีละคนให้ทั่วถึง', 'อย่าแข่งเรียกร้องความสนใจหรือใช้จ่ายเพื่อเอาใจ'],
  食神: ['อ่อนโยนและชวนคุยอย่างสบายใจ', 'แบ่งปันเรื่องเล็ก ๆ ที่คุณเพลิดเพลิน และฟังสิ่งที่อีกฝ่ายชอบ', 'ความสบายใจยังต้องมีขอบเขต อย่ารับปากเพียงเพื่อให้บรรยากาศดี'],
  伤官: ['มีไหวพริบและมุมมองเฉพาะตัว', 'เล่าเรื่องสนุกหรือความคิดสร้างสรรค์ โดยดูว่าอีกฝ่ายอยากคุยต่อหรือไม่', 'ระวังแซวแรง วิจารณ์เร็ว หรือพูดจนอีกฝ่ายไม่มีพื้นที่'],
  正财: ['ใส่ใจรายละเอียดและรักษาคำพูด', 'ตรงเวลานัดและแสดงความใส่ใจผ่านสิ่งเล็ก ๆ ที่ทำได้จริง', 'อย่ารีบประเมินคนใหม่ด้วยรายการคุณสมบัติหรือสิ่งที่เขาให้ได้'],
  偏财: ['ยืดหยุ่นและเปิดรับประสบการณ์ใหม่', 'ลองกิจกรรมใหม่ที่คุณสนใจและชวนคุยจากสิ่งตรงหน้า', 'อย่าให้ความตื่นเต้นทำให้รับปากหรือใช้เงินเกินขอบเขต'],
  正官: ['สุภาพและชัดเจนกับความตั้งใจ', 'นัดหมายให้ชัดและถามอย่างให้เกียรติแทนการคาดเดา', 'อย่าตั้งมาตรฐานจนการสนทนากลายเป็นการสัมภาษณ์'],
  七杀: ['ตรงไปตรงมาแต่ไม่เร่งรัด', 'ถ้าอยากรู้จัก ลองชวนอย่างชัดเจนหนึ่งครั้งแล้วให้เวลาตัดสินใจ', 'ระวังใจร้อน กดดันให้ตอบ หรือสรุปความสัมพันธ์เร็ว'],
  正印: ['อบอุ่นและรับฟัง', 'ใช้คำถามปลายเปิดและฟังโดยไม่รีบเสนอวิธีแก้ปัญหา', 'อย่ารับบทดูแลทุกอย่างจนละเลยความต้องการของตัวเอง'],
  偏印: ['มีเอกลักษณ์ผ่านความสนใจเฉพาะ', 'คุยเรื่องที่คุณสนใจจริง และอธิบายให้คนที่ไม่คุ้นเรื่องนั้นเข้าถึงได้', 'อย่าตีความข้อความสั้นหรือการตอบช้าแทนความรู้สึกของอีกฝ่าย'],
}

/** One deterministic fact pass supplies all five answers. No random text or event score. */
export function buildSingleLoveReadings({ input, date }) {
  const chart = calculateChart(input)
  const assessment = assessDayMasterStrength(chart)
  const structure = analyzeRegularStructure(chart, assessment)
  const base = buildQuestionReading({ input, date, chart, assessment })
  const transits = analyzeStructureTransits({ chart, structure, contexts: base.contexts })
  const day = base.contexts.find(layer => layer.key === 'day')
  const month = base.contexts.find(layer => layer.key === 'month')
  const signals = []
  for (const layer of base.contexts) {
    const activation = transits.layers.find(item => item.key === layer.key)
    signals.push({ id: `${layer.key}-structure`, layerKey: layer.key, kind: 'structure', status: activation.status, text: activation.text })
    signals.push(...activation.changes.map(item => ({ ...item, kind: 'transit-change' })))
    signals.push({ id: `${layer.key}-expression`, layerKey: layer.key, kind: 'expression', god: layer.god,
      text: `${layer.label} ${layer.ganZhi}: ${layer.god} (${layer.godName})`, sourceIds: [`${layer.key}-god`] })
    for (const position of ['year', 'day']) {
      const target = peachBranch(chart.pillars[position].branch)
      if (layer.branch === target) signals.push({ id: `${layer.key}-peach-${position}`, layerKey: layer.key, kind: 'peach', reference: position,
        text: `${layer.label} ${layer.branch} ตรงดาวเสน่ห์อ้างอิงกิ่ง${position === 'year' ? 'ปี' : 'วัน'}เกิด ${chart.pillars[position].branch} → ${target}`, sourceIds: [] })
    }
    for (const item of base.evidence.filter(item => item.layerKey === layer.key && item.position === 'day')) {
      signals.push({ id: item.id, layerKey: layer.key, kind: 'palace', interactionType: item.interactionType,
        text: `${item.layer} ${layer.branch} เทียบกิ่งวันเกิด ${chart.pillars.day.branch}: ${item.text} (วังคู่ครอง)`, sourceIds: [item.id] })
    }
    if (layer.branch === chart.pillars.day.branch) signals.push({ id: `${layer.key}-palace-repeat`, layerKey: layer.key, kind: 'repeat',
      text: `${layer.label} ย้ำกิ่งวังคู่ครอง ${layer.branch} ไม่จัดเป็นผลดีหรือร้ายโดยอัตโนมัติ`, sourceIds: [`${layer.key}-day-repeat`] })
  }
  const daily = signals.filter(item => item.layerKey === 'day')
  const background = signals.filter(item => item.layerKey !== 'day')
  const friction = daily.filter(item => item.kind === 'palace' && frictionTypes.includes(item.interactionType))
  const combine = daily.filter(item => item.kind === 'palace' && item.interactionType === 'COMBINATION_2')
  const peach = daily.filter(item => item.kind === 'peach')
  const mixed = friction.length > 0 && (peach.length > 0 || combine.length > 0)
  const [style, action, caution] = styles[day.god]
  const monthTension = (outward.includes(day.god) && inward.includes(month.god)) || (inward.includes(day.god) && outward.includes(month.god))
  const backgroundPalace = background.filter(item => item.kind === 'palace')
  const contextText = `เดือนจร ${month.ganZhi} เป็น ${month.god} (${month.godName})${monthTension ? ' มีจังหวะการแสดงออกต่างจากวันจร จึงควรเลือกวงสนทนาและเว้นเวลาพักให้เหมาะกับตัวเอง' : ' ใช้ประกอบบรรยากาศระยะยาว ไม่แทนสัญญาณเฉพาะวันนี้'}${backgroundPalace.length ? ` · บริบทวังคู่ครองระยะยาว: ${backgroundPalace.map(item => item.text).join(' / ')} ไม่ถือว่าเกิดเหตุการณ์ใหม่ทุกวันที่บริบทนี้ยังอยู่` : ''}`
  const tone = mixed ? 'มีทั้งแรงดึงดูดและจังหวะที่ต้องปรับตัว' : friction.length ? 'ให้พื้นที่กับการปรับจังหวะความสัมพันธ์' : combine.length ? 'ลองเปิดพื้นที่ให้การเชื่อมสัมพันธ์' : peach.length ? 'ให้ความสำคัญกับการแนะนำตัวและความประทับใจ' : 'ค่อย ๆ ทำความรู้จักตามจังหวะของตัวเอง'
  const meet = friction.length ? 'พบคนใหม่ได้ โดยเลือกนัดสั้นและยืดหยุ่น' : outward.includes(day.god) || combine.length || peach.length ? 'ลองจัดโอกาสพบคนใหม่แบบไม่กดดัน' : 'เริ่มจากวงเล็กหรือบทสนทนาที่คุ้นเคย'
  const attraction = peach.length && (combine.length || outward.includes(day.god))
    ? 'มีสัญญาณเชิงสัญลักษณ์ด้านการเป็นที่สนใจและการเข้าหาคน แต่ยังบอกไม่ได้ว่าจะพบคนที่ถูกใจ'
    : peach.length || combine.length ? 'มีสัญญาณด้านการเชื่อมสัมพันธ์บางส่วน แต่ยังไม่พอจะสรุปว่าจะพบคนที่ถูกใจ'
      : 'วันนี้ยังไม่มีสัญญาณเฉพาะด้านการพบปะจากดาวเสน่ห์หรือกิ่งประสานวังคู่ครอง ไม่ได้แปลว่าจะไม่เจอคนที่ถูกใจ'
  const dayId = 'day-expression'
  const structureDay = signals.find(item => item.id === 'day-structure')
  const structureContext = signals.filter(item => item.kind === 'structure' && item.layerKey !== 'day')
  const structureReason = `${structure.label} · ${structure.useful.path || 'ยังไม่เลือกตัวช่วยโครงสร้าง'} · พื้นดวง: ${structure.resolution.summary} · ${transits.summary}`
  // These are editorial actions conditioned on the rule result, not new classical rules.
  const adaptations = {
    supportive: ['ใช้จังหวะนี้แสดงความตั้งใจผ่านการกระทำเล็ก ๆ', 'ลองเริ่มบทสนทนาหนึ่งครั้งแล้วดูการตอบรับ', 'ใช้จุดเด่นนี้อย่างพอดีโดยเปิดพื้นที่ให้อีกฝ่าย', 'แม้ตัวช่วยสอดคล้อง ยังต้องดูขอบเขตและการตอบรับจริง', 'ใช้เป็นแนวทางเปิดโอกาส ไม่ใช่ข้อยืนยันว่าจะเจอคนที่ชอบ'],
    caution: ['ลดการเร่งความสัมพันธ์และตรวจความต้องการของตัวเอง', 'เลือกนัดสั้นที่เปลี่ยนแผนได้และไม่ตั้งความคาดหวังสูง', 'ลดความเข้มของการแสดงออกแล้วเพิ่มการฟัง', 'สังเกตว่ากำลังพยายามเอาชนะหรือขอคำยืนยันเร็วเกินไปหรือไม่', 'อย่าให้ความสนใจแรกพบทำให้รีบตัดสินความเข้ากันได้'],
    mixed: ['อ่านทั้งด้านที่ส่งเสริมและด้านที่เพิ่มภาระร่วมกัน', 'เริ่มแบบค่อยเป็นค่อยไปและประเมินความสบายใจระหว่างคุย', 'แสดงจุดเด่นพร้อมเว้นจังหวะให้อีกฝ่าย', 'หากรู้สึกฝืนให้พักก่อน ไม่ใช้คำอ่านเป็นเหตุผลเร่งต่อ', 'สัญญาณขัดกันจึงยังสรุปแนวโน้มการพบคนถูกใจไม่ได้'],
    unresolved: ['ใช้คำอ่านด้านการสื่อสารเป็นแนวทางก่อน ยังไม่สรุปวันดีจาก用神', 'ตัดสินใจจากความพร้อมและแผนจริง เพราะตัวช่วยดวงยังไม่ชัด', 'ลองวิธีแสดงออกนี้ได้ แต่ยังไม่ยืนยันว่าเป็นพลังที่ดวงต้องการ', 'ระวังตีความผลที่ยังไม่ชัดเป็นคำทำนายลบ', '用神ยังไม่ชัด จึงไม่เพิ่มข้อสรุปว่าจะพบคนถูกใจจากโครงสร้าง'],
    neutral: ['เน้นปฏิสัมพันธ์วังคู่ครองและการสื่อสารที่พบจริง', 'เลือกกิจกรรมตามความสนใจร่วมกัน ไม่ต้องฝืนเพื่อใช้วัน', 'ใช้เป็นรูปแบบการสื่อสาร ไม่ใช่การเพิ่มธาตุที่ขาด', 'ไม่มีสัญญาณตรงในกฎนี้ ไม่ได้แปลว่าไม่มีเรื่องต้องระวัง', 'โครงสร้างยังไม่ได้เพิ่มสัญญาณเฉพาะเรื่องการพบคนถูกใจ'],
  }
  const ids = list => list.map(item => item.id)
  const specs = [
    { headline: tone, summary: `วันจร ${day.ganZhi} เน้น${style} · ${contextText}`, action,
      support: ids(daily), counter: ids(friction), status: mixed ? 'mixed' : 'reflective' },
    { headline: meet, summary: `พิจารณาวิธีเปิดบทสนทนาจาก ${day.god} ร่วมกับปฏิสัมพันธ์วังคู่ครองและดาวเสน่ห์ของวัน การไปพบคนจริงยังขึ้นกับแผนของคุณ · ${contextText}`,
      action: `${action} เลือกกิจกรรมที่มีความสนใจร่วมกัน และให้สิทธิ์อีกฝ่ายปฏิเสธ`, support: [dayId, ...ids(combine), ...ids(peach)], counter: ids(friction), status: friction.length ? 'flexible' : 'gentle-action' },
    { headline: style, summary: `ใช้บทบาท ${day.god} ของก้านวันจรเป็นแนวทางการแสดงออก ก้านซ่อนเป็นข้อมูลประกอบ ไม่ใช่การเปลี่ยนบุคลิกพื้นฐานของคุณ · ${contextText}`,
      action, support: [dayId], counter: ids(friction), status: 'expression' },
    { headline: friction.length ? 'เผื่อจังหวะไม่ตรงกันและตรวจความเข้าใจก่อนสรุป' : caution,
      summary: `${friction.length ? 'พบปฏิสัมพันธ์วันจรกับวังคู่ครองที่ควรอ่านเป็นจังหวะปรับตัว ไม่ใช่คำทำนายว่าจะทะเลาะหรือผิดหวัง' : 'ไม่พบคู่ชง/ลงโทษ/แตก/ทำร้ายระหว่างกิ่งวันจรกับวังคู่ครองในเกณฑ์คู่นี้ แต่ไม่ได้รับรองว่าจะไม่มีปัญหา'} · ${contextText}`,
      action: 'ถ้าบทสนทนาไม่ชัด ให้ถามตรง ๆ อย่างสุภาพและเว้นเวลาตอบ แทนการทดสอบใจ', support: [dayId, ...ids(friction)], counter: ids([...combine, ...peach]), status: 'caution' },
    { headline: attraction, summary: `${mixed ? 'สัญญาณด้านการพบปะมาพร้อมแรงปรับตัว จึงไม่ควรตีความดาวเสน่ห์ด้านเดียว · ' : ''}การเจอและความถูกใจขึ้นกับสถานการณ์ รสนิยม และความสมัครใจของทั้งสองคน ปาจื้อของคุณไม่บอกความรู้สึกของคนที่ยังไม่รู้จัก · ${contextText}`,
      action: 'ถ้าอยากเปิดโอกาส ลองเข้าร่วมกิจกรรมที่ชอบหรือเริ่มคุยอย่างสุภาพ แล้วดูความสนใจที่อีกฝ่ายแสดงจริง', support: [dayId, ...ids(peach), ...ids(combine)], counter: ids(friction), status: 'uncertain' },
  ]
  const evidence = [...base.evidence.map(item => ({ ...item, relevant: false })), ...structure.evidence.map(item => ({ ...item, layer: 'โครงสร้างพื้นดวง', kind: 'structure-rule', relevant: false })), ...signals.filter(item => !base.evidence.some(source => source.id === item.id)).map(item => ({ ...item, layer: base.contexts.find(layer => layer.key === item.layerKey).label, relevant: false }))]
  const readings = singleLoveQuestions.map((question, index) => {
    const spec = specs[index]
    const constrained = ['caution', 'mixed', 'unresolved'].includes(transits.status)
    return { ...base, topic: question.id, topicLabel: question.label, ruleVersion: LOVE_RULE_VERSION,
      presentation: presentSingleLove({ topic: question.id, status: transits.status, style, action, caution, friction: friction.length > 0, connection: peach.length > 0 || combine.length > 0, monthTension }),
      score: scoreSingleLove({ topic: question.id, status: transits.status, peach, combine, friction, transits }),
      headline: index === 1 && constrained ? 'พบคนใหม่ได้ตามความพร้อม โดยยังไม่ฟันธงว่าเป็นวันส่งเสริมจาก用神' : spec.headline,
      summary: `${spec.summary} · ${structureReason}`, action: `${spec.action} · ${adaptations[transits.status][index]}`, caution: `${caution}${friction.length ? ' · เผื่อความเปลี่ยนแปลงของนัดหมายและไม่เร่งข้อสรุป' : ''}`,
      structure, structureDay, structureContext, transits, evidence,
      supportingSignalIds: [...new Set([...spec.support, 'day-structure'])], counterSignalIds: [...new Set([...spec.counter, ...(constrained ? ['day-structure'] : []), ...transits.layers.flatMap(item => item.changes.filter(change => change.direction === 'caution').map(change => change.id))])], status: spec.status,
      limits: ['สูตรตีความความรักเป็นเกณฑ์ต้นแบบของแอป ยังไม่ผ่านการตรวจโดยผู้เชี่ยวชาญ',
        'ดาวเสน่ห์เป็นองค์ประกอบเสริม ไม่รับรองการพบคู่หรือความรู้สึกของอีกฝ่าย',
        'อ่านกิ่งวังคู่ครองเป็นคู่ ยังไม่ตัดสินการแปรธาตุหรือกลุ่มสามกิ่งครบทุกชั้น',
        ...structure.limits,
        ...transits.limits,
        'ไม่กำหนดดาวคู่ตามเพศ และไม่มีเปอร์เซ็นต์ความสำเร็จ', ...base.limits.slice(2)] }
  })
  return { date, ruleVersion: LOVE_RULE_VERSION, structure, transits, signals, background, readings }
}
