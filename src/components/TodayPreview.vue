<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { buildPersonalMonth, dailyHeadline } from '../services/personal-calendar.js'
import HourTimeline from './HourTimeline.vue'
import DailyQuickSummary from './DailyQuickSummary.vue'
import DailyTopics from './DailyTopics.vue'
import { canAccessCalendarDay } from '../services/access-control.js'
import { scoreLevel } from '../services/score-level.js'
import YearPreview from './YearPreview.vue'
import MonthPreview from './MonthPreview.vue'

const props = defineProps({
  chart: { type: Object, default: null }, assessment: { type: Object, default: null },
  accessPlan: { type: Object, default: null }, input: { type: Object, default: null }, luckTimeline: { type: Object, default: null }
})
const emit=defineEmits(['packages'])
const allowed = key => !props.accessPlan || canAccessCalendarDay({key},props.accessPlan)
function selectDay(key){if(allowed(key)){selected.value=key;period.value='day'}else emit('packages')}
const bangkokDay = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
const today = ref(bangkokDay())
const period = ref('day')
const periods = [{ value: 'day', label: 'วันนี้' }, { value: 'month', label: 'เดือนนี้' }, { value: 'year', label: 'ปีนี้' }]
function selectPeriod(value) { period.value = value; selected.value = today.value }
function movePeriod(event, index) { selectPeriod(periods[index].value); event.currentTarget.parentElement.children[index].focus() }
const selected = ref(today.value)
const monthAnchor = ref(today.value)
function openMonth(value) { monthAnchor.value = value; period.value = 'month' }
const selectedHour = ref(null)
let timer
onMounted(() => { timer = setInterval(() => { const next = bangkokDay(); if (next !== today.value) { if (selected.value === today.value) selected.value = next; today.value = next } }, 60000) })
onUnmounted(() => clearInterval(timer))
const date = computed(() => new Date(`${selected.value}T12:00:00+07:00`))
const monthKey = computed(() => selected.value.slice(0, 7))
const monthLookup = computed(() => {
  const { chart, assessment, input, luckTimeline } = props
  const currentLuckCycle = luckTimeline?.cycles.find(cycle => cycle.isCurrent) ?? null
  const cache = new Map()
  return key => {
    if (!chart || !assessment || !input) return null
    if (!cache.has(key)) {
      const [year, month] = key.split('-').map(Number)
      cache.set(key, buildPersonalMonth({ chart, assessment, input, year, month, currentLuckCycle, displayTimezoneId: 'Asia/Bangkok' }))
    }
    return cache.get(key)
  }
})
const month = computed(() => monthLookup.value(monthKey.value))
const day = computed(() => allowed(selected.value) ? month.value?.days.find(item => item.key === selected.value) : null)
const dayPillarThai = computed(() => {
  const pillar = day.value?.contextPillars.day ?? ''
  const stems = { 甲: 'ไม้หยาง', 乙: 'ไม้หยิน', 丙: 'ไฟหยาง', 丁: 'ไฟหยิน', 戊: 'ดินหยาง', 己: 'ดินหยิน', 庚: 'ทองหยาง', 辛: 'ทองหยิน', 壬: 'น้ำหยาง', 癸: 'น้ำหยิน' }
  const branches = { 子: 'ชวด', 丑: 'ฉลู', 寅: 'ขาล', 卯: 'เถาะ', 辰: 'มะโรง', 巳: 'มะเส็ง', 午: 'มะเมีย', 未: 'มะแม', 申: 'วอก', 酉: 'ระกา', 戌: 'จอ', 亥: 'กุน' }
  return `${stems[pillar[0]] ?? '—'} - ${branches[pillar[1]] ?? '—'}`
})
const week = computed(() => Array.from({ length: 7 }, (_, index) => {
  const value = new Date(date.value); value.setUTCDate(value.getUTCDate() + index - 3)
  const key = value.toISOString().slice(0, 10)
  const score = allowed(key) ? monthLookup.value(key.slice(0, 7))?.days.find(item => item.key === key)?.personalScore : null
  return { key, number: value.getUTCDate(), label: ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'][value.getUTCDay()], level: Number.isFinite(score) ? scoreLevel(score) : null }
}))
const dateLabel = computed(() => new Intl.DateTimeFormat('th-TH', { dateStyle: 'full', timeZone: 'Asia/Bangkok' }).format(date.value).replace(/\s*พ\.ศ\.\s*/, ' '))
</script>

<template>
  <section class="today-preview" aria-label="คำอ่านประจำวัน">
    <div class="period-tabs" role="tablist" aria-label="ช่วงเวลา">
      <button v-for="(item, index) in periods" :id="`period-${item.value}`" :key="item.value" type="button" role="tab" :aria-selected="period === item.value" :tabindex="period === item.value ? 0 : -1" aria-controls="period-panel" @click="selectPeriod(item.value)" @keydown.right.prevent="movePeriod($event, (index + 1) % 3)" @keydown.left.prevent="movePeriod($event, (index + 2) % 3)" @keydown.home.prevent="movePeriod($event, 0)" @keydown.end.prevent="movePeriod($event, 2)">{{ item.label }}</button>
    </div>
    <div id="period-panel" role="tabpanel" :aria-labelledby="`period-${period}`">
      <MonthPreview v-if="period === 'month'" :today="today" :initial-month="monthAnchor" :chart="chart" :assessment="assessment" :input="input" :luck-timeline="luckTimeline" :access-plan="accessPlan" @packages="emit('packages')" @day="selectDay" />
      <YearPreview v-else-if="period === 'year'" :today="today" :chart="chart" :assessment="assessment" :input="input" :luck-timeline="luckTimeline" @month="openMonth" />
      <template v-else>
        <header class="today-hero">
          <p>{{ selected === today ? 'วันนี้ · ' : '' }}{{ dateLabel }}</p>
          <div class="today-week" role="group" aria-label="เลือกวัน">
            <button v-for="item in week" :key="item.key" type="button" :aria-pressed="selected === item.key" :aria-label="item.key" :title="item.level?.label" @click="selectDay(item.key)"><small>{{ item.key === today ? 'วันนี้' : item.label }}</small><b>{{ item.number }}</b><span class="day-energy-dot" :style="{ backgroundColor: item.level?.color ?? 'transparent' }" aria-hidden="true" /></button>
          </div>
          <template v-if="day">
            <div class="today-heading"><div><h2>{{ dailyHeadline(day, chart) }}</h2><span class="today-energy today-gauge" :style="{ background: scoreLevel(day.personalScore).background, color: scoreLevel(day.personalScore).ink }" role="img" :aria-label="`คะแนนภาพรวม ${day.personalScore} จาก 100`">{{ scoreLevel(day.personalScore).label }} <b>{{ day.personalScore }}</b></span> <span>{{ dayPillarThai }}</span></div></div>
            <p class="today-summary">{{ day.personalScore > 60 ? 'มีปัจจัยสนับสนุน เหมาะเดินหน้าเรื่องที่เตรียมพร้อม' : day.personalScore <= 45 ? 'ค่อย ๆ จัดการทีละเรื่อง เผื่อเวลาทบทวนก่อนตัดสินใจ' : 'ทำตามแผนได้ เลือกเรื่องสำคัญและไม่เร่งเกินไป' }}</p>
            <HourTimeline :chart="chart" :assessment="assessment" :input="input" :date="selected" :today="today" @select-time="selectedHour = $event" />
          </template>
        </header>
        <div v-if="!day" class="today-card" role="status">กรุณาระบุวันเกิด เวลาเกิด และเพศให้ครบในแท็บข้อมูลเกิด เพื่ออ่านปาจื้อรายวัน เราไม่สมมติข้อมูลเกิดให้คุณ</div>
        <template v-else>
          <DailyQuickSummary :chart="chart" :assessment="assessment" :input="input" :date="selected" :balance="day.dailyBalance" :selected-hour="selectedHour" />
          <DailyTopics :topics="day.topicReadings" :date="selected" />
        </template>
      </template>
    </div>
  </section>
</template>

<style scoped>
.day-energy-dot{display:block;width:7px;height:7px;border-radius:50%;justify-self:center;margin:4px 0;box-shadow:0 0 0 1px #463d3615}

.today-heading .today-energy{display:inline-flex;align-items:center;gap:8px;background:#fff7e8;color:#652333;padding:6px 12px;border-radius:24px;font-size:.85rem;margin:8px 0;max-width:none}.today-heading h2{color:#fffaf1}
.period-tabs{display:grid;grid-template-columns:repeat(3,1fr);padding:5px;gap:4px;border-radius:15px;background:#711d2b;margin-bottom:18px}.period-tabs button{font:inherit;font-weight:600;color:#f7e9df;background:transparent;border:0;border-radius:10px;padding:12px 6px;cursor:pointer}.period-tabs button[aria-selected=true]{background:#fffaf3;color:#711d2b;box-shadow:0 2px 7px #310d1520}
.today-preview{max-width:860px;margin:0 auto;color:#463d36}.today-hero{background:linear-gradient(155deg,#641e2b,#98464a 55%,#c39a77);color:#fffaf1;border-radius:28px;padding:clamp(20px,4vw,38px)}.today-top,.today-heading{display:flex;align-items:center;justify-content:space-between;gap:12px}.today-top>span,.today-eyebrow{font-size:.75rem;letter-spacing:.12em}.today-top button{background:#ffffff20;color:inherit;border:1px solid #ffffff55;border-radius:20px;padding:8px 12px;font:inherit;font-size:.8rem}.today-week{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:7px;margin:22px 0 14px}.today-week button{min-width:0;display:grid;gap:5px;padding:10px 2px;border:0;border-radius:14px;background:#ffffff18;color:inherit;font:inherit;cursor:pointer}.today-week b{font-size:1.2rem}.today-week button[aria-pressed=true]{background:#fffaf1;color:#711d2b}.today-date{display:flex;justify-content:flex-end;align-items:center;gap:10px;font-size:.8rem}.today-date input{max-width:175px;border:1px solid #ffffff60;border-radius:8px;padding:6px;color:#46242b;background:#fffaf1;font:inherit}.today-heading{margin-top:28px}.today-heading h2{margin:5px 0;font-size:clamp(1.8rem,5vw,2.7rem)}.today-symbol{font-size:3.6rem;color:#f2d59f}.today-summary,p{line-height:1.8}.today-gauge{max-width:300px;position:relative;margin:20px auto 0}.today-gauge svg{width:100%;display:block}.today-gauge path{fill:none;stroke-width:10;stroke-linecap:round}.gauge-track{stroke:#ffffff26}.gauge-value{stroke:#f4d6a2}.today-gauge>div{position:absolute;bottom:5%;width:100%;text-align:center;display:grid;gap:6px}.today-gauge strong{font-size:2.7rem}.today-gauge strong small{font-size:.85rem;margin-left:5px}.today-gauge>div>span{font-size:.85rem}.today-card{background:#fffdf8;border:1px solid #e6ded2;border-radius:22px;padding:24px;margin-top:18px}.today-card h3{margin:0 0 12px;font-size:1.15rem}.today-action{border-left:5px solid #b3935a}.today-eyebrow{color:#927343;display:block;margin-bottom:10px}.today-pair{display:grid;grid-template-columns:1fr 1fr;gap:16px}.today-pair ul{padding-left:20px;margin-bottom:0}.today-pair li+li{margin-top:16px}.today-card p{font-size:.92rem}.today-topic{border-top:1px solid #e8e0d7;padding:16px 0}.today-topic:last-child{padding-bottom:0}summary{cursor:pointer;font-weight:600}summary:focus-visible,button:focus-visible,input:focus-visible{outline:3px solid #c49a55;outline-offset:3px}.today-topic summary{display:flex;align-items:center;gap:12px;list-style:none}.today-topic summary::-webkit-details-marker{display:none}.today-topic summary>span:first-child{flex:1}.today-topic summary small{display:block;font-weight:400;color:#847467;font-size:.8rem;margin-top:4px}.today-topic summary>b{font-size:1.35rem;color:#762637;text-align:right}.today-topic summary>b small{display:inline;margin-left:3px}.today-factor{border-top:1px dashed #e4dccf;padding:12px 0}.today-factor>div{display:flex;justify-content:space-between;gap:16px}.today-factor p{margin-bottom:0}.plus{color:#38674d}.minus{color:#a03e42}.today-color{display:flex;gap:12px;align-items:center}.today-color>span{width:28px;height:28px;border:1px solid #ccc;border-radius:50%;flex-shrink:0}.today-muted,.today-note{color:#84766a;font-size:.8rem}.today-note{padding:10px;line-height:1.8}@media(max-width:600px){.today-pair{grid-template-columns:1fr;gap:0}.today-card{padding:20px}.today-week{gap:4px}.today-top>span{letter-spacing:.04em}}
</style>
