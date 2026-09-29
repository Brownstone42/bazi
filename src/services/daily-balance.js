const styles = {
  wood: { name: 'ไม้', color: 'เขียว', swatch: '#527c52' },
  fire: { name: 'ไฟ', color: 'แดง', swatch: '#b94343' },
  earth: { name: 'ดิน', color: 'เหลือง', swatch: '#d4ac45' },
  metal: { name: 'ทอง', color: 'ขาว', swatch: '#ffffff' },
  water: { name: 'น้ำ', color: 'ดำ', swatch: '#30343a' }
}

const produces = { wood: 'fire', fire: 'earth', earth: 'metal', metal: 'water', water: 'wood' }
const controls = { wood: 'earth', earth: 'water', water: 'fire', fire: 'metal', metal: 'wood' }

// Experimental symbolic guidance, not a new Useful God calculation or a remedy.
// Stem/branch weights match the calendar's 1 / 0.7 elemental contributions.
// Offer all eligible draining/controlling options, without ranking them.
// Never recommend an element that feeds another daily caution contributor.
// Never feed suggestions back into day scoring.
export function buildDailyBalance({ assessment, dayElements, personalScore }) {
  if (personalScore >= 50 || !Number.isFinite(personalScore)) return null
  if (assessment.patternType && assessment.patternType !== 'regular') return null
  const caution = assessment.cautionElements ?? []
  const weights = new Map()
  dayElements.forEach((element, index) => {
    if (styles[element] && caution.includes(element)) weights.set(element, (weights.get(element) ?? 0) + (index === 0 ? 1 : 0.7))
  })
  const dailyCaution = [...weights.keys()].sort((a, b) => weights.get(b) - weights.get(a))
  if (!dailyCaution.length) return null
  const candidates = [assessment.primaryUsefulElement, ...(assessment.supportiveElements ?? []), assessment.supportiveElement]
  const eligible = [...new Set(candidates)].filter(candidate => styles[candidate] && !caution.includes(candidate)
    && !dailyCaution.includes(produces[candidate])
    && !['unresolved', 'caution', 'neutral'].includes(assessment.elementAssessments?.[candidate]?.status))
  // If no eligible element addresses the main contributor, omit the advice;
  // do not quietly switch to a weaker factor just to produce a color.
  const target = dailyCaution[0]
  const options = eligible.filter(element => produces[target] === element || controls[element] === target).map(element => {
    const method = produces[target] === element ? 'drain' : 'control'
    const style = styles[element]
    return {
      element, method, elementName: style.name, color: style.color, swatch: style.swatch,
      reason: `ตามวงจรห้าธาตุ ธาตุ${style.name}${method === 'drain' ? 'รับพลังต่อจากธาตุ' : 'ช่วยควบคุมธาตุ'}${styles[target].name} และอยู่ในกลุ่มที่ช่วยสมดุลพื้นดวงคุณ`,
      suggestion: `ลองเลือกเสื้อสี${style.color} หรือใช้สี${style.color}กับกระเป๋า ผ้าพันคอ หรือเครื่องประดับเพียงชิ้นเดียว`
    }
  })
  if (!options.length) return null
  return {
    target,
    options,
    reason: `ธาตุ${styles[target].name}เป็นธาตุที่ถ่วงคะแนนมากที่สุดของวันนี้`,
    suggestion: options.length > 1 ? 'เลือกใช้สีใดสีหนึ่งที่ชอบได้ ไม่จำเป็นต้องใช้ทุกสี ใช้ของที่มีอยู่ได้ ไม่ต้องซื้อใหม่' : 'ใช้ของที่มีอยู่ได้ ไม่ต้องซื้อใหม่',
    reduce: `หากอยากเลือกสีตามธาตุ วันนี้ลดการใช้สี${dailyCaution.map(item => styles[item].color).join('และสี')}เป็นสีหลักของชุดได้`,
  }
}
