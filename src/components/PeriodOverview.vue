<script setup>
import { computed } from 'vue'
import { buildPersonalMonth } from '../services/personal-calendar.js'
const props = defineProps({ period: { type: String, required: true }, today: { type: String, required: true }, chart: { type: Object, default: null }, assessment: { type: Object, default: null }, input: { type: Object, default: null }, luckTimeline: { type: Object, default: null } })
defineEmits(['day'])
const months = computed(() => {
  if (!props.chart || !props.assessment || !props.input) return []
  const [year, currentMonth] = props.today.split('-').map(Number)
  return Array.from({ length: props.period === 'year' ? 12 : 1 }, (_, index) => {
    const result = buildPersonalMonth({ chart: props.chart, assessment: props.assessment, input: props.input, year, month: props.period === 'year' ? index + 1 : currentMonth, currentLuckCycle: props.luckTimeline?.cycles.find(cycle => cycle.isCurrent) ?? null, displayTimezoneId: 'Asia/Bangkok' })
    return { ...result, average: Math.round(result.days.reduce((sum, day) => sum + day.personalScore, 0) / result.days.length) }
  })
})
const days = computed(() => months.value.flatMap(month => month.days))
const average = computed(() => days.value.length ? Math.round(days.value.reduce((sum, day) => sum + day.personalScore, 0) / days.value.length) : 0)
const topics = computed(() => days.value[0]?.topicReadings.map(topic => ({ label: topic.focusLabel, score: Math.round(days.value.reduce((sum, day) => sum + day.topicReadings.find(item => item.focus === topic.focus).personalScore, 0) / days.value.length) })) ?? [])
</script>
<template>
  <section class="period-overview">
    <header><p>{{ period === 'month' ? 'ภาพรวมเดือนนี้' : 'ภาพรวมปีนี้' }}</p><h2>{{ period === 'month' ? months[0]?.monthLabel : `ปี ${Number(today.slice(0, 4)) + 543}` }}</h2><template v-if="days.length"><strong class="period-score">{{ average }}<small>/100</small></strong><p>คะแนนเฉลี่ยจากคำอ่านรายวัน{{ period === 'month' ? 'ทั้งเดือน' : 'ทั้งปี' }}</p></template></header>
    <p v-if="!days.length" role="status">กรุณาระบุวันเกิด เวลาเกิด และเพศในแท็บข้อมูลเกิดให้ครบก่อน</p>
    <template v-else>
      <article><h3>ภาพรวมแต่ละด้าน</h3><div v-for="topic in topics" :key="topic.label" class="period-row"><span>{{ topic.label }}</span><b>{{ topic.score }}/100</b></div><p class="period-note">เป็นค่าเฉลี่ยจากสูตรรายวันเดิม ไม่ใช่สูตรดวงรายเดือนหรือรายปีแยกต่างหาก และไม่ใช่เปอร์เซ็นต์โอกาสเกิดเหตุการณ์</p></article>
      <article v-for="month in months" :key="month.month"><h3>{{ month.monthLabel }} <small>{{ month.average }}/100</small></h3><p>{{ month.summary }}</p><details :open="period === 'month'"><summary>ดูวันและคะแนนในเดือนนี้</summary><div class="period-days"><button v-for="day in month.days" :key="day.key" type="button" :aria-label="`${day.key} คะแนน ${day.personalScore} ดูคำอ่าน`" @click="$emit('day', day.key)"><b>{{ day.day }}</b><span>{{ day.personalScore }}</span></button></div></details></article>
    </template>
  </section>
</template>
<style scoped>
header{padding:28px;border-radius:24px;background:linear-gradient(135deg,#711d2b,#b27a64);color:#fffaf3}h2{margin:6px 0 18px}h3 small{float:right;font-size:.85rem;color:#846b56}.period-score{font-size:2.8rem}.period-score small{font-size:1rem;margin-left:5px}article{padding:22px;margin-top:18px;border-radius:20px;background:#fffdf8;border:1px solid #e6ded2}p{line-height:1.8}.period-row{display:flex;justify-content:space-between;gap:12px;padding:14px 0;border-bottom:1px solid #eee5da}.period-note{font-size:.8rem;color:#807268}.period-days{display:grid;grid-template-columns:repeat(7,1fr);gap:6px;margin-top:16px}.period-days button{display:grid;gap:6px;border:1px solid #e6d9cc;border-radius:10px;background:#faf3e8;padding:10px 2px;color:#712536;cursor:pointer;font:inherit}.period-days span{font-size:.75rem;color:#7f7062}summary{cursor:pointer;font-weight:600}button:focus-visible,summary:focus-visible{outline:3px solid #b18d51;outline-offset:2px}
</style>
