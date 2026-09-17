const elements = ['wood', 'fire', 'earth', 'metal', 'water']

const produces = {
  wood: 'fire',
  fire: 'earth',
  earth: 'metal',
  metal: 'water',
  water: 'wood'
}

const controls = {
  wood: 'earth',
  earth: 'water',
  water: 'fire',
  fire: 'metal',
  metal: 'wood'
}

const producerOf = Object.fromEntries(Object.entries(produces).map(([from, to]) => [to, from]))

const seasonalStrength = {
  寅: { wood: 4, fire: 2, earth: -2, metal: -4, water: 1 },
  卯: { wood: 4, fire: 2, earth: -2, metal: -4, water: 1 },
  辰: { wood: 1, fire: -1, earth: 3, metal: -1, water: 0 },
  巳: { wood: 1, fire: 4, earth: 2, metal: -4, water: -3 },
  午: { wood: 1, fire: 4, earth: 2, metal: -4, water: -3 },
  未: { wood: 0, fire: 1, earth: 3, metal: -1, water: -2 },
  申: { wood: -4, fire: -3, earth: 1, metal: 4, water: 2 },
  酉: { wood: -4, fire: -3, earth: 1, metal: 4, water: 2 },
  戌: { wood: -1, fire: 0, earth: 3, metal: 1, water: -2 },
  亥: { wood: 2, fire: -4, earth: -3, metal: 1, water: 4 },
  子: { wood: 2, fire: -4, earth: -3, metal: 1, water: 4 },
  丑: { wood: -1, fire: -2, earth: 3, metal: 0, water: 1 }
}

const positionWeight = { year: 1, month: 1.3, day: 1.2, hour: 1 }
const earthMonths = new Set(['辰', '戌', '丑', '未'])
const coldMonths = new Set(['亥', '子', '丑'])
const elementThai = { wood: 'ไม้', fire: 'ไฟ', earth: 'ดิน', metal: 'ทอง', water: 'น้ำ' }
const polarityThai = { yang: 'หยาง', yin: 'หยิน' }
const pillarThai = { year: 'ปี', month: 'เดือน', day: 'วัน', hour: 'ยาม' }
const strengthThai = { very_strong: 'แข็งมาก', strong: 'แข็ง', balanced: 'สมดุล', weak: 'อ่อน', very_weak: 'อ่อนมาก' }
const branchThai = {
  子: ['ชวด', 'yang'], 丑: ['ฉลู', 'yin'], 寅: ['ขาล', 'yang'], 卯: ['เถาะ', 'yin'],
  辰: ['มะโรง', 'yang'], 巳: ['มะเส็ง', 'yin'], 午: ['มะเมีย', 'yang'], 未: ['มะแม', 'yin'],
  申: ['วอก', 'yang'], 酉: ['ระกา', 'yin'], 戌: ['จอ', 'yang'], 亥: ['กุน', 'yin']
}

function stemWithThai(char, element, polarity) {
  return `${char} (${elementThai[element]}${polarityThai[polarity]})`
}

function branchWithThai(char, element) {
  const [animal, polarity] = branchThai[char] ?? [char, 'yang']
  return `${char} (${animal} · ${elementThai[element]}${polarityThai[polarity]})`
}

function relationToDayMaster(dayMaster, target) {
  if (target === dayMaster) return 'self'
  if (produces[target] === dayMaster) return 'resource'
  if (produces[dayMaster] === target) return 'output'
  if (controls[dayMaster] === target) return 'wealth'
  if (controls[target] === dayMaster) return 'power'
  return 'neutral'
}

function pushEvidence(evidence, item) {
  evidence.push({
    id: `${item.rule}:${evidence.length + 1}`,
    sourcePillars: [],
    sourceCharacters: [],
    ...item
  })
}

function collectElementPresence(chart) {
  const totals = Object.fromEntries(elements.map((element) => [element, 0]))
  Object.values(chart.pillars).filter(Boolean).forEach((pillar) => {
    totals[pillar.element] += 2
    pillar.hiddenStems.forEach((hidden, index) => {
      totals[hidden.element] += index === 0 ? 1 : index === 1 ? 0.6 : 0.35
    })
  })
  return totals
}

function classifyStrength(score) {
  if (score >= 7) return 'very_strong'
  if (score >= 1.5) return 'strong'
  if (score > -2) return 'balanced'
  if (score > -8) return 'weak'
  return 'very_weak'
}

function assessClarity({ score, monthBranch, possibleSpecial, boundaryWarning }) {
  if (possibleSpecial || boundaryWarning) return 'borderline'
  const boundaries = [-8, -2, 1.5, 7]
  const nearBoundary = boundaries.some((boundary) => Math.abs(score - boundary) < 0.9)
  if (nearBoundary || earthMonths.has(monthBranch)) return 'borderline'
  return Math.abs(score) >= 4 ? 'clear' : 'fairly_clear'
}

function chooseUsefulElements(dayMaster, strengthLevel, patternType, climate) {
  if (patternType !== 'regular') {
    return { primaryUsefulElement: null, supportiveElement: null, cautionElements: [] }
  }

  const resource = producerOf[dayMaster]
  const output = produces[dayMaster]
  const wealth = produces[output]

  if (climate.required && climate.preferredElement) {
    return {
      primaryUsefulElement: climate.preferredElement,
      supportiveElement: climate.preferredElement === resource ? dayMaster : resource,
      cautionElements: [controls[dayMaster]]
    }
  }

  if (strengthLevel === 'weak' || strengthLevel === 'very_weak') {
    return {
      primaryUsefulElement: resource,
      supportiveElement: dayMaster,
      cautionElements: [output, wealth, producerOf[resource]].filter((value, index, list) => list.indexOf(value) === index)
    }
  }

  return {
    primaryUsefulElement: output,
    supportiveElement: wealth,
    cautionElements: [dayMaster, resource]
  }
}

export function assessDayMasterStrength(chart, options = {}) {
  const evidence = []
  const dayMaster = chart.dayMaster.element
  const monthBranch = chart.pillars.month.branch
  const seasonScore = seasonalStrength[monthBranch]?.[dayMaster] ?? 0
  let rootScore = 0
  let visibleSupportScore = 0
  let hiddenResourceScore = 0
  let pressureScore = 0

  pushEvidence(evidence, {
    rule: 'seasonal_command',
    direction: seasonScore > 0 ? 'support' : seasonScore < 0 ? 'control' : 'neutral',
    impact: Math.abs(seasonScore) >= 3 ? 'major' : Math.abs(seasonScore) >= 1 ? 'medium' : 'minor',
    contribution: seasonScore,
    sourcePillars: ['month'],
    sourceCharacters: [monthBranch],
    message: `กิ่งเดือน ${branchWithThai(monthBranch, chart.pillars.month.branchElement)} ให้ค่าน้ำหนักฤดูกาล ${seasonScore > 0 ? 'สนับสนุน' : seasonScore < 0 ? 'ถ่วง' : 'เป็นกลาง'}ต่อดิถี`
  })

  Object.entries(chart.pillars).filter(([, pillar]) => Boolean(pillar)).forEach(([position, pillar]) => {
    if (position !== 'day') {
      const relation = relationToDayMaster(dayMaster, pillar.element)
      if (relation === 'self' || relation === 'resource') {
        const contribution = relation === 'self' ? 1.5 : 1.25
        visibleSupportScore += contribution
        pushEvidence(evidence, {
          rule: 'visible_support',
          direction: 'support',
          impact: 'medium',
          contribution,
          sourcePillars: [position],
          sourceCharacters: [pillar.stem],
          message: `ก้านฟ้า ${stemWithThai(pillar.stem, pillar.element, pillar.stemPolarity)} ที่เสา${pillarThai[position]} ให้แรง${relation === 'self' ? '同党 (พวกเดียวกัน)' : '印 (ทรัพยากรสนับสนุน)'}แก่ดิถี`
        })
      } else if (['output', 'wealth', 'power'].includes(relation)) {
        const contribution = relation === 'power' ? 1.4 : 1.15
        pressureScore += contribution
        pushEvidence(evidence, {
          rule: 'visible_drain_or_pressure',
          direction: relation === 'power' ? 'control' : 'drain',
          impact: 'medium',
          contribution: -contribution,
          sourcePillars: [position],
          sourceCharacters: [pillar.stem],
          message: `ก้านฟ้า ${stemWithThai(pillar.stem, pillar.element, pillar.stemPolarity)} ที่เสา${pillarThai[position]} ทำหน้าที่เป็นแรง${relation === 'power' ? 'ควบคุม' : 'ระบาย/ภาระ'}ต่อดิถี`
        })
      }
    }

    pillar.hiddenStems.forEach((hidden, index) => {
      const relation = relationToDayMaster(dayMaster, hidden.element)
      const qiWeight = index === 0 ? 2 : index === 1 ? 1.2 : 0.7
      const locationWeight = positionWeight[position]
      if (hidden.element === dayMaster) {
        const exactStemBonus = hidden.stem === chart.dayMaster.char ? 0.25 : 0
        // รากสำคัญต่อการยืนยันว่าดิถีมีฐาน แต่ไม่ควรนับเต็มเท่าก้านเปิดเผยทุกตัว
        const contribution = (qiWeight + exactStemBonus) * locationWeight * 0.35
        rootScore += contribution
        pushEvidence(evidence, {
          rule: 'day_master_root',
          direction: 'support',
          impact: index === 0 ? 'major' : index === 1 ? 'medium' : 'minor',
          contribution,
          sourcePillars: [position],
          sourceCharacters: [pillar.branch, hidden.stem],
          message: `ดิถีมีราก${index === 0 ? 'หลัก' : index === 1 ? 'กลาง' : 'ปลาย'}ในกิ่ง ${branchWithThai(pillar.branch, pillar.branchElement)} จากก้านซ่อน ${stemWithThai(hidden.stem, hidden.element, hidden.polarity)}`
        })
      } else if (relation === 'resource') {
        const contribution = (index === 0 ? 0.8 : index === 1 ? 0.45 : 0.25) * locationWeight
        hiddenResourceScore += contribution
      } else if (['output', 'wealth', 'power'].includes(relation)) {
        pressureScore += (index === 0 ? 0.7 : index === 1 ? 0.4 : 0.22) * locationWeight
      }
    })
  })

  if (hiddenResourceScore > 0) {
    pushEvidence(evidence, {
      rule: 'hidden_resource',
      direction: 'support',
      impact: hiddenResourceScore >= 1.5 ? 'medium' : 'minor',
      contribution: hiddenResourceScore,
      message: 'มีก้านซ่อนฝ่าย印ช่วยสนับสนุนดิถี'
    })
  }

  const seasonalRootSynergy = seasonScore >= 2 && rootScore >= 0.7 ? 1.5 : 0
  if (seasonalRootSynergy > 0) {
    pushEvidence(evidence, {
      rule: 'seasonal_root_synergy',
      direction: 'support',
      impact: 'medium',
      contribution: seasonalRootSynergy,
      sourcePillars: ['month'],
      sourceCharacters: [monthBranch],
      message: 'ดิถีได้ฤดูกาลและมีรากรองรับ จึงใช้กำลังตามฤดูกาลได้จริง'
    })
  }

  const rawScore = seasonScore + rootScore + visibleSupportScore + hiddenResourceScore + seasonalRootSynergy - pressureScore
  const score = Math.round(rawScore * 100) / 100
  const strengthLevel = classifyStrength(score)
  const possibleFollow = strengthLevel === 'very_weak' && rootScore < 0.4 && visibleSupportScore < 1 && seasonScore <= 1
  const possibleDominant = strengthLevel === 'very_strong' && pressureScore < 1.5
  const patternType = possibleFollow ? 'possible_follow' : possibleDominant ? 'possible_dominant' : 'regular'
  const elementPresence = collectElementPresence(chart)
  const coldAndFireScarce = coldMonths.has(monthBranch) && elementPresence.fire <= 2
  const climate = {
    required: coldAndFireScarce && dayMaster === 'earth',
    condition: coldAndFireScarce ? 'cold' : null,
    preferredElement: coldAndFireScarce ? 'fire' : null
  }
  const boundaryWarning = Boolean(options.boundaryWarning)
  const structureClarity = assessClarity({ score, monthBranch, possibleSpecial: patternType !== 'regular', boundaryWarning })
  const useful = chooseUsefulElements(dayMaster, strengthLevel, patternType, climate)

  chart.interactions
    .filter((interaction) => interaction.type.startsWith('COMBINATION'))
    .forEach((interaction) => {
      pushEvidence(evidence, {
        rule: 'combination_without_confirmed_transformation',
        direction: 'uncertain',
        impact: 'medium',
        contribution: 0,
        sourcePillars: interaction.pillars,
        sourceCharacters: interaction.branches,
        message: `พบการรวม ${interaction.branches.map((branch, index) => branchWithThai(branch, chart.pillars[interaction.pillars[index]]?.branchElement)).join(' กับ ')} แต่ยังไม่ถือว่าแปลงเป็นธาตุ${elementThai[interaction.resultElement] ?? interaction.resultElement ?? ''}โดยอัตโนมัติ`
      })
    })

  pushEvidence(evidence, {
    rule: 'strength_summary',
    direction: score > 0 ? 'support' : score < 0 ? 'drain' : 'neutral',
    impact: 'major',
    contribution: score,
    message: `ผลรวมหลักฐานจัดดิถีอยู่ในระดับ${strengthThai[strengthLevel]}`
  })

  return {
    strengthLevel,
    structureClarity,
    patternType,
    ...useful,
    climateAdjustment: climate,
    evidence,
    alternatives: structureClarity === 'borderline' ? [{ reason: 'ผลอยู่ใกล้รอยต่อหรือมีเงื่อนไขที่ต้องตรวจเพิ่ม' }] : [],
    diagnostics: {
      score,
      seasonScore,
      rootScore: Math.round(rootScore * 100) / 100,
      visibleSupportScore: Math.round(visibleSupportScore * 100) / 100,
      hiddenResourceScore: Math.round(hiddenResourceScore * 100) / 100,
      pressureScore: Math.round(pressureScore * 100) / 100,
      elementPresence
    },
    ruleVersion: 'strength/0.1.0'
  }
}
