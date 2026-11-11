import { calculateTenGod } from '@openfate/bazi-engine'
import { calculateChart } from './bazi.js'
import { buildPersonalMonth } from './personal-calendar.js'
import { monthThemes, stemNames, branchNames } from './month-preview.js'
import { scoreLevel, scoreLevels } from './score-level.js'

const clashes = { 子: '午', 午: '子', 丑: '未', 未: '丑', 寅: '申', 申: '寅', 卯: '酉', 酉: '卯', 辰: '戌', 戌: '辰', 巳: '亥', 亥: '巳' }
const friends = { 子: '丑', 丑: '子', 寅: '亥', 亥: '寅', 卯: '戌', 戌: '卯', 辰: '酉', 酉: '辰', 巳: '申', 申: '巳', 午: '未', 未: '午' }
export const shortDate = key => new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${key}T12:00:00Z`))
const average = values => Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
function pillarAt(key, input) {
  const [y, m, d] = key.split('-')
  return calculateChart({ ...input, birthDate: `${d}/${m}/${y}`, birthTime: '12:00' }).pillars.year.ganZhi
}
export function currentSolarYear(today, input) {
  const year = Number(today.slice(0, 4))
  return pillarAt(today, input) === pillarAt(`${year}-07-01`, input) ? year : year - 1
}

// Year/month ratings summarize the existing daily model. No independent annual
// weights or extra learning/patron scores are invented. Solar boundaries use
// the engine's noon snapshots, consistently with MonthPreview.
export function buildYearPreview({ year, today, chart, assessment, input, luckTimeline }) {
  const pillar = pillarAt(`${year}-07-01`, input)
  const days = []
  for (let index = 0; index < 14; index++) {
    const civil = new Date(Date.UTC(year, index, 1))
    const month = buildPersonalMonth({ chart, assessment, input, year: civil.getUTCFullYear(), month: civil.getUTCMonth() + 1,
      currentLuckCycle: luckTimeline?.cycles.find(cycle => cycle.isCurrent) ?? null, displayTimezoneId: 'Asia/Bangkok' })
    days.push(...month.days.filter(day => day.contextPillars.year === pillar))
  }
  const months = []
  for (const day of days) {
    const monthPillar = day.contextPillars.month
    if (months.at(-1)?.pillar === monthPillar) months.at(-1).days.push(day)
    else months.push({ pillar: monthPillar, days: [day] })
  }
  for (const month of months) {
    month.start = month.days[0].key
    month.end = month.days.at(-1).key
    month.key = month.start
    month.label = new Intl.DateTimeFormat('th-TH', { month: 'short', timeZone: 'UTC' }).format(new Date(`${month.start}T12:00:00Z`))
    month.score = average(month.days.map(day => day.personalScore))
    month.rating = scoreLevel(month.score)
    ;[month.title, month.advice] = monthThemes[calculateTenGod(chart.dayMaster.char, month.pillar[0])]
    month.pillarLabel = `${stemNames[month.pillar[0]]} · ${branchNames[month.pillar[1]]}`
    month.isCurrent = today >= month.start && today <= month.end
  }
  const topics = days[0].topicReadings.map(topic => {
    const score = average(days.map(day => day.topicReadings.find(item => item.focus === topic.focus).personalScore))
    const ranked = months.map(month => ({ ...month, topicScore: average(month.days.map(day => day.topicReadings.find(item => item.focus === topic.focus).personalScore)) }))
      .sort((a, b) => b.topicScore - a.topicScore || a.start.localeCompare(b.start))
    return { focus: topic.focus, label: topic.focus === 'wellbeing' ? 'การดูแลตัวเอง' : topic.focusLabel, score, rating: scoreLevel(score),
      best: ranked[0], caution: [...ranked].reverse().find(month => month.topicScore <= 45) ?? null }
  })
  const [title, advice] = monthThemes[calculateTenGod(chart.dayMaster.char, pillar[0])]
  const natalBranch = chart.pillars.year.branch
  return { year, pillar, title, advice, start: days[0].key, end: days.at(-1).key, months, topics,
    average: average(days.map(day => day.personalScore)),
    counts: [...scoreLevels].reverse().map(level => ({ ...level, count: months.filter(month => month.rating.key === level.key).length })),
    yearClash: clashes[pillar[1]] === natalBranch,
    dayClash: clashes[pillar[1]] === chart.pillars.day.branch,
    zodiac: { natal: branchNames[natalBranch], friend: branchNames[friends[natalBranch]], clash: branchNames[clashes[natalBranch]] },
    pillarLabel: `${stemNames[pillar[0]]} · ปี${branchNames[pillar[1]]}` }
}
