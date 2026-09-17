import { describe, expect, it } from 'vitest'
import { calculateChart } from './bazi'
import {
  buildLuckPillarTimeline,
  formatLuckStartOffset,
  interpretLuckPillar,
  interpretCurrentLuckPillar
} from './luck-pillars'

const form = {
  birthDate: '26/08/1989',
  birthTime: '11:30',
  timezoneId: 'Asia/Bangkok'
}

describe('ถนนสิบปี', () => {
  it('เดินถอยหลังสำหรับชายที่เกิดในปีก้านหยิน', () => {
    const chart = calculateChart({ ...form, gender: 'male' })
    const timeline = buildLuckPillarTimeline(chart, 'male', form.timezoneId, new Date('2020-01-01T00:00:00Z'))

    expect(timeline.direction).toBe('เดินถอยหลัง')
    expect(timeline.directionReason).toContain('ก้านปี 己 เป็นหยิน')
    expect(timeline.startAgeLabel).toBe('6 ปี 2 เดือน 10 วัน')
    expect(timeline.cycles.slice(0, 3).map((cycle) => cycle.ganZhi)).toEqual(['辛未', '庚午', '己巳'])
    expect(timeline.cycles.find((cycle) => cycle.isCurrent)?.ganZhi).toBe('己巳')
  })

  it('เดินหน้าสำหรับหญิงที่เกิดในปีก้านหยิน', () => {
    const chart = calculateChart({ ...form, gender: 'female' })
    const timeline = buildLuckPillarTimeline(chart, 'female', form.timezoneId, new Date('2020-01-01T00:00:00Z'))

    expect(timeline.direction).toBe('เดินหน้า')
    expect(timeline.startAgeLabel).toBe('4 ปี 1 เดือน 20 วัน')
    expect(timeline.cycles.slice(0, 3).map((cycle) => cycle.ganZhi)).toEqual(['癸酉', '甲戌', '乙亥'])
    expect(timeline.cycles.find((cycle) => cycle.isCurrent)?.ganZhi).toBe('乙亥')
  })

  it('สลับทิศทางถูกต้องสำหรับชายและหญิงที่เกิดในปีก้านหยาง', () => {
    const yangYearForm = {
      birthDate: '04/02/1990',
      birthTime: '12:00',
      timezoneId: 'Asia/Bangkok'
    }
    const male = calculateChart({ ...yangYearForm, gender: 'male' })
    const female = calculateChart({ ...yangYearForm, gender: 'female' })

    expect(male.pillars.year.stemPolarity).toBe('yang')
    expect(male.daYun.isForward).toBe(true)
    expect(female.daYun.isForward).toBe(false)
  })

  it('ไม่สร้างข้อความว่างเมื่อเริ่มเดินตั้งแต่เกิด', () => {
    expect(formatLuckStartOffset({ years: 0, months: 0, days: 0, hours: 0 })).toBe('เริ่มตั้งแต่เกิด')
  })

  it('อธิบายเสาปัจจุบันจากสิบเทพ ธาตุหนุน และปฏิสัมพันธ์โดยไม่ฟันธงเหตุการณ์', () => {
    const chart = calculateChart({ ...form, gender: 'male' })
    const timeline = buildLuckPillarTimeline(chart, 'male', form.timezoneId, new Date('2026-09-14T00:00:00Z'))
    const reading = interpretCurrentLuckPillar(chart, {
      primaryUsefulElement: 'metal',
      supportiveElement: 'water'
    }, timeline)

    expect(reading.ganZhi).toBe('戊辰')
    expect(reading.headline).toContain('การยืนด้วยตนเอง')
    expect(reading.incomingEnergy).toContain('ก้านฟ้า 戊')
    expect(reading.activatedAreas).toContain('เสาวัน')
    expect(reading.cautionFactors).toContain('ยืนยันวิธีของตนเอง')
    expect(reading.supportingFactors).toContain('ธาตุทองและธาตุน้ำ')
    expect(reading.practicalGuidance).toContain('วางฐานทรัพยากร')
    expect(reading.evidence).toContain('เสาถนนสิบปี 戊辰')
  })

  it('แยกคำอ่านทั้งเก้าช่วงตามสิบเทพ ช่วงวัย และปฏิสัมพันธ์จริง', () => {
    const chart = calculateChart({ ...form, gender: 'male' })
    const timeline = buildLuckPillarTimeline(chart, 'male', form.timezoneId, new Date('2026-09-14T00:00:00Z'))
    const assessment = {
      primaryUsefulElement: 'metal',
      supportiveElement: 'water',
      cautionElements: ['earth', 'fire']
    }
    const readings = timeline.cycles.map((cycle) => interpretLuckPillar(chart, assessment, cycle))

    expect(new Set(readings.map((reading) => reading.headline)).size).toBe(9)
    expect(new Set(readings.map((reading) => reading.summary)).size).toBe(9)
    expect(readings[2].natalInteraction).toContain('伏吟')
    expect(readings[5].natalInteraction).toContain('冲')
    expect(readings[2].incomingEnergy).toContain('戊 比肩 (เพื่อนร่วมพลัง)')
  })

  it('ข้อความที่แสดงแก่ผู้ใช้เป็นภาษาทั่วไปและครอบคลุมด้านสำคัญ', () => {
    const chart = calculateChart({ ...form, gender: 'male' })
    const timeline = buildLuckPillarTimeline(chart, 'male', form.timezoneId, new Date('2026-09-14T00:00:00Z'))
    const assessment = {
      primaryUsefulElement: 'metal',
      supportiveElement: 'water',
      cautionElements: ['earth', 'fire']
    }

    timeline.cycles.forEach((cycle) => {
      const reading = interpretLuckPillar(chart, assessment, cycle)
      const publicText = [
        reading.headline,
        reading.summary,
        reading.keyThemes,
        reading.workOutlook,
        reading.moneyOutlook,
        reading.relationshipOutlook,
        reading.shouldDo,
        reading.shouldAvoid
      ].join(' ')

      expect(publicText).not.toMatch(/ก้านฟ้า|กิ่งดิน|สิบเทพ|伏吟|六合|三合|三会|冲|刑|破|害|[一-龥]/)
      expect(reading.workOutlook.length).toBeGreaterThan(40)
      expect(reading.moneyOutlook.length).toBeGreaterThan(40)
      expect(reading.relationshipOutlook.length).toBeGreaterThan(40)
    })
  })

  it('อ่านช่วงอดีตหรืออนาคตที่ผู้ใช้เลือกได้', () => {
    const chart = calculateChart({ ...form, gender: 'male' })
    const timeline = buildLuckPillarTimeline(chart, 'male', form.timezoneId, new Date('2026-09-14T00:00:00Z'))
    const reading = interpretLuckPillar(chart, {
      primaryUsefulElement: 'metal',
      supportiveElement: 'water'
    }, timeline.cycles[0])

    expect(reading.index).toBe(1)
    expect(reading.ganZhi).toBe('辛未')
    expect(reading.isCurrent).toBe(false)
    expect(reading.evidence).toContain('เสาถนนสิบปี 辛未')
  })
})
