import {
  DAY_MASTER_MATRIX_VERSION,
  getDayMasterStrengthReading
} from './day-master-strength-matrix'

const stems = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
const candidateLabels = ['A', 'B', 'C']

function stableHash(value) {
  return [...value].reduce((hash, character) => {
    return ((hash << 5) - hash + character.codePointAt(0)) | 0
  }, 0) >>> 0
}

function pickDistractors(dayMaster, seed) {
  const actualIndex = stems.indexOf(dayMaster)
  if (actualIndex < 0) throw new Error(`ไม่รู้จักดิถี ${dayMaster}`)

  const start = stableHash(seed) % stems.length
  const candidates = []
  for (let offset = 0; candidates.length < 2; offset += 1) {
    const stem = stems[(start + offset * 3 + 1) % stems.length]
    if (stem !== dayMaster && !candidates.includes(stem)) candidates.push(stem)
  }
  return candidates
}

export function createBlindTest(dayMaster, strengthLevel, seed = '') {
  const distractors = pickDistractors(dayMaster, `${seed}:distractors`)
  const answerPosition = stableHash(`${seed}:position`) % candidateLabels.length
  const orderedStems = [...distractors]
  orderedStems.splice(answerPosition, 0, dayMaster)

  const candidates = orderedStems.map((stem, index) => {
    const reading = getDayMasterStrengthReading(stem, strengthLevel)
    return {
      id: candidateLabels[index],
      identity: reading.identity,
      work: reading.work,
      relationship: reading.relationship,
      risk: reading.risk
    }
  })

  return {
    candidates,
    answerId: candidateLabels[answerPosition],
    dayMaster,
    strengthLevel,
    contentVersion: DAY_MASTER_MATRIX_VERSION
  }
}

export function evaluateBlindTest(test, selectedId) {
  if (!test.candidates.some((candidate) => candidate.id === selectedId)) {
    throw new Error('กรุณาเลือกคำอ่านหนึ่งชุดก่อนส่งคำตอบ')
  }

  return {
    selectedId,
    answerId: test.answerId,
    isCorrect: selectedId === test.answerId
  }
}
