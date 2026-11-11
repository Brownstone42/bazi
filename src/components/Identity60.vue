<script setup>
import { computed, ref } from 'vue'
import { identity60, identityElements, identityFromChart } from '../services/identity60.js'
import Identity60Art from './Identity60Art.vue'
const props = defineProps({ chart: { type: Object, default: null } })
const own = computed(() => identityFromChart(props.chart))
const query = ref('')
const element = ref('all')
const groups = computed(() => identityElements.map(group => ({ ...group, items: identity60.filter(item =>
  item.element === group.key && (element.value === 'all' || item.element === element.value)
    && `${item.id} ${item.number} ${item.title} ${item.subtitle}`.includes(query.value.trim())) })).filter(group => group.items.length))
</script>

<template>
  <section class="identity60" aria-labelledby="identity60-title">
    <header class="identity60-intro">
      <p class="eyebrow">DITI DATA · IDENTITY 60 · LOCAL PREVIEW</p>
      <h2 id="identity60-title">60 ภาพสะท้อนตัวตน</h2>
      <p>หนึ่งเสาวัน หนึ่งมุมมองให้สำรวจตัวเอง</p>
    </header>
    <article v-if="own" class="identity60-own" aria-label="ตัวตนจากเสาวันของฉัน">
      <Identity60Art :identity="own" />
      <div>
        <span class="identity60-badge">เสาวันของคุณ · {{ own.id }} · ลำดับ {{ own.number }}</span>
        <h3>{{ own.title }}</h3><strong>{{ own.subtitle }}</strong><p>{{ own.summary }}</p>
        <details><summary>อ่านตัวตนของฉัน</summary><section v-for="part in own.sections" :key="part.title"><h4>{{ part.title }}</h4><p>{{ part.text }}</p></section></details>
      </div>
    </article>
    <p v-else class="identity60-notice">ยังไม่ระบุตัวตนของคุณจนกว่าจะมีข้อมูลที่คำนวณปาจื้อได้ครบ คุณสำรวจทั้ง 60 แบบด้านล่างได้ก่อน โดยเราไม่สมมติเวลาเกิดให้</p>
    <p class="identity60-note">เลือกจากก้านฟ้าและกิ่งดินของเสาวันที่สูตรเดิมคำนวณได้ ไม่ใช่ผลวิเคราะห์ดวงครบสี่เสา เนื้อหาเป็นการตีความเชิงสัญลักษณ์เพื่อทบทวนตัวเอง ไม่ใช่แบบประเมินบุคลิกที่ผ่านการรับรอง</p>
    <div class="identity60-controls">
      <label>ค้นหาตัวตน<input v-model="query" type="search" placeholder="ชื่อ / อักษรจีน / ลำดับ" /></label>
      <label>กลุ่มธาตุ<select v-model="element"><option value="all">ทั้งหมด · 60 แบบ</option><option v-for="group in identityElements" :key="group.key" :value="group.key">{{ group.label }} · 12 แบบ</option></select></label>
    </div>
    <p v-if="!groups.length" role="status">ไม่พบตัวตนที่ตรงกับคำค้น ลองเปลี่ยนชื่อหรือเลือกทุกธาตุ</p>
    <section v-for="group in groups" :key="group.key" class="identity60-group" :aria-label="`ตัวตนธาตุ${group.label}`">
      <h3 :style="{ color: group.color }">ธาตุ{{ group.label }} <small>{{ group.items.length }} แบบ</small></h3>
      <details v-for="item in group.items" :key="item.id" class="identity60-row" :class="{ 'is-own': own?.id === item.id }">
        <summary><Identity60Art :identity="item" /><span><strong>{{ item.title }}</strong><small>{{ item.subtitle }}</small></span><span class="identity60-code">{{ item.id }}<small>{{ own?.id === item.id ? 'ของคุณ' : `#${item.number}` }}</small></span></summary>
        <div class="identity60-content"><p class="identity60-summary">{{ item.summary }}</p><section v-for="part in item.sections" :key="part.title"><h4>{{ part.title }}</h4><p>{{ part.text }}</p></section></div>
      </details>
    </section>
    <footer class="identity60-note">ชื่อ ภาพเวกเตอร์ และคำอธิบายจัดทำใหม่สำหรับ Diti Data · ฉบับทดลอง 1 · ยังไม่เผยแพร่</footer>
  </section>
</template>

<style scoped>
.identity60 { color: #51463e; max-width: 1000px; margin: auto; }
.identity60-intro { padding: 20px 0; }
.identity60-intro h2 { font-size: clamp(1.8rem, 4vw, 2.6rem); color: #741b28; margin: 8px 0; }
.identity60 p { line-height: 1.85; }
.identity60-own { display: grid; grid-template-columns: minmax(180px, .8fr) 1.5fr; gap: 28px; padding: 28px; background: #fffaf3; border: 1px solid #dfd2c5; border-radius: 24px; }
.identity60-own h3 { font-size: 1.8rem; color: #741b28; margin: 14px 0 6px; }
.identity60-badge { font-size: .8rem; color: #741b28; }
.identity60-note { font-size: .85rem; color: #796e64; margin: 24px 0; }
.identity60-notice { padding: 20px; background: #fffaf3; border-radius: 16px; }
.identity60-controls { display: grid; grid-template-columns: 2fr 1fr; gap: 14px; margin: 30px 0; }
.identity60-controls label { display: grid; gap: 8px; }
.identity60-controls input, .identity60-controls select { min-width: 0; width: 100%; min-height: 48px; padding: 12px; border: 1px solid #d8cec6; border-radius: 12px; font: inherit; color: inherit; background: #fffaf3; }
.identity60-group { margin: 28px 0; }
.identity60-group > h3 { display: flex; gap: 12px; align-items: baseline; }
.identity60-group > h3 small { font-size: .8rem; font-weight: 400; }
.identity60-row { border: 1px solid #e0d6cc; border-radius: 18px; margin: 12px 0; background: #fffdf8; overflow: hidden; }
.identity60-row.is-own { border-color: #741b28; }
.identity60-row > summary { display: flex; align-items: center; gap: 16px; padding: 16px; cursor: pointer; list-style: none; }
.identity60-row > summary::-webkit-details-marker { display: none; }
.identity60-row > summary::after { content: '+'; color: #741b28; font-size: 1.3rem; }
.identity60-row[open] > summary::after { content: '−'; }
.identity60-row summary .identity60-art { width: 80px; flex-shrink: 0; }
.identity60-row summary > span:nth-child(2) { flex: 1; min-width: 0; }
.identity60-row summary small { display: block; margin-top: 5px; color: #85776b; font-size: .8rem; }
.identity60-code { text-align: right; flex-shrink: 0; color: #741b28; }
.identity60-content { padding: 0 24px 24px; max-width: 780px; }
.identity60-content h4, .identity60-own h4 { color: #741b28; margin: 24px 0 6px; }
.identity60-summary { border-left: 3px solid #b99158; padding-left: 16px; }
.identity60-own summary { cursor: pointer; color: #741b28; font-weight: 700; padding: 12px 0; }
summary:focus-visible, input:focus-visible, select:focus-visible { outline: 3px solid #a57135; outline-offset: 3px; }
@media(max-width: 600px) { .identity60-own { grid-template-columns: 1fr; padding: 20px; } .identity60-own > .identity60-art { max-width: 280px; margin: auto; } .identity60-controls { grid-template-columns: 1fr; } .identity60-row > summary { gap: 10px; padding: 12px; } .identity60-row summary .identity60-art { width: 58px; } .identity60-code { font-size: .8rem; } }
</style>
