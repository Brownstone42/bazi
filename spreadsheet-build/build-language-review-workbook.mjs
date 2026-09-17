/* global console */
import fs from 'node:fs/promises'
import path from 'node:path'
import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool'
import {
  dayMasterStrengthMatrix,
  publicStrengthPresentation
} from '../src/services/day-master-strength-matrix.js'
import {
  groupInsights,
  INTERPRETATION_METHODOLOGY,
  interpretationFallbacks,
  usefulElementActions
} from '../src/services/interpretation.js'

const outputDir = path.resolve('outputs/bazi-language-review')
const previewDir = path.resolve('spreadsheet-build/previews')
const outputPath = path.join(outputDir, 'bazi-reading-human-review.xlsx')
const fontFamily = 'Arial'

const stems = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
const levels = ['very_strong', 'strong', 'balanced', 'weak', 'very_weak']
const categories = [
  { sheetName: '1 บุคลิก', field: 'identity', tabColor: '#741B28' },
  { sheetName: '2 จุดแข็ง', field: 'strength', tabColor: '#9A6625' },
  { sheetName: '3 จุดเสี่ยง', field: 'risk', tabColor: '#A44B42' },
  { sheetName: '4 การทำงาน', field: 'work', tabColor: '#4F6D5A' },
  { sheetName: '5 ความสัมพันธ์', field: 'relationship', tabColor: '#805A78' },
  { sheetName: '6 การเงิน', field: 'finance', tabColor: '#3F6B70' },
  {
    sheetName: '7 ข้อความเสริม',
    tabColor: '#77716C',
    sentences: [
      ...Object.values(groupInsights).flatMap((item) => [item.strength, item.action]),
      ...Object.values(usefulElementActions).flatMap((item) => [item.work, item.relationship, item.balance]),
      ...Object.values(interpretationFallbacks),
      INTERPRETATION_METHODOLOGY
    ]
  },
  {
    sheetName: '8 ชื่อภาพรวม',
    tabColor: '#6B4E71',
    sentences: stems.map((stem) => dayMasterStrengthMatrix[stem].title)
  },
  {
    sheetName: '9 รูปแบบพลัง',
    tabColor: '#556B7A',
    sentences: [
      'ภาพรวมตัวตนของคุณ',
      'รูปแบบพลังในพื้นดวง',
      ...levels.flatMap((level) => [
        publicStrengthPresentation[level].label,
        publicStrengthPresentation[level].explanation
      ])
    ]
  }
]

const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(outputPath))

for (const category of categories) {
  let sheet
  try {
    sheet = workbook.worksheets.getItem(category.sheetName)
  } catch {
    sheet = workbook.worksheets.add(category.sheetName)
  }
  const sentences = category.sentences ?? stems.flatMap((stem) => levels.map((level) => {
    return dayMasterStrengthMatrix[stem][level][category.field]
  }))

  if (new Set(sentences).size !== sentences.length || (category.field && sentences.length !== 50)) {
    throw new Error(`จำนวนข้อความในชีต ${category.sheetName} ไม่ถูกต้องหรือมีข้อความซ้ำ`)
  }

  const humanSentences = sentences.map((_, index) => {
    const humanRow = index * 3 + 2
    return sheet.getRange(`B${humanRow}`).values?.[0]?.[0] ?? ''
  })
  const rows = sentences.flatMap((sentence, index) => [
    ['ภาษา AI', sentence],
    ['ภาษามนุษย์', humanSentences[index]],
    ['', '']
  ])

  sheet.getRange('A1').write(rows)
  sheet.showGridLines = false
  sheet.tabColor = category.tabColor

  const lastRow = sentences.length * 3
  const usedRange = sheet.getRange(`A1:B${lastRow}`)
  usedRange.format.font = { name: fontFamily, size: 10, color: '#322A27' }
  usedRange.format.verticalAlignment = 'top'
  usedRange.format.wrapText = true
  sheet.getRange(`A1:A${lastRow}`).format.columnWidthPx = 120
  sheet.getRange(`B1:B${lastRow}`).format.columnWidthPx = 720

  for (let index = 0; index < sentences.length; index += 1) {
    const aiRow = index * 3 + 1
    const humanRow = aiRow + 1
    const spacerRow = aiRow + 2

    sheet.getRange(`A${aiRow}:B${aiRow}`).format = {
      fill: '#F3EEE8',
      font: { name: fontFamily, size: 10, color: '#322A27' },
      verticalAlignment: 'top',
      wrapText: true,
      borders: { preset: 'outside', style: 'thin', color: '#D8CCC2' }
    }
    sheet.getRange(`A${aiRow}`).format.font = { name: fontFamily, size: 10, bold: true, color: '#741B28' }

    sheet.getRange(`A${humanRow}:B${humanRow}`).format = {
      fill: '#FFF6D6',
      font: { name: fontFamily, size: 10, color: '#322A27' },
      verticalAlignment: 'top',
      wrapText: true,
      borders: { preset: 'outside', style: 'thin', color: '#E4D6A5' }
    }
    sheet.getRange(`A${humanRow}`).format.font = { name: fontFamily, size: 10, bold: true, color: '#7A5818' }
    sheet.getRange(`A${humanRow}:B${humanRow}`).format.rowHeightPx = 42
    sheet.getRange(`A${spacerRow}:B${spacerRow}`).format.rowHeightPx = 10
  }

  usedRange.format.autofitRows()
  for (let index = 0; index < sentences.length; index += 1) {
    const humanRow = index * 3 + 2
    const spacerRow = index * 3 + 3
    sheet.getRange(`A${humanRow}:B${humanRow}`).format.rowHeightPx = 42
    sheet.getRange(`A${spacerRow}:B${spacerRow}`).format.rowHeightPx = 10
  }
}

workbook.recalculate()
await fs.mkdir(outputDir, { recursive: true })
await fs.mkdir(previewDir, { recursive: true })

for (const category of categories.slice(-2)) {
  const sentenceCount = category.sentences?.length ?? 50
  const lastRow = sentenceCount * 3
  const firstRows = await workbook.inspect({
    kind: 'table',
    range: `${category.sheetName}!A1:B6`,
    include: 'values,formulas',
    tableMaxRows: 6,
    tableMaxCols: 2
  })
  const lastRows = await workbook.inspect({
    kind: 'table',
    range: `${category.sheetName}!A${lastRow - 5}:B${lastRow}`,
    include: 'values,formulas',
    tableMaxRows: 6,
    tableMaxCols: 2
  })
  console.log(firstRows.ndjson)
  console.log(lastRows.ndjson)
  const firstStyles = await workbook.inspect({
    kind: 'computedStyle',
    range: `${category.sheetName}!A1:B2`,
    maxChars: 3000
  })
  console.log(firstStyles.ndjson)

  const preview = await workbook.render({
    sheetName: category.sheetName,
    range: 'A1:B12',
    scale: 1,
    format: 'png'
  })
  await fs.writeFile(
    path.join(previewDir, `${category.sheetName.replaceAll(' ', '-')}.png`),
    new Uint8Array(await preview.arrayBuffer())
  )
}

const errors = await workbook.inspect({
  kind: 'match',
  searchTerm: '#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!',
  options: { useRegex: true, maxResults: 300 },
  summary: 'final formula error scan'
})
console.log(errors.ndjson)

const output = await SpreadsheetFile.exportXlsx(workbook)
await output.save(outputPath)

const savedWorkbook = await SpreadsheetFile.importXlsx(await FileBlob.load(outputPath))
const savedSheets = await savedWorkbook.inspect({
  kind: 'sheet',
  include: 'id,name',
  maxChars: 3000
})
const savedOverview = await savedWorkbook.inspect({
  kind: 'table',
  range: '8 ชื่อภาพรวม!A1:B30',
  include: 'values,formulas',
  tableMaxRows: 30,
  tableMaxCols: 2,
  maxChars: 5000
})
const savedStrength = await savedWorkbook.inspect({
  kind: 'table',
  range: '9 รูปแบบพลัง!A1:B36',
  include: 'values,formulas',
  tableMaxRows: 36,
  tableMaxCols: 2,
  maxChars: 7000
})
console.log(savedSheets.ndjson)
console.log(savedOverview.ndjson)
console.log(savedStrength.ndjson)

for (const category of categories.slice(-2)) {
  const savedPreview = await savedWorkbook.render({
    sheetName: category.sheetName,
    range: `A1:B${category.sentences.length * 3}`,
    scale: 1,
    format: 'png'
  })
  await fs.writeFile(
    path.join(previewDir, `saved-${category.sheetName.replaceAll(' ', '-')}.png`),
    new Uint8Array(await savedPreview.arrayBuffer())
  )
}

await fs.rm(`${outputPath}.inspect.ndjson`, { force: true })

console.log(JSON.stringify({
  outputPath,
  sheets: categories.length,
  matrixSentences: 300,
  supplementalSentences: categories.find((category) => category.sheetName === '7 ข้อความเสริม').sentences.length,
  overviewTitles: categories.find((category) => category.sheetName === '8 ชื่อภาพรวม').sentences.length,
  strengthPresentationTexts: categories.find((category) => category.sheetName === '9 รูปแบบพลัง').sentences.length
}))
