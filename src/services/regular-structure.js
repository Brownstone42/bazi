import { calculateTenGod } from '@openfate/bazi-engine'
import { assessDayMasterStrength, evaluateElementRoles } from './strength-engine.js'
import { assessTenGodStrength } from './ten-god-strength.js'
import { evaluateStructureResolution } from './structure-resolution.js'

export const STRUCTURE_RULE_VERSION = 'regular-structure/experimental-0.2'
export const structureSources = [
  'https://changxianyi.com/guji/ziping/nlc-yongshen-review-20261005/yongshen/',
  'https://changxianyi.com/guji/ziping/nlc-yongshen-review-20261005/yongshen-chengbai-jiuying/',
]
const stems = [...'甲乙丙丁戊己庚辛壬癸']
const elements = ['wood', 'wood', 'fire', 'fire', 'earth', 'earth', 'metal', 'metal', 'water', 'water']
const names = { 正官: 'ความรับผิดชอบ', 七杀: 'แรงผลักดัน', 正财: 'การจัดการทรัพย์', 偏财: 'โอกาสและทรัพยากร', 正印: 'แรงสนับสนุน', 偏印: 'ความรู้เฉพาะทาง', 食神: 'การสร้างสรรค์', 伤官: 'การแสดงออก', 比肩: 'พลังร่วม', 劫财: 'การแข่งขัน' }
const thaiElements = { wood: 'ไม้', fire: 'ไฟ', earth: 'ดิน', metal: 'ทอง', water: 'น้ำ' }
const positions = { year: 'ปี', month: 'เดือน', day: 'วัน', hour: 'ยาม' }
const peer = ['比肩', '劫财']
const resource = ['正印', '偏印']
const wealth = ['正财', '偏财']
const output = ['食神', '伤官']
const combinations = ['甲己', '乙庚', '丙辛', '丁壬', '戊癸']

// A deliberately bounded implementation of month-command candidates, NOT a claim
// that the book supplies this algorithm. Branch transformations, mixed-month
// priority, special/follow structures and full 成败救应 remain unresolved.
// 用神 here names the month-command focus; helpers (相神 candidates) are separate
// from the strength-balance heuristic. Never collapse the two into one good element.
export function analyzeRegularStructure(chart, assessment = assessDayMasterStrength(chart)) {
  const tenGodStrength = assessTenGodStrength(chart)
  const dm = chart.dayMaster.char
  const godStems = stems.map((stem, index) => ({ stem, element: elements[index], god: calculateTenGod(dm, stem) }))
  const visible = Object.entries(chart.pillars).filter(([position]) => position !== 'day')
    .map(([position, pillar]) => ({ position, stem: pillar.stem, god: calculateTenGod(dm, pillar.stem) }))
  const candidates = chart.pillars.month.hiddenStems.map((hidden, index) => ({
    stem: hidden.stem, god: calculateTenGod(dm, hidden.stem), main: hidden.isMain ?? index === 0,
    exposedAt: visible.filter(item => item.stem === hidden.stem).map(item => item.position),
    rootsAt: Object.entries(chart.pillars).filter(([, pillar]) => pillar.hiddenStems.some(item => item.stem === hidden.stem)).map(([position]) => position),
  }))
  const main = candidates.find(item => item.main) ?? candidates[0]
  const exposed = candidates.filter(item => item.exposedAt.length)
  // Multiple exposed candidates retained: do not silently pick an arbitrary winner.
  const selected = exposed.length === 1 ? exposed[0] : exposed.length === 0 ? main : null
  const reasons = []
  if (assessment.patternType !== 'regular') reasons.push('อาจเป็นโครงสร้างพิเศษ จึงไม่ใช้สูตรดวงปกติ')
  if (exposed.length > 1) reasons.push('ก้านซ่อนเดือนปรากฏหลายตัว ยังไม่ตัดสินโครงสร้างหลัก/รอง')
  if (selected && peer.includes(selected.god)) reasons.push('เดือนฝ่าย比劫ต้องใช้เกณฑ์建禄/月劫/羊刃เฉพาะ ซึ่งยังไม่รองรับ')
  if (['辰', '戌', '丑', '未'].includes(chart.pillars.month.branch)) reasons.push('เดือนคลังมีเงื่อนไข杂气 ต้องตรวจเพิ่มเติมก่อนเลือก用神')
  const monthGroups = (chart.interactions ?? []).filter(item => item.pillars.includes('month') && ['TRINE', 'DIRECTIONAL'].includes(item.type))
  if (monthGroups.length) reasons.push('พบกลุ่มกิ่งรวมที่เกี่ยวกับเดือน ยังไม่ยืนยันการแปรธาตุหรือเปลี่ยนโครงสร้าง')
  const status = reasons.length || !selected ? 'unresolved' : 'candidate'
  const evidence = candidates.map(item => ({ id: `structure-month-${item.stem}`, text: `ก้านซ่อนเดือน ${item.stem} เป็น ${item.god}${item.main ? ' (ก้านหลัก)' : ''} · ${item.exposedAt.length ? `ปรากฏที่ก้านฟ้าเสา${item.exposedAt.map(position => positions[position]).join('/')}` : 'ไม่ปรากฏตรงตัวบนก้านฟ้าปี/เดือน/ยาม'} · มีรากตรงก้านในเสา${item.rootsAt.map(position => positions[position]).join('/')}` }))
  const balance = evaluateElementRoles(chart.dayMaster.element, assessment.strengthLevel, assessment.patternType, {})
  const strong = ['strong', 'very_strong'].includes(assessment.strengthLevel)
  const weak = ['weak', 'very_weak'].includes(assessment.strengthLevel)
  const strengthResolved = assessment.structureClarity !== 'borderline' && (strong || weak)
  let helpers = [], cautions = [], path = ''
  if (status === 'candidate' && strengthResolved) {
    switch (selected.god) {
      case '正官':
        helpers = weak ? resource : wealth; cautions = ['伤官', '七杀']
        path = weak ? 'พิจารณา印รับแรง官และพยุงดิถี' : 'พิจารณา財หล่อเลี้ยง官 โดยต้องตรวจแรงกดดันร่วม'; break
      case '七杀':
        helpers = weak ? resource : ['食神']; cautions = wealth
        path = weak ? 'พิจารณา印เป็นทางรับแรง杀และสนับสนุนดิถี' : 'พิจารณา食神ควบคุม杀เมื่อดิถีรับการระบายได้'; break
      case '正财': case '偏财':
        helpers = weak ? peer : output; cautions = weak ? ['七杀'] : ['劫财']
        path = weak ? 'พิจารณาแรงพยุงดิถี แต่比劫อาจแข่งขันกับ財 จึงเป็นทางเลือกที่มีเงื่อนไข' : 'พิจารณา食伤สร้าง財เมื่อดิถีมีกำลังรับ'; break
      case '正印': case '偏印':
        helpers = strong ? output : ['正官']; cautions = wealth
        path = strong ? 'พิจารณาระบายผ่าน食伤เมื่อดิถีและ印มีกำลัง' : 'พิจารณา官หล่อเลี้ยง印 โดยต้องมี印รับแรงจริง'; break
      case '食神':
        helpers = strong ? wealth : peer; cautions = ['偏印']
        path = strong ? 'พิจารณา食神生財เมื่อดิถีรับการระบายได้' : 'พิจารณาพยุงดิถีก่อนเพิ่มการระบายผ่าน食神'; break
      case '伤官':
        helpers = strong ? wealth : ['正印']; cautions = ['正官']
        path = strong ? 'พิจารณา伤官生財เมื่อดิถีมีกำลัง' : 'พิจารณา印พยุงดิถีและกำกับ伤官 โดยยังต้องตรวจน้ำหนักทั้งคู่'; break
    }
  }
  const blockers = [...reasons]
  if (!strengthResolved) blockers.push('กำลังดิถีสมดุลหรือใกล้รอยต่อ ยังไม่เลือกระหว่างแนวพยุงกับระบาย')
  if (selected && visible.some(item => combinations.some(pair => pair.includes(item.stem) && pair.includes(selected.stem) && item.stem !== selected.stem))) blockers.push('ก้านโครงสร้างมีคู่ประสาน ต้องตรวจการผูก/แปรธาตุก่อนสรุปตัวช่วย')
  const structuralTensions = cautions.filter(god => visible.some(item => item.god === god))
  if (structuralTensions.length) blockers.push(`พบ ${structuralTensions.join('/')} บนก้านฟ้าที่อาจขัดกับทางเลือก ต้องอ่านเงื่อนไขแก้ร่วม`)
  if (selected && wealth.includes(selected.god) && weak) blockers.push('แรงพยุง比劫กับการรักษา財มีข้อขัดกัน ยังไม่สรุปตัวช่วยเดียว')
  if (selected?.god === '偏印' && strong && helpers.includes('食神')) blockers.push('偏印กับ食神ต้องตรวจเงื่อนไข夺食ก่อนใช้แนวระบาย')
  const climate = { status: assessment.climateAdjustment.required ? 'limited-signal' : 'not-assessed', ...assessment.climateAdjustment,
    text: assessment.climateAdjustment.required ? 'สูตรเดิมพบดินในฤดูเย็นและไฟน้อย: พิจารณาไฟเฉพาะด้านปรับอากาศ ยังไม่ใช้แทน用神เชิงโครงสร้าง' : 'ยังไม่มีการประเมิน调候ครบทุกดิถีและฤดู ไม่ได้แปลว่าไม่ต้องปรับอากาศ' }
  const helperCandidates = helpers.map(god => {
    const target = godStems.find(item => item.god === god)
    const balanceRole = balance.elementAssessments[target.element].status
    const conflict = balanceRole === 'caution' || cautions.includes(god)
    return { ...target, balanceRole, conflict, strength: tenGodStrength.gods.find(item => item.god === god),
      presentAt: visible.filter(item => item.god === god).map(item => item.position),
      rootsAt: Object.entries(chart.pillars).filter(([, pillar]) => pillar.hiddenStems.some(item => item.stem === target.stem)).map(([position]) => position) }
  })
  if (helperCandidates.some(item => item.conflict)) blockers.push('ตัวช่วยเชิงโครงสร้างขัดกับเกณฑ์สมดุลบางตัว ต้องพิจารณาเป็นทางเลือก')
  const resolution = evaluateStructureResolution({ chart, tenGodStrength, focus: selected?.god, structureStatus: status, helpers, cautions })
  if (resolution.status !== 'supported-candidate') blockers.push(resolution.summary)
  const usefulStatus = blockers.length ? 'unresolved' : 'conditional'
  evidence.push({ id: 'structure-strength', text: `กำลังดิถี ${assessment.strengthLevel} · ความชัด ${assessment.structureClarity} ตามเกณฑ์ ${assessment.ruleVersion}` })
  evidence.push({ id: 'structure-path', text: path || 'ยังไม่เลือกทาง用神 เพราะเงื่อนไขโครงสร้างหรือกำลังดิถียังไม่ชัด' })
  blockers.forEach((text, index) => evidence.push({ id: `structure-block-${index}`, text }))
  evidence.push(...resolution.evidence)
  return { ruleVersion: STRUCTURE_RULE_VERSION, tenGodStrength, resolution, status, candidates, selected, evidence, sources: structureSources,
    label: selected ? `${selected.god}格 · ${names[selected.god]} (โครงสร้างเสนอ)` : 'มีหลายโครงสร้างที่ต้องพิจารณา',
    useful: { status: usefulStatus, monthFocus: selected?.god ?? null, helperCandidates, cautionGods: cautions, path, blockers },
    balance, climate,
    limits: ['กฎเดือนเกิดและแนวตัวช่วยเป็นขอบเขตทดลอง ไม่ใช่การยืนยัน成格หรือ用神ขั้นสุดท้าย', ...resolution.limits, 'สมดุลใช้ strength/0.2.0 แยกจากโครงสร้าง ไม่ใช่คะแนนความแม่นยำ'] }
}

export function evaluateStructureTransit(structure, layer) {
  const helper = structure.useful.helperCandidates.find(item => item.god === layer.god)
  const caution = structure.useful.cautionGods.includes(layer.god)
  const element = elements[stems.indexOf(layer.stem)]
  const balanceRole = structure.balance.elementAssessments[element]?.status ?? 'unresolved'
  const conflict = (helper && balanceRole === 'caution') || (caution && ['primary', 'supportive'].includes(balanceRole))
  const status = structure.useful.status === 'unresolved' ? 'unresolved' : conflict ? 'mixed' : caution ? 'caution' : helper ? 'supportive' : 'neutral'
  const detail = helper ? 'ตรงตัวช่วยที่เสนอ' : caution ? 'ตรงบทบาทที่ต้องตรวจแรงขัดกับโครงสร้าง' : 'ไม่ตรงตัวช่วยหรือบทบาทระวังที่เลือกในแนวนี้'
  const text = `${layer.label} ${layer.ganZhi} (${layer.god}): ${detail} · ธาตุ${thaiElements[element]}มีบทบาทสมดุล ${balanceRole}${status === 'unresolved' ? ' · ยังใช้ฟันธงไม่ได้เพราะ用神ยังไม่ชัด' : conflict ? ' · สองแนวให้ผลขัดกัน' : ' · เป็นเงื่อนไขประกอบ ไม่รับรองเหตุการณ์'}`
  return { id: `${layer.key}-structure`, layerKey: layer.key, kind: 'structure', status, text,
    sourceIds: structure.evidence.map(item => item.id), god: layer.god, balanceRole }
}
