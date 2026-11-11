import { BRANCH_HIDDEN_STEMS, calculateTenGod, detectInteractions } from '@openfate/bazi-engine'
import { evaluateStructureResolution } from './structure-resolution.js'

export const TRANSIT_RULE_VERSION = 'structure-transits/experimental-0.1'
const sequence = ['luck', 'year', 'month', 'day']
const round = n => Math.round(n * 10000) / 10000
const damaging = ['CLASH', 'HARM', 'PUNISHMENT', 'DESTRUCTION']

// Experimental cumulative activation model: each transit contributes 1 visible
// and 1 split hidden unit, using the natal seasonal multiplier. Equal units do
// not imply equal duration or equal real-world effect. Natal month/focus stay fixed.
// Source concept, NOT the source of our weights:
// https://changxianyi.com/guji/ziping/wz-20260914/chapter-027/
export function analyzeStructureTransits({ chart, structure, contexts }) {
  if (new Set(contexts.map(item => item.key)).size !== contexts.length || contexts.some(item => !sequence.includes(item.key))) throw new Error('ชั้นดวงจรซ้ำหรือไม่ถูกต้อง')
  if (!contexts.some(item => item.key === 'day')) throw new Error('ต้องมีวันจรเพื่ออ่านรายวัน')
  const working = structuredClone(chart)
  const strength = structuredClone(structure.tenGodStrength)
  let before = structure.resolution
  const layers = []
  const helperGods = structure.useful.helperCandidates.map(item => item.god)
  for (const key of sequence) {
    const layer = contexts.find(item => item.key === key)
    if (!layer) continue
    const priorIndices = new Map(strength.gods.map(item => [item.god, item.strengthIndex]))
    const stemGod = strength.gods.find(item => item.stem === layer.stem)
    const hidden = BRANCH_HIDDEN_STEMS[layer.branch]
    if (!stemGod || !hidden?.length) throw new Error('ก้านหรือกิ่งดวงจรไม่ถูกต้อง')
    const position = `transit-${key}`
    const additions = []
    const add = (stem, kind, mass, rank) => {
      const god = strength.gods.find(item => item.stem === stem)
      const occurrence = { id: `${position}-${kind}-${stem}`, position, stem, kind, mass, rank, branch: layer.branch }
      ;(kind === 'visible' ? god.visible : god.roots).push(occurrence)
      god.evidence.push({ ...occurrence, text: `${layer.label} ${layer.stem}${layer.branch}: ${kind === 'visible' ? 'ก้านฟ้า' : 'ก้านซ่อน'} ${stem} · น้ำหนักกระตุ้น ${mass}` })
      additions.push({ god: god.god, stem, kind, mass, id: occurrence.id })
    }
    add(layer.stem, 'visible', 1)
    const ordered = [...hidden].sort((a, b) => Number(Boolean(b.isMain)) - Number(Boolean(a.isMain)))
    const shares = ordered.length === 1 ? [1] : ordered.length === 2 ? [0.7, 0.3] : [0.6, 0.3, 0.1]
    ordered.forEach((item, index) => add(item.stem, 'hidden', shares[index], index))
    const contacts = []
    for (const [otherPosition, pillar] of Object.entries(working.pillars)) {
      const pairs = detectInteractions({ year: pillar.branch, month: '', day: '', hour: '' }, layer.branch).filter(item => item.pillars.includes('annual'))
      for (const pair of pairs) contacts.push({ type: pair.type, pillars: [otherPosition, position], branches: pair.branches })
    }
    working.pillars[position] = { stem: layer.stem, branch: layer.branch }
    for (const god of strength.gods) {
      god.visibleMass = round(god.visible.reduce((sum, item) => sum + item.mass, 0))
      god.hiddenMass = round(god.roots.reduce((sum, item) => sum + item.mass, 0))
      god.rawMass = round(god.visibleMass + god.hiddenMass)
      god.strengthIndex = round(god.rawMass * god.season.multiplier)
      god.presence = !god.rawMass ? 'absent' : !god.visible.length ? 'hidden-only' : !god.roots.length ? 'visible-without-exact-root' : 'visible-with-exact-root'
      const locations = new Set([...god.visible, ...god.roots].map(item => item.position))
      god.interactions.push(...contacts.filter(item => item.pillars.some(p => locations.has(p))))
    }
    const after = evaluateStructureResolution({ chart: working, tenGodStrength: strength,
      focus: structure.selected?.god, structureStatus: structure.status, helpers: helperGods,
      cautions: structure.useful.cautionGods, transitMode: true })
    const changes = []
    const emit = (suffix, direction, text, god) => changes.push({ id: `${key}-transit-${suffix}`, layerKey: key, direction, god, text })
    for (const support of after.supports) {
      const previous = before.supports.find(item => item.god === support.god)
      if (support.index > (previous?.index ?? 0)) emit(`support-${support.god}`, 'support', `${layer.label} เพิ่มน้ำหนักกระตุ้นฝ่ายช่วย ${support.god}: ${previous?.index ?? 0} → ${support.index} · ${support.label}`, support.god)
      if (previous?.status === 'available' && support.status !== 'available') emit(`obstruct-${support.god}`, 'caution', `${layer.label} ทำให้ฝ่ายช่วย ${support.god} มีเงื่อนไขต้องตรวจเพิ่ม: ${support.label}`, support.god)
    }
    for (const opponent of after.conflicts) {
      const previous = before.conflicts.find(item => item.god === opponent.god)
      if (!previous || opponent.index > previous.index) emit(`conflict-${opponent.god}`, 'caution', `${layer.label} ${previous ? 'เพิ่มน้ำหนัก' : 'นำเข้าฝ่ายขัด'} ${opponent.god}: ${previous?.index ?? 0} → ${opponent.index} · ${opponent.label}`, opponent.god)
      for (const rescue of opponent.rescues) {
        const old = previous?.rescues.find(item => item.god === rescue.god)
        if (rescue.status === 'conditional-route' && old?.status !== 'conditional-route') emit(`rescue-${opponent.god}-${rescue.god}`, 'support', `${layer.label} เปิดทางแก้เสนอ: ${rescue.path} · ยังไม่ยืนยันว่าแก้สำเร็จ`, rescue.god)
        else if (old?.status === 'conditional-route' && rescue.status !== 'conditional-route') emit(`lost-rescue-${opponent.god}-${rescue.god}`, 'caution', `${layer.label} ทำให้ทางแก้ ${rescue.path} ติดเงื่อนไข: ${rescue.reasons.join(' / ')}`, rescue.god)
        else if (rescue.index > (old?.index ?? 0) && rescue.status !== 'conditional-route') emit(`pending-rescue-${opponent.god}-${rescue.god}`, 'review', `${layer.label} เพิ่มตัวแก้เสนอ ${rescue.god} แต่ยังไม่ผ่านเงื่อนไข: ${rescue.reasons.join(' / ')}`, rescue.god)
      }
    }
    if (before.focus?.status === 'available' && after.focus?.status !== 'available') emit('focus-obstructed', 'caution', `${layer.label} กระทบตำแหน่งโครงสร้างหลัก ต้องอ่านปฏิสัมพันธ์ร่วม`)
    for (const contact of contacts.filter(item => damaging.includes(item.type))) {
      const helperPositions = new Set([...before.supports, ...(before.focus ? [before.focus] : [])].flatMap(item => [...item.visibleAt, ...item.rootsAt]))
      if (contact.pillars.some(p => helperPositions.has(p))) emit(`contact-${contact.pillars[0]}-${contact.type}`, 'caution', `${layer.label} พบ ${contact.type} ${contact.branches.join('–')} กับตำแหน่ง ${contact.pillars[0]} ที่เกี่ยวข้องกับโครงสร้าง/ฝ่ายช่วย ยังไม่ถือว่าทำลายรากทันที`)
    }
    if (!changes.length) emit('none', 'neutral', `${layer.label} ยังไม่เปลี่ยนฝ่ายช่วย ฝ่ายขัด หรือทางแก้ในกฎที่ตรวจ`)
    const positive = changes.some(item => item.direction === 'support')
    const negative = changes.some(item => item.direction === 'caution')
    // A named structural candidate alone does not resolve uncertainty in useful gods.
    const unresolved = structure.status !== 'candidate' || !helperGods.length || structure.useful.helperCandidates.some(item => item.conflict)
    const status = unresolved ? 'unresolved' : positive && negative ? 'mixed' : negative ? 'caution'
      : positive && ['supported-candidate', 'conditional-rescue'].includes(after.status) ? 'supportive'
        : positive || changes.some(item => item.direction === 'review') ? 'unresolved' : 'neutral'
    layers.push({ key, label: layer.label, ganZhi: `${layer.stem}${layer.branch}`, god: calculateTenGod(chart.dayMaster.char, layer.stem), status,
      additions, contacts, changes,
      strengthChanges: strength.gods.filter(item => item.strengthIndex !== priorIndices.get(item.god)).map(item => ({ god: item.god, before: priorIndices.get(item.god), after: item.strengthIndex, delta: round(item.strengthIndex - priorIndices.get(item.god)) })),
      beforeStatus: before.status, afterStatus: after.status, resolution: after,
      text: `${layer.label} ${layer.stem}${layer.branch}: ${changes.map(item => item.text).join(' · ')}` })
    before = after
  }
  const day = layers.find(item => item.key === 'day')
  const background = layers.filter(item => item.key !== 'day')
  const backgroundCaution = background.some(item => ['caution', 'mixed'].includes(item.status))
  const status = day.status === 'supportive' && backgroundCaution ? 'mixed' : day.status === 'neutral' && backgroundCaution ? 'caution' : day.status
  return { ruleVersion: TRANSIT_RULE_VERSION, layers, day, background, status,
    summary: `${day.text}${backgroundCaution ? ' · ชั้นวัยจร/ปี/เดือนมีแรงขัดร่วม จึงไม่อ่านวันจรแยกเดี่ยว' : ''}`,
    limits: ['ใช้แบบจำลองกระตุ้นสะสม ไม่เปลี่ยนกิ่งเดือนเกิดหรือโครงสร้างพื้นดวงเป็นดวงใหม่',
      'น้ำหนักชั้นจรเป็นสูตรทดลอง ไม่ใช่การวัดกำลังจริงหรือเปอร์เซ็นต์ผลสำเร็จ',
      'ตรวจปฏิสัมพันธ์กิ่งเป็นคู่ระหว่างพื้นดวงและชั้นจร ยังไม่ยืนยันกลุ่มสามกิ่งหรือการแปรธาตุ',
      'ทางแก้จากดวงจรใช้การร่วมช่วงเวลาแทนระยะเสาพื้นดวง จึงยังเป็นข้อเสนอที่ต้องตรวจ',
      'ผลของวันคือสิ่งที่เพิ่มจากบริบทวัยจร/ปี/เดือน ไม่ถือว่าสัญญาณระยะยาวเกิดใหม่ทุกวัน'] }
}
