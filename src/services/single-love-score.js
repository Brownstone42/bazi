// App-authored experimental rubric, not a classical formula or event probability.
// Each group contributes at most once: repeated references never multiply points.
const rubrics = {
  'love-overview': { label: 'การเปิดใจและคุยกัน', structure: 1, peach: 0.5, combine: 0.5, friction: 0.5 },
  'love-meet': { label: 'การเริ่มรู้จักคนใหม่', structure: 0.5, peach: 0.5, combine: 1, friction: 0.5 },
  'love-charm': { label: 'การแสดงออกและสร้างความประทับใจ', structure: 1, peach: 1, combine: 0, friction: 0.5 },
  'love-caution': { label: 'ความราบรื่นในการสื่อสาร', structure: 1, peach: 0, combine: 0.5, friction: 1 },
  'love-attraction': { label: 'การเปิดโอกาสพบปะ ไม่ใช่โอกาสเจอคนถูกใจ', structure: 0.5, peach: 1, combine: 0.5, friction: 0.5 },
}
export function summarizeLoveScore(topic, delta) {
  if (delta === null || !Number.isFinite(delta)) return null
  const subject = {
    'love-overview': 'โอกาสที่การทำความรู้จักจะราบรื่น',
    'love-meet': 'โอกาสเริ่มรู้จักคนใหม่',
    'love-charm': 'โอกาสสร้างความประทับใจ',
    'love-caution': 'โอกาสสื่อสารกันได้ราบรื่น',
    // This rubric measures meeting opportunities, not personal attraction.
    'love-attraction': 'โอกาสพบปะคนใหม่',
  }[topic]
  if (!subject) throw new Error('ไม่พบเกณฑ์คะแนนคำถามนี้')
  const level = delta <= -1 ? 'ต่ำกว่าปกติ' : delta < 0 ? 'น้อยกว่าปกติเล็กน้อย'
    : delta >= 1 ? 'สูงกว่าปกติ' : delta > 0 ? 'มากกว่าปกติเล็กน้อย' : 'ใกล้เคียงปกติ'
  return `ตามเกณฑ์วันนี้ ${subject}${level}`
}
export function scoreSingleLove({ topic, status, peach = [], combine = [], friction = [], transits }) {
  const rubric = rubrics[topic]
  if (!rubric) throw new Error('ไม่พบเกณฑ์คะแนนคำถามนี้')
  const base = { label: rubric.label, baseline: 2.5, max: 5, version: 'single-love-score/experimental-0.2' }
  // An unresolved structure contributes nothing; independent known factors still count.
  const factors = []
  const add = (id, delta, label, reason, sourceIds) => {
    if (delta) factors.push({ id, delta, label, reason, sourceIds })
  }
  if (status === 'supportive') add('structure', rubric.structure, 'ภาพรวมสนับสนุน', 'ผลรวมพื้นดวงกับช่วงปี เดือน และวันมีด้านที่ช่วยตามเกณฑ์ทดลอง', ['day-structure'])
  if (status === 'caution') add('structure', -rubric.structure, 'ภาพรวมต้องค่อยเป็นค่อยไป', 'ผลรวมพื้นดวงกับช่วงปี เดือน และวันมีด้านที่ควรระวังตามเกณฑ์ทดลอง', ['day-structure'])
  if (status === 'mixed') {
    add('structure-support', rubric.structure / 2, 'ภาพรวมมีด้านช่วย', 'มีด้านสนับสนุน แต่ต้องอ่านร่วมกับด้านที่ควรระวัง', ['day-structure'])
    add('structure-caution', -rubric.structure / 2, 'ภาพรวมมีด้านขัด', 'ด้านที่ควรระวังหักล้างคะแนนสนับสนุนในเกณฑ์นี้', ['day-structure'])
  }
  if (peach.length) add('peach', rubric.peach, 'การสร้างความประทับใจ', 'พบองค์ประกอบด้านเสน่ห์ของวันที่เลือก นับครั้งเดียวแม้พบหลายตำแหน่ง', peach.map(item => item.id))
  if (combine.length) add('combine', rubric.combine, 'การเชื่อมสัมพันธ์', 'พบองค์ประกอบของวันที่ใช้ตีความเรื่องการเข้าหากัน ไม่รับรองความรู้สึกของอีกฝ่าย', combine.map(item => item.id))
  if (friction.length) add('friction', -rubric.friction, 'จังหวะที่ต้องปรับเข้าหากัน', 'พบองค์ประกอบของวันที่ควรระวังความไม่ลงตัว นับรวมเป็นกลุ่มเดียว ไม่ได้ทำนายว่าจะขัดแย้ง', friction.map(item => item.id))
  const interactionNames = { CLASH: 'ชง', PUNISHMENT: 'ลงโทษ', DESTRUCTION: 'แตก', HARM: 'ทำร้าย' }
  for (const factor of factors) {
    let sources = []
    if (factor.id.startsWith('structure')) {
      const direction = factor.delta > 0 ? 'support' : 'caution'
      // Overall status is the day's result, plus qualifying background caution.
      const layers = (transits?.layers ?? []).filter(layer => layer.key === 'day'
        || (direction === 'caution' && ['caution', 'mixed'].includes(layer.status)))
      sources = layers.flatMap(layer => layer.changes.filter(change => change.direction === direction)
        .map(change => ({ ...change, text: `${layer.ganZhi} · ${change.text}` })))
      factor.label = factor.delta > 0 ? 'ดวงจรเพิ่มฝ่ายช่วย / เปิดทางแก้โครงสร้าง' : 'ดวงจรเพิ่มฝ่ายขัด / กระทบฝ่ายช่วย'
    } else if (factor.id === 'peach') {
      sources = peach
      factor.label = 'วันจรตรงดาวเสน่ห์ของพื้นดวง'
    } else if (factor.id === 'combine') {
      sources = combine
      factor.label = 'กิ่งวันจรประสานกิ่งวันเกิด'
    } else if (factor.id === 'friction') {
      sources = friction
      const types = [...new Set(friction.map(item => interactionNames[item.interactionType]).filter(Boolean))]
      factor.label = `กิ่งวันจร${types.length ? types.join(' / ') : 'มีปฏิสัมพันธ์ขัดแย้งกับ'}กิ่งวันเกิด`
    }
    factor.details = sources.filter(item => item.text).map(item => ({ id: item.id, text: item.text }))
    if (sources.length) factor.sourceIds = sources.map(item => item.id)
    factor.weightNote = `เกณฑ์ข้อนี้${factor.delta > 0 ? 'บวก' : 'หัก'} ${Math.abs(factor.delta)} คะแนนต่อกลุ่ม ไม่ใช่ต่อรายการหลักฐาน`
  }
  const delta = factors.length ? factors.reduce((sum, item) => sum + item.delta, 0) : null
  return { ...base, value: delta === null ? null : base.baseline + delta, delta, summary: summarizeLoveScore(topic, delta), factors }
}
