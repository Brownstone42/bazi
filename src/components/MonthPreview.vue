<script setup>
import { computed, ref } from 'vue'
import { buildPersonalMonth } from '../services/personal-calendar.js'
import { canAccessCalendarDay } from '../services/access-control.js'
import { presentMonth } from '../services/month-preview.js'
const props = defineProps({ today: { type: String, required: true }, initialMonth: String, chart: Object, assessment: Object, input: Object, luckTimeline: Object, accessPlan: {type:Object,default:null} })
const emit=defineEmits(['day','packages'])
const allowed=key=>!props.accessPlan||canAccessCalendarDay({key},props.accessPlan)
function chooseDay(key){if(allowed(key))emit('day',key);else emit('packages')}
const offset = ref(0)
const displayed = computed(() => {
  const [year, month] = (props.initialMonth ?? props.today).split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1 + offset.value, 1))
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 }
})
const label = computed(() => new Intl.DateTimeFormat('th-TH', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(displayed.value.year, displayed.value.month - 1, 1))).replace('พ.ศ. ', ''))
const data = computed(() => {
  if (!props.chart || !props.assessment || !props.input) return null
  const month = buildPersonalMonth({ ...displayed.value, chart: props.chart, assessment: props.assessment, input: props.input,
    currentLuckCycle: props.luckTimeline?.cycles.find(cycle => cycle.isCurrent) ?? null, displayTimezoneId: 'Asia/Bangkok' })
  return presentMonth(month, props.chart, props.today)
})
const groups = computed(() => data.value ? [
  { title: 'วันเด่นของเดือน', items: data.value.highlights.filter(day=>allowed(day.key)), empty: 'ช่วงนี้ยังไม่มีวันที่คะแนนอยู่ในระดับดี ลองเลือกวันเพื่อดูรายละเอียดแต่ละด้าน' },
  { title: 'วันที่ควรระวัง', items: data.value.caution.filter(day=>allowed(day.key)), empty: 'ช่วงนี้ไม่มีวันที่คะแนนอยู่ในระดับควรระวังหรือชงกับเสาวันและปีเกิด' }
] : [])
</script>

<template>
  <section class="month-preview" aria-label="ดวงประจำเดือน">
    <header class="month-hero"><h2>ดวงประจำเดือน</h2><p>เลือกวันที่เพื่อดูจังหวะและคำอ่านของวันนั้น</p></header>
    <div class="month-body">
      <nav class="month-switch" aria-label="เลือกเดือน"><button type="button" aria-label="เดือนก่อน" @click="offset--">‹</button><h3 aria-live="polite">{{ label }}</h3><button type="button" aria-label="เดือนถัดไป" @click="offset++">›</button></nav>
      <p v-if="!data" role="status">กรุณาระบุวันเกิด เวลาเกิด และเพศในแท็บข้อมูลเกิดให้ครบก่อน</p>
      <template v-else>
        <section class="month-summary">
          <div class="summary-heading"><span class="summary-icon"><i class="pi pi-calendar" aria-hidden="true" /></span><div><small>ภาพรวม{{ label }}</small><h3>{{ data.title }}</h3></div></div>
          <div class="month-distribution" aria-hidden="true"><span v-for="level in data.counts.filter(item => item.count)" :key="level.key" :style="{ flex: level.count, background: level.color }" /></div>
          <div class="month-counts"><span v-for="level in data.counts" :key="level.key"><b :style="{ color: level.ink }">{{ level.count }}</b> วัน{{ level.label }}</span></div>
          <p v-if="data.best.length > 1">ช่วงที่คะแนนดีต่อเนื่องและไม่ชงวันหรือปีเกิด คือวันที่ <strong>{{ data.best[0].day }}–{{ data.best.at(-1).day }}</strong> ลองจัดเรื่องสำคัญไว้ในช่วงนี้</p>
          <p v-else>เลือกดูแต่ละวันเพื่อจัดเรื่องสำคัญให้ตรงกับจังหวะของคุณ</p>
        </section>
        <p class="month-note">ช่วงเสาเดือนเปลี่ยนตามสารทจีน แสดงตามเสาเดือน ณ เวลาเที่ยงของแต่ละวัน</p>
        <div class="month-segments"><article v-for="segment in data.segments" :key="segment.pillar"><small>{{ segment.start }}–{{ segment.end }} · {{ segment.label }}</small><h4>{{ segment.title }}</h4><p>{{ segment.advice }}</p></article></div>
        <div class="month-calendar" aria-label="ปฏิทินรายเดือน">
          <span v-for="name in ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.']" :key="name" class="weekday">{{ name }}</span>
          <span v-for="blank in data.leadingBlanks" :key="`blank-${blank}`" aria-hidden="true" />
          <button v-for="day in data.days" :key="day.key" type="button" :class="{ today: day.key === today }" :style="{ '--day-color': allowed(day.key) ? day.rating.color : '#ded7d0' }" :aria-current="day.key === today ? 'date' : undefined" :aria-label="allowed(day.key) ? `${day.key} ${day.title} คะแนน ${day.personalScore}` : `${day.key} นอกช่วงแพ็กเกจ`" @click="chooseDay(day.key)"><b>{{ day.day }}</b><small>{{ allowed(day.key) ? day.shortTitle : '🔒' }}</small><span v-if="day.festival" class="festival-dot" aria-hidden="true" /></button>
        </div>
        <section v-if="data.days.some(day => day.festival)" class="month-festivals"><h4>วันสำคัญจีนเดือนนี้</h4><button v-for="day in data.days.filter(day => day.festival)" :key="day.key" type="button" @click="chooseDay(day.key)"><b>{{ day.day }}</b> {{ day.festival }}</button></section>
        <div class="month-legend"><span v-for="level in data.counts" :key="level.key"><i :style="{ background: level.color }" />{{ level.label }}</span></div>
        <section v-for="group in groups" :key="group.title" class="month-list"><h3>{{ group.title }}</h3><small>{{ data.currentMonth ? 'ตั้งแต่วันนี้ถึงสิ้นเดือน' : 'ตลอดเดือนที่เลือก' }}</small><p v-if="!group.items.length">{{ group.empty }}</p><button v-for="day in group.items" :key="day.key" type="button" @click="chooseDay(day.key)"><span class="list-date"><b>{{ day.day }}</b><small>{{ day.weekdayLabel }}</small></span><span class="list-copy"><strong>{{ day.title }}</strong><small>{{ day.reason.startsWith('clash-') ? 'เผื่อเวลารับการเปลี่ยนแปลงและตรวจรายละเอียดก่อนตัดสินใจ' : day.personalScore > 60 ? 'เหมาะเดินหน้าเรื่องที่เตรียมพร้อมไว้แล้ว' : 'ลดความเร่งและทบทวนก่อนรับเรื่องเพิ่ม' }}</small></span><b class="list-score" :style="{ color: day.rating.ink, background: day.rating.background }">{{ day.personalScore }}</b></button></section>
      </template>
    </div>
  </section>
</template>

<style scoped>
.month-preview{color:#463d36}.month-hero{padding:6px 20px 24px;color:#fffaf3}.month-hero h2{margin:0 0 8px;font-size:1.6rem}.month-hero p{margin:0;font-size:.88rem;opacity:.8}.month-body{background:#f8f5ef;padding:0 16px 24px}.month-switch{display:flex;align-items:center;justify-content:space-between;padding:20px 0 26px;gap:12px}.month-switch h3{margin:0;font-size:1.15rem}.month-switch button{border:1px solid #e6ded2;border-radius:10px;background:#fffdf9;color:#65303a;font-size:1.5rem;width:38px;height:38px;cursor:pointer}.summary-heading{display:flex;align-items:center;gap:12px}.summary-icon{display:grid;place-items:center;flex:none;width:48px;height:48px;background:#edd7ce;border-radius:15px;color:#762c39;font-size:1.25rem}.summary-heading small,.month-note{color:#8b8076;font-size:.75rem}.summary-heading h3{margin:3px 0;font-size:1.08rem}.month-distribution{display:flex;gap:3px;height:10px;margin:16px 0 10px}.month-distribution span{border-radius:4px}.month-counts{display:flex;flex-wrap:wrap;gap:8px 14px;font-size:.73rem;color:#817469}.month-counts b{font-size:1rem}.month-summary p{font-size:.88rem;line-height:1.8;margin:16px 0 20px}.month-note{line-height:1.6}.month-segments{display:grid;gap:10px;margin:12px 0 24px}.month-segments article{background:#fffdf9;border:1px solid #ece5dc;border-radius:16px;padding:14px 16px}.month-segments small{font-size:.73rem;color:#8b8076}.month-segments h4{margin:4px 0;font-size:.93rem}.month-segments p{font-size:.83rem;line-height:1.7;margin:0;color:#75695f}.month-calendar{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:5px}.weekday{text-align:center;color:#9a8e83;font-size:.73rem;padding:6px 0}.month-calendar button{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;min-width:0;min-height:64px;padding:8px 1px;border:0;border-bottom:4px solid var(--day-color);border-radius:12px;background:#fffdf9;color:#51453b;font:inherit;cursor:pointer}.month-calendar button.today{outline:2px solid #702536;outline-offset:-2px}.month-calendar b{font-size:.9rem}.month-calendar small{font-size:clamp(.53rem,2.2vw,.68rem);white-space:nowrap}.festival-dot{position:absolute;top:5px;right:5px;width:5px;height:5px;border-radius:50%;background:#ae573b}.month-festivals{margin-top:18px}.month-festivals h4{font-size:.86rem;margin:0 0 8px}.month-festivals button{border:1px solid #eaded2;border-radius:9px;background:#fffaf3;color:#81634b;padding:7px 10px;margin:0 8px 6px 0;font:inherit;font-size:.75rem;cursor:pointer}.month-legend{display:flex;justify-content:center;flex-wrap:wrap;gap:12px;font-size:.72rem;color:#86776a;padding:16px 0 24px}.month-legend span{display:flex;gap:5px;align-items:center}.month-legend i{width:8px;height:8px;border-radius:50%}.month-list{background:#fffdf9;border:1px solid #ece5dc;border-radius:18px;padding:18px 14px 6px;margin-bottom:14px}.month-list h3{font-size:1rem;margin:0 0 4px}.month-list>small{color:#97897c;font-size:.72rem}.month-list>p{font-size:.83rem;line-height:1.7;padding-bottom:12px}.month-list>button{display:flex;width:100%;align-items:center;gap:12px;padding:16px 0;border:0;border-bottom:1px solid #eee7dd;background:none;text-align:left;font:inherit;color:inherit;cursor:pointer}.month-list>button:last-child{border-bottom:0}.list-date{width:32px;flex:none;display:grid;text-align:center;gap:3px}.list-date b{font-size:1.25rem}.list-date small{font-size:.7rem;color:#97897c}.list-copy{flex:1;min-width:0;display:grid;gap:4px}.list-copy strong{font-size:.88rem}.list-copy small{font-size:.76rem;color:#8b7d70;line-height:1.6}.list-score{font-size:.85rem;padding:6px 8px;border-radius:10px}.month-preview button:focus-visible{outline:3px solid #b18d51;outline-offset:2px}@media(min-width:650px){.month-body{padding-left:28px;padding-right:28px}.month-calendar button{min-height:76px}.month-segments{grid-template-columns:repeat(2,minmax(0,1fr))}}
</style>
