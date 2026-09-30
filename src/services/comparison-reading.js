import { calculateChart, calculateChartWithOptionalTime } from './bazi.js'
import { interpretCompatibility } from './compatibility.js'

export function buildComparisonReading(owner, other) {
  const chart = calculateChart(owner)
  const { chart: otherChart, hasBirthTime } = calculateChartWithOptionalTime(other)
  const topicResults = Object.fromEntries(['overview', 'love', 'family', 'work', 'friendship'].map(focus => [focus,
    interpretCompatibility(chart, otherChart, { relationship: other.relationship ?? 'unspecified', focus, hasBirthTime })]))
  return { ...topicResults[other.focus ?? 'overview'], topicResults, readingVersion: 'server-v1' }
}
