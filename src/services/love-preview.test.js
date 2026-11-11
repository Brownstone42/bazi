import { it, expect } from 'vitest'
import { calculateChart } from './bazi.js'
import { assessDayMasterStrength } from './strength-engine.js'
import { buildLovePreview, presentLovePeriod, loveStatus } from './love-preview.js'
const input={birthDate:'26/08/1989',birthTime:'11:30',gender:'male',timezoneId:'Asia/Bangkok'}
const chart=calculateChart(input)
const assessment=assessDayMasterStrength(chart)
it('builds contiguous upcoming solar months and ten distinct year layers',()=>{
  const data=buildLovePreview({input,chart,assessment,today:'2026-11-04'})
  expect(data.months).toHaveLength(12)
  expect(data.years).toHaveLength(10)
  expect(data.months[0].start<='2026-11-04' && data.months[0].end>='2026-11-04').toBe(true)
  for(let i=1;i<12;i++) expect(Date.parse(data.months[i].start)-Date.parse(data.months[i-1].end)).toBe(86400000)
  expect(data.years.map(item=>item.year)).toEqual(Array.from({length:10},(_,i)=>2026+i))
  for(const item of [...data.months,...data.years]) {
    expect(item.activation.key).toBe(item.key)
    const result=presentLovePeriod(item,'single')
    expect(result.factors.every(f=>f.delta!==0)).toBe(true)
    expect(result.score===null || result.score>=0 && result.score<=100).toBe(true)
  }
  expect(data.compatible.every(item=>item.reasons.length>0 && item.elementLabel && item.zodiacLabel)).toBe(true)
  expect(data.compatible[0]).toMatchObject({soulmate:true,elementLabel:'น้ำหยิน',zodiacLabel:'ปีมะแม'})
})
it('changes interpretation and weights by relationship status without recalculating facts',()=>{
  const period={key:'month',peach:[{id:'peach',text:'เดือนจรตรงดาวเสน่ห์'}],combine:[],friction:[],activation:{status:'neutral',changes:[]}}
  const single=presentLovePeriod(period,'single'),coupled=presentLovePeriod(period,'married')
  expect(single.summary).not.toBe(coupled.summary)
  expect(single.delta).toBeGreaterThan(0)
  expect(coupled.delta).toBeNull()
  expect(loveStatus('talking')).toBe('single')
  expect(presentLovePeriod({...period,peach:[]},'single').score).toBeNull()
})
