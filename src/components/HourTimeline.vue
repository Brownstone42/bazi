<script setup>
import { computed, ref, watch, onMounted, onUnmounted } from 'vue'
import { buildPersonalHours } from '../services/personal-calendar.js'
import { scoreLevels } from '../services/score-level.js'
const props = defineProps({ chart: { type: Object, required: true }, assessment: { type: Object, required: true }, input: { type: Object, required: true }, date: { type: String, required: true }, today: { type: String, required: true } })
const now = ref(new Date())
const chosen = ref(null)
let timer
onMounted(() => { timer = setInterval(() => { now.value = new Date() }, 30000) })
onUnmounted(() => clearInterval(timer))
watch(() => props.date, () => { chosen.value = null })
const hours = computed(() => buildPersonalHours(props))
const clock = computed(() => new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(now.value))
const hourNow = computed(() => Number(clock.value.slice(0, 2)) + Number(clock.value.slice(3)) / 60)
const current = computed(() => props.date === props.today ? hours.value.findIndex(item => hourNow.value >= item.start && hourNow.value < item.end) : -1)
const active = computed(() => hours.value[chosen.value ?? (current.value >= 0 ? current.value : 0)])
const emit = defineEmits(['select-time'])
watch(() => [props.date, active.value?.start, clock.value, chosen.value], () => {
  if (active.value) emit('select-time', { date: props.date, time: chosen.value === null && current.value >= 0 ? clock.value : `${String(active.value.start).padStart(2, '0')}:30`, label: active.value.time })
}, { immediate: true })
const colors = Object.fromEntries(scoreLevels.map(level => [level.key, level.color]))
const point = hour => { const angle = Math.PI * (1 - hour / 24); return { x: 160 + 135 * Math.cos(angle), y: 160 - 135 * Math.sin(angle) } }
const arc = item => { const a = point(item.start + .15); const b = point(item.end - .15); return `M${a.x},${a.y} A135,135 0 0 1 ${b.x},${b.y}` }
</script>
<template>
  <section v-if="active" class="hour-timeline" aria-label="ช่วงเวลาประจำวัน">
    <svg viewBox="0 0 320 185" role="group" aria-label="เลือกช่วงเวลาจากแถบสี">
      <g v-for="(item, index) in hours" :key="item.start" class="hour-segment" role="button" tabindex="0" :aria-label="`${item.time} ${item.label}`" :aria-pressed="active === item" @click="chosen = index" @keydown.enter.prevent="chosen = index" @keydown.space.prevent="chosen = index">
        <path class="hour-selection" :d="arc(item)" stroke="white" fill="none" stroke-width="18" :opacity="active === item ? 1 : 0" />
        <path :d="arc(item)" :stroke="colors[item.level]" fill="none" stroke-width="12" />
        <path :d="arc(item)" stroke="transparent" fill="none" stroke-width="25" />
      </g>
      <circle v-if="current >= 0" class="hour-now-dot" :cx="point(hourNow).x" :cy="point(hourNow).y" r="9" fill="#fff7dd" stroke="white" stroke-width="3" aria-hidden="true" /><text x="12" y="183" aria-hidden="true">00:00</text><text x="270" y="183" aria-hidden="true">24:00</text>
    </svg>
    <div class="hour-center" aria-live="polite"><small>{{ chosen === null && current >= 0 ? `ตอนนี้ ${clock}` : active.time }}</small><strong :style="{ color: colors[active.level] }">{{ active.label }}</strong><span>{{ active.summary }}</span></div>
    <div class="hour-legend"><span v-for="level in scoreLevels" :key="level.key" :style="{ color: level.color }">● {{ level.label }}</span></div>
  </section>
</template>
<style scoped>
.hour-segment{cursor:pointer;outline:none}.hour-segment:focus-visible .hour-selection{opacity:1;stroke:#fff}.hour-center,.hour-now-dot{pointer-events:none}
.hour-timeline{position:relative;margin-top:24px}.hour-timeline>svg{width:100%;max-width:420px;display:block;margin:auto}.hour-timeline text{fill:#fff4df;font-size:10px}.hour-center{position:absolute;top:clamp(55px,15vw,100px);left:15%;width:70%;display:grid;text-align:center;gap:6px}.hour-center strong{font-size:1.6rem}.hour-center span{font-size:.8rem;line-height:1.5;max-width:220px;margin:auto}.hour-legend{display:flex;justify-content:center;gap:16px;font-size:.75rem;margin:14px 0}.hour-legend span:nth-child(1){color:#9bd4ad}.hour-legend span:nth-child(2){color:#ecd9a8}.hour-legend span:nth-child(3){color:#ed9c92}.hour-buttons{display:flex;overflow-x:auto;gap:8px;padding:6px 2px 12px}.hour-buttons button{flex:0 0 112px;display:grid;gap:8px;background:#351b2660;border:2px solid;border-radius:12px;padding:10px 5px;font:inherit;color:white;font-size:.72rem;cursor:pointer}.hour-buttons button[aria-pressed=true]{background:#351b26;outline:2px solid white;outline-offset:1px}.hour-reset{background:none;border:0;color:white;text-decoration:underline;cursor:pointer;padding:10px}.hour-timeline details{font-size:.8rem;line-height:1.7;margin-top:10px}.hour-timeline summary{cursor:pointer}.hour-timeline button:focus-visible{outline:3px solid white}.hour-timeline details b{white-space:nowrap}
</style>
