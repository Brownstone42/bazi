<script setup>
import { computed, ref, useId, watch } from 'vue'
import { buildIdentity } from '../services/identity'
import { stemThai, branchThaiLabel, elementThaiLabel } from '../services/bazi'
const props = defineProps({ chart: { type: Object, required: true }, assessment: { type: Object, required: true }, input: { type: Object, required: true }, reading: { type: Object, required: true } })
const expanded = ref(false)
const detailsId = useId()
watch(() => [props.chart, props.input.birthDate, props.input.birthTime, props.input.gender, props.input.timezoneId], () => { expanded.value = false })
const identity = computed(() => buildIdentity(props.chart, props.assessment))
const pillars = computed(() => [
  { key: 'hour', title: 'ยาม' }, { key: 'day', title: 'วัน' },
  { key: 'month', title: 'เดือน' }, { key: 'year', title: 'ปี' }
].map(item => ({ ...item, value: props.chart.pillars[item.key] })))
const gradient = computed(() => {
  let start = 0
  return 'conic-gradient(' + identity.value.elements.map(item => {
    const end = start + item.share
    const segment = item.color + ' ' + start + '% ' + end + '%'
    start = end
    return segment
  }).join(',') + ')'
})
</script>

<template>
  <section class="identity-page">
    <article class="result-card identity-pillars">
      <h3>แปดอักษรประจำดวง</h3>
      <div class="pillars-grid">
        <article v-for="pillar in pillars" :key="pillar.key" class="pillar">
          <div class="pillar-label">{{ pillar.title }}</div>
          <div class="stem">{{ pillar.value?.stem || '—' }}</div>
          <div class="seed-translation">({{ stemThai(pillar.value) }})</div>
          <div class="branch">{{ pillar.value?.branch || '—' }}</div>
          <div class="seed-translation branch-translation">({{ branchThaiLabel(pillar.value) }})</div>
        </article>
      </div>
      <div class="day-master"><span>ธาตุประจำตัว</span><strong>{{ chart.dayMaster.char }} · {{ elementThaiLabel(chart.dayMaster.element) }}</strong></div>
      <div class="identity-natal-summary">
        <h2>{{ reading.headline }}</h2>
        <p>{{ reading.summary }}</p>
      </div>
      <div class="birth-summary">{{ input.birthDate }} · {{ input.birthTime }} น. · {{ input.timezoneId }}</div>
    </article>

    <section class="identity-block">
      <div class="identity-charts">
        <article class="identity-chart"><h4>สัดส่วนธาตุในพื้นดวง</h4><div class="identity-donut" :style="{ background: gradient }" role="img" :aria-label="identity.elements.map(item => item.label + ' ' + item.share + '%').join(' · ')"><div><strong>5 ธาตุ</strong><small>ส่วนประกอบพื้นดวง</small></div></div><div class="identity-legend"><span v-for="element in identity.elements" :key="element.key"><i :style="{ background: element.color }" />{{ element.label }} <b>{{ element.share }}%</b></span></div></article>
        <article class="identity-chart"><h4>บุคลิก 5 ด้าน</h4><div v-for="group in identity.groups" :key="group.key" class="identity-bar-row"><div><span>{{ group.label }}</span><b>{{ group.share }}%</b></div><div class="identity-bar"><span :style="{ width: group.share + '%' }" /></div></div></article>
      </div>
    </section>

    <button type="button" class="identity-more-button" :aria-expanded="expanded" :aria-controls="detailsId" @click="expanded = !expanded">
      {{ expanded ? 'ซ่อนรายละเอียด' : 'ดูเพิ่มเติม' }}
      <i :class="expanded ? 'pi pi-chevron-up' : 'pi pi-chevron-down'" aria-hidden="true" />
    </button>

    <div v-if="expanded" :id="detailsId" class="identity-details">
    <section class="identity-block">
      <section class="identity-all"><h4>ความถนัดทั้ง 10 ด้าน</h4><div class="identity-all-grid"><article v-for="talent in identity.talents" :key="talent.god"><div class="identity-bar-row"><div><strong>{{ talent.title }}</strong><b>{{ talent.share }}%</b></div><div class="identity-bar"><span :style="{ width: talent.share + '%' }" /></div></div><p>{{ talent.weight ? talent.description : 'ด้านนี้ไม่ปรากฏในองค์ประกอบที่นำมานับ ไม่ได้หมายความว่าคุณพัฒนาทักษะนี้ไม่ได้' }}</p></article></div></section>
    </section>
    <slot name="details" />
    </div>
  </section>
</template>
