export const RESOLUTION_RULE_VERSION = 'structure-resolution/experimental-0.1'
const source = 'https://changxianyi.com/guji/ziping/nlc-yongshen-review-20261005/yongshen-chengbai-jiuying/'
const order = ['year', 'month', 'day', 'hour']
const stemPairs = ['甲己', '乙庚', '丙辛', '丁壬', '戊癸']
const labels = { absent: 'ไม่พบตัวนี้ในพื้นดวง', latent: 'พบเฉพาะก้านซ่อน ยังไม่ถือว่าทำงานเปิดเผย', unrooted: 'ปรากฏแต่ยังไม่มีรากตรงก้าน', weak: 'น้ำหนักยังน้อยตามสูตรทดลอง', obstructed: 'มีปฏิสัมพันธ์หรือคู่ประสานที่ต้องตรวจเพิ่ม', available: 'มีก้านฟ้า ราก และน้ำหนักรองรับเบื้องต้น' }

// Bounded readings of 成败救应, not an exhaustive classical evaluator.
// Numerical sufficiency (index >= 1, rescue >= opposing index) and adjacency
// are conservative APP review gates, not thresholds prescribed by the source.
// Never sum rescue gods into a fictional combined rescuer or assert 成格/破格.
function rescueRules(focus, threat, helperGods) {
  if (focus === '正官' && threat === '伤官') return [{ gods: ['正印', '偏印'], label: '印กำกับ伤官เพื่อรักษา官', blockedBy: ['正财', '偏财'] }]
  if (['正财', '偏财'].includes(focus) && threat === '劫财') return [
    { gods: ['食神'], label: '食神ระบาย劫แล้วส่งต่อไป財', blockedBy: ['偏印'] },
    { gods: ['正官'], label: '官กำกับ劫เพื่อรักษา財', blockedBy: ['伤官', '七杀'] },
  ]
  if (['正印', '偏印'].includes(focus) && ['正财', '偏财'].includes(threat)) return [{ gods: ['劫财'], label: '劫กำกับ財เพื่อรักษา印', blockedBy: ['正官', '七杀'] }]
  if (focus === '食神' && threat === '偏印') return [{ gods: ['正财', '偏财'], label: '財กำกับ偏印เพื่อรักษา食神', blockedBy: ['劫财'] }]
  if (focus === '七杀' && threat === '偏印' && helperGods.includes('食神')) return [{ gods: ['正财', '偏财'], label: '財กำกับ印เพื่อรักษา食神ที่ใช้คุม杀', blockedBy: ['劫财'] }]
  return [] // E.g. 官杀混杂 and stem binding require positional/transform rules.
}

export function evaluateStructureResolution({ chart, tenGodStrength, focus, structureStatus, helpers, cautions, transitMode = false }) {
  const byGod = new Map(tenGodStrength.gods.map(item => [item.god, item]))
  function capacity(god) {
    const strength = byGod.get(god)
    if (!strength) throw new Error('ข้อมูลกำลังสิบเทพไม่ครบสำหรับตรวจโครงสร้าง')
    const bindings = Object.entries(chart.pillars).filter(([, pillar]) => pillar.stem !== strength.stem && stemPairs.some(pair => pair.includes(pillar.stem) && pair.includes(strength.stem)))
      .filter(() => strength.visible.length).map(([position, pillar]) => ({ position, stem: pillar.stem }))
    const status = strength.presence === 'absent' ? 'absent' : !strength.visible.length ? 'latent' : !strength.roots.length ? 'unrooted' : strength.strengthIndex < 1 ? 'weak' : strength.interactions.length || bindings.length ? 'obstructed' : 'available'
    return { god, stem: strength.stem, index: strength.strengthIndex, status, label: labels[status],
      visibleAt: strength.visible.map(item => item.position), rootsAt: strength.roots.map(item => item.position),
      bindings, interactions: structuredClone(strength.interactions), sourceIds: strength.evidence.map(item => item.id) }
  }
  const focusCapacity = focus ? capacity(focus) : null
  const supports = helpers.map(god => ({ id: `resolution-support-${god}`, ...capacity(god) }))
  // Include threats to an actual selected control path, not just the month focus.
  const threats = [...new Set([...cautions, ...(focus === '七杀' && helpers.includes('食神') ? ['偏印'] : [])])]
  const conflicts = threats.map(capacity).filter(item => item.status !== 'absent').map(opponent => {
    const rules = rescueRules(focus, opponent.god, helpers)
    const rescues = rules.flatMap(rule => rule.gods.map(god => {
      const candidate = capacity(god)
      const impediments = rule.blockedBy.map(capacity).filter(item => item.status !== 'absent')
      // Co-active transits are temporal contacts, never invented natal positions.
      const near = candidate.visibleAt.some(a => opponent.visibleAt.some(b =>
        transitMode && (a.startsWith('transit-') || b.startsWith('transit-'))
          ? true : order.includes(a) && order.includes(b) && Math.abs(order.indexOf(a) - order.indexOf(b)) <= 1))
      const reasons = []
      if (candidate.status !== 'available') reasons.push(candidate.label)
      if (candidate.index < opponent.index) reasons.push(`น้ำหนักตัวแก้ ${candidate.index} ต่ำกว่าฝ่ายขัด ${opponent.index} ตามสูตรทดลอง`)
      if (!near) reasons.push('ยังไม่พบก้านฟ้าตัวแก้ใกล้ก้านฝ่ายขัด ต้องตรวจเส้นทางการทำงาน')
      if (impediments.length) reasons.push(`พบตัวที่อาจขัดเส้นทางแก้: ${impediments.map(item => `${item.god} (${item.label})`).join(' / ')}`)
      if (opponent.status !== 'available') reasons.push('ฝ่ายขัดเองยังมีเงื่อนไขไม่ชัด จึงยังไม่ตัดสินผลแพ้ชนะ')
      if (focusCapacity?.status !== 'available') reasons.push('โครงสร้างหลักยังมีเงื่อนไขด้านกำลังหรือตำแหน่ง')
      if (structureStatus !== 'candidate') reasons.push('ยังไม่ได้เลือกโครงสร้างหลักที่อยู่ในขอบเขตสูตร')
      const status = candidate.status === 'absent' ? 'missing' : reasons.length ? 'needs-review' : 'conditional-route'
      return { id: `resolution-rescue-${opponent.god}-${god}`, ...candidate, status, capacityStatus: candidate.status, path: rule.label, reasons, impediments,
        label: status === 'missing' ? 'ยังไม่พบตัวแก้ในพื้นดวง' : status === 'conditional-route' ? 'พบทางแก้ที่มีฐานรองรับตามเกณฑ์ทดลอง ยังไม่ยืนยันว่าแก้สำเร็จ' : 'มีตัวแก้เสนอ แต่ยังติดเงื่อนไข' }
    }))
    return { id: `resolution-conflict-${opponent.god}`, ...opponent, rescues,
      routeStatus: rescues.some(item => item.status === 'conditional-route') ? 'conditional-route' : rules.length ? 'not-established' : 'not-covered' }
  })
  const activeSupport = supports.some(item => item.status === 'available')
  const unresolvedConflict = conflicts.some(item => item.routeStatus !== 'conditional-route')
  const status = structureStatus !== 'candidate' ? 'out-of-scope'
    : focusCapacity?.status !== 'available' ? 'focus-needs-review'
      : unresolvedConflict ? 'conflict-needs-review'
        : conflicts.length ? 'conditional-rescue'
          : activeSupport ? 'supported-candidate' : 'support-not-established'
  const summaries = {
    'out-of-scope': 'ยังไม่สรุปการช่วยหรือแก้ เพราะโครงสร้างหลักยังไม่ชัดหรืออยู่นอกขอบเขต',
    'focus-needs-review': 'กำลังหรือตำแหน่งของโครงสร้างหลักยังต้องตรวจเพิ่ม',
    'conflict-needs-review': 'พบฝ่ายขัด แต่ยังไม่มีทางแก้ที่ผ่านเงื่อนไขครบในสูตรนี้',
    'conditional-rescue': 'พบฝ่ายขัดและทางแก้ที่มีฐานรองรับเบื้องต้น ยังไม่ยืนยันว่าแก้สำเร็จ',
    'supported-candidate': 'พบตัวช่วยที่มีก้านฟ้า ราก และน้ำหนักรองรับ ไม่พบฝ่ายขัดในกฎที่ตรวจ',
    'support-not-established': 'ตัวช่วยที่เสนออาจไม่ปรากฏหรือยังมีกำลัง/ตำแหน่งไม่พร้อม',
  }
  const evidence = [...(focusCapacity ? [{ id: 'resolution-focus', text: `โครงสร้าง ${focus}: ${focusCapacity.label} · ดัชนี ${focusCapacity.index}` }] : []),
    ...supports.map(item => ({ id: item.id, text: `ฝ่ายช่วย ${item.god}: ${item.label} · ดัชนี ${item.index}` })),
    ...conflicts.flatMap(item => [{ id: item.id, text: `ฝ่ายขัด ${item.god}: ${item.label} · ดัชนี ${item.index}${item.routeStatus === 'not-covered' ? ' · ยังไม่มีกฎแก้กรณีนี้' : ''}` },
      ...item.rescues.map(rescue => ({ id: rescue.id, text: `${rescue.path}: ${rescue.label}${rescue.reasons.length ? ` · ${rescue.reasons.join(' / ')}` : ''}` }))])]
  return { ruleVersion: RESOLUTION_RULE_VERSION, source, status, summary: summaries[status], focus: focusCapacity, supports, conflicts, evidence,
    limits: ['เกณฑ์กำลังขั้นต่ำ การเทียบน้ำหนัก และระยะตำแหน่งเป็นเกณฑ์ทดลองของแอป ไม่ใช่สูตรตัวเลขจากตำรา',
      'ไม่รวมกำลังตัวแก้หลายตัวเข้าด้วยกัน ไม่ลบฝ่ายขัดเมื่อพบชื่อของตัวแก้',
      'ตรวจบางเส้นทางของ成败救应 ยังไม่ยืนยัน成格/破格 การแปรธาตุ หรือผลเหตุการณ์จริง',
      'การตรวจนี้ใช้พื้นดวง ยังไม่ได้คำนวณว่าดวงจรเปลี่ยนกำลังหรือแก้โครงสร้างใหม่อย่างไร'] }
}
