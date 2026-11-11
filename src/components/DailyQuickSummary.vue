<script setup>
import { computed } from 'vue'
import { buildPersonalHours } from '../services/personal-calendar.js'
import { buildQimenDirections, dailyWealthDirection } from '../services/qimen-directions.js'
import { guideSymbols, mergeBestHours } from '../services/daily-guide.js'
const props = defineProps({ chart: { type: Object, required: true }, assessment: { type: Object, required: true }, input: { type: Object, required: true }, date: { type: String, required: true }, balance: { type: Object, default: null }, selectedHour: { type: Object, default: null } })
const best = computed(() => mergeBestHours(buildPersonalHours(props)))
const symbols = computed(() => guideSymbols(props.assessment, props.balance))
const time = computed(() => props.selectedHour?.date === props.date ? props.selectedHour.time : '00:30')
const qimen = computed(() => buildQimenDirections(props.date, time.value))
const wealth = computed(() => dailyWealthDirection(props.date))
const deityRows = computed(() => [{ label: 'อำนาจ', value: qimen.value.authority }, { label: 'อธิษฐาน', value: qimen.value.prayer }, { label: 'มั่งคั่ง', value: qimen.value.wealth }])
const travelRows = computed(() => [{ label: 'เริ่มงานใหม่', value: qimen.value.work }, { label: 'ไปพักผ่อน', value: qimen.value.rest }, { label: 'ควรเลี่ยง', value: qimen.value.avoid }])
</script>
<template>
  <section class="daily-quick-summary" aria-label="สรุปยาม สี และทิศ">
    <div class="quick-columns daily-highlights">
      <section class="best-time"><h3><i class="pi pi-clock" aria-hidden="true" /> ยามดีที่สุด</h3><strong v-for="hour in best" :key="hour">{{ hour }}</strong><p v-if="!best.length">ยังไม่มียามระดับดีวันนี้</p><small>เวลาไทย</small></section>
      <section><h3><i class="pi pi-palette" aria-hidden="true" /> สีมงคล</h3><div v-for="option in symbols.options" :key="option.element" class="quick-color"><span :style="{ background: option.swatch }" /><strong>{{ option.color }}</strong></div><p v-if="!symbols.options.length">ยังประเมินสีไม่ได้</p><small v-if="symbols.avoid.length">เลี่ยงสี{{ symbols.avoid.join(' / ') }}</small></section>
      <section><h3><i class="pi pi-compass" aria-hidden="true" /> ทิศโชคลาภ</h3><strong>{{ wealth }}</strong><small>ทิศประจำวัน</small></section>
    </div>
    <section class="direction-group" aria-live="polite">
      <h3>ทิศแห่งชัยชนะยามนี้ <small>{{ selectedHour?.date === date ? selectedHour.label : time }} · เวลาไทย</small></h3>
      <div class="quick-columns"><section v-for="row in deityRows" :key="row.label"><small>{{ row.label }}</small><strong>{{ row.value }}</strong></section></div>
    </section>
    <section class="direction-group" aria-live="polite"><h3>ทิศออกเดินทาง <small>ประตูฉีเหมิน · ยามเดียวกัน</small></h3><div class="quick-columns"><section v-for="row in travelRows" :key="row.label"><small>{{ row.label }}</small><strong>{{ row.value }}</strong></section></div></section>
    <section v-if="symbols.numbers.length" class="number-row"><h3>เลขเสริมพลังวันนี้</h3><strong v-for="number in symbols.numbers" :key="number">{{ number }}</strong></section>
  </section>
</template>
<style scoped>
.daily-quick-summary{margin:0 16px 24px;padding:24px 20px;background:#fffdf8;border-radius:24px;color:#463d36}
.quick-columns{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}
.quick-columns>section{min-width:0;text-align:center}
h3{font-size:.88rem;font-weight:500;color:#827163;margin:0 0 10px;line-height:1.6}
h3 .pi{font-size:.88rem;margin-right:3px;color:#9d7458}
strong{display:block;font-size:1rem;font-weight:600;line-height:1.65;overflow-wrap:break-word;text-wrap:balance}
small{display:block;font-size:.78rem;color:#89786a;line-height:1.7;margin-top:5px}
p{font-size:.85rem;line-height:1.7;margin:6px 0}
.best-time strong{font-variant-numeric:tabular-nums;white-space:nowrap;color:#711d2b;font-size:1.12rem}
.quick-color{display:flex;justify-content:center;gap:8px;align-items:center;margin:5px 0}
.quick-color>span{width:20px;height:20px;border:1px solid #463d3626;border-radius:50%;flex-shrink:0;box-shadow:inset 0 0 0 3px #ffffff60}
.direction-group{border-top:1px solid #e9dfd4;margin-top:24px;padding-top:22px}
.direction-group>h3{text-align:left;color:#711d2b;font-size:1rem;font-weight:600;margin-bottom:18px}
.direction-group>h3 small{font-weight:400;font-size:.76rem;margin-top:3px}
.direction-group .quick-columns small{margin:0 0 7px;font-size:.82rem}
.direction-group strong{font-size:.95rem;color:#4d3732}
.number-row{display:flex;flex-wrap:wrap;align-items:center;gap:10px;border-top:1px solid #e9dfd4;margin-top:24px;padding-top:22px}
.number-row h3{margin:0 auto 0 0;color:#711d2b;font-size:.92rem;font-weight:500}
.number-row strong{display:grid;place-items:center;border-radius:50%;background:#f3e7df;color:#711d2b;width:40px;height:40px;font-size:1.12rem;font-variant-numeric:tabular-nums}
@media(max-width:540px){
.daily-quick-summary{padding:22px 18px;margin-left:12px;margin-right:12px;border-radius:22px}
.daily-highlights{grid-template-columns:1fr 1fr;gap:20px 14px}
.daily-highlights .best-time{grid-column:1/-1;padding-bottom:18px;border-bottom:1px solid #e9dfd4}
.best-time h3{margin-bottom:6px}.best-time strong{font-size:1.45rem;letter-spacing:.015em}.best-time small{font-size:.72rem;margin-top:3px}
.direction-group .quick-columns{grid-template-columns:1fr;gap:0}
.direction-group .quick-columns>section{display:flex;align-items:baseline;justify-content:space-between;gap:16px;text-align:left;padding:10px 0}
.direction-group .quick-columns>section+section{border-top:1px solid #eee6dd}
.direction-group .quick-columns small{margin:0;font-size:.85rem;flex-shrink:0}
.direction-group strong{text-align:right;font-size:1rem}
.direction-group>h3{margin-bottom:8px}.number-row{margin-top:20px;padding-top:20px}
}
</style>
