export const elementSymbols = {
  wood: { color: 'เขียว', swatch: '#527c52', numbers: [3, 8] },
  fire: { color: 'แดง', swatch: '#b94343', numbers: [2, 7] },
  earth: { color: 'เหลือง', swatch: '#d4ac45', numbers: [5, 10] },
  metal: { color: 'ขาว', swatch: '#fff', numbers: [4, 9] },
  water: { color: 'ดำ', swatch: '#30343a', numbers: [1, 6] },
}
export function guideSymbols(assessment, balance) {
  const caution = assessment.cautionElements ?? []
  const eligible = element => elementSymbols[element] && !caution.includes(element) && !['unresolved', 'neutral', 'caution'].includes(assessment.elementAssessments?.[element]?.status)
  const candidates = balance?.options?.length ? balance.options.map(o => o.element)
    : (!assessment.patternType || assessment.patternType === 'regular') ? [assessment.primaryUsefulElement] : []
  const options = [...new Set(candidates)].filter(eligible).map(element => ({ element, ...elementSymbols[element] }))
  return { options, avoid: caution.filter(e => elementSymbols[e]).map(e => elementSymbols[e].color), numbers: [...new Set(options.flatMap(o => o.numbers))], basis: balance?.options?.length ? 'ธาตุช่วยสมดุลวันนี้' : 'ธาตุเกื้อหนุนพื้นดวง' }
}
export function mergeBestHours(hours) {
  const peak = Math.max(...hours.map(h => h.score))
  const merged = []
  for (const hour of hours.filter(h => h.score === peak && peak > 60)) {
    const last = merged.at(-1)
    if (last?.end === hour.start) last.end = hour.end
    else merged.push({ start: hour.start, end: hour.end })
  }
  return merged.map(h => `${String(h.start).padStart(2, '0')}:00–${String(h.end - 1).padStart(2, '0')}:59`)
}
