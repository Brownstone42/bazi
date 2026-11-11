<script setup>
import { computed, ref, watch } from 'vue'
import { bangkokDay } from '../services/calendar-view.js'
import { findQuestionDates, questionTopics } from '../services/bazi-questions.js'
import { buildSingleLoveReadings, singleLoveQuestions } from '../services/single-love.js'

const props = defineProps({ input: { type: Object, required: true } })
const mode = ref('daily')
const topic = ref('love-overview')
const topics = computed(() => mode.value === 'daily' ? singleLoveQuestions : questionTopics)
watch(mode, () => { topic.value = topics.value[0].id })
const date = ref(bangkokDay(new Date()))
const end = ref(date.value)
const result = ref(null)
const dates = ref([])
const error = ref('')
const busy = ref(false)
let request = 0
let loveCache = null
function clear() { request++; result.value = null; dates.value = []; error.value = ''; busy.value = false }
watch(() => JSON.stringify([props.input, mode.value, topic.value, date.value, end.value]), clear)
async function calculate() {
  const current = ++request
  busy.value = true
  error.value = ''
  result.value = null
  dates.value = []
  // Give the loading indicator a frame; reject stale work when inputs change.
  await new Promise(resolve => window.setTimeout(resolve, 0))
  if (current !== request) return
  try {
    if (mode.value === 'daily') {
      const key = JSON.stringify([props.input, date.value])
      if (loveCache?.key !== key) loveCache = { key, value: buildSingleLoveReadings({ input: props.input, date: date.value }) }
      result.value = loveCache.value.readings.find(item => item.topic === topic.value)
    }
    else dates.value = findQuestionDates({ input: props.input, start: date.value, end: end.value, topic: topic.value })
  } catch (cause) { error.value = cause.message || 'ยังวิเคราะห์ไม่ได้ กรุณาลองใหม่' }
  finally { if (current === request) busy.value = false }
}
</script>

<template>
  <section class="bazi-questions form-card" aria-labelledby="bazi-questions-title">
    <p class="eyebrow">LOCAL PROTOTYPE · ไม่เรียกเก็บเงิน</p>
    <h2 id="bazi-questions-title">ถามปาจื้อ</h2>
    <p>เลือกเรื่องที่อยากรู้ แล้วอ่านคำแนะนำสำหรับวันนี้ พร้อมสิ่งที่ลองทำได้และเรื่องที่ควรระวัง</p>
    <div class="question-modes" role="group" aria-label="รูปแบบการถาม">
      <button type="button" :aria-pressed="mode === 'daily'" @click="mode = 'daily'">คำถามรายวัน</button>
      <button type="button" :aria-pressed="mode === 'dates'" @click="mode = 'dates'">เลือกวันเหมาะสม</button>
    </div>
    <form class="question-form" @submit.prevent="calculate">
      <p v-if="mode === 'daily'">ความรัก · สำหรับคนโสด</p>
      <label class="field"><span>เรื่องที่อยากถาม</span><select v-model="topic"><option v-for="item in topics" :key="item.id" :value="item.id">{{ item.label }}</option></select></label>
      <label class="field"><span>{{ mode === 'daily' ? 'วันที่อยากถาม' : 'ตั้งแต่วันที่' }} · ประเทศไทย</span><input v-model="date" type="date" required /></label>
      <label v-if="mode === 'dates'" class="field"><span>ถึงวันที่ · ไม่เกิน 31 วัน</span><input v-model="end" type="date" required /></label>
      <p v-if="mode === 'dates'" class="question-note">จัดลำดับตามจำนวนองค์ประกอบสิบเทพที่สัมพันธ์กับหัวข้อในเกณฑ์ต้นแบบ ไม่ใช่ฤกษ์มงคลเต็มระบบหรือโอกาสสำเร็จ</p>
      <button class="welcome-start" type="submit" :disabled="busy">{{ busy ? 'กำลังวิเคราะห์…' : mode === 'daily' ? 'ดูคำอ่านพร้อมเหตุผล' : 'ค้นหาวันที่ควรพิจารณา' }}</button>
    </form>
    <p v-if="error" role="alert" class="comparison-error">{{ error }}</p>
    <div v-if="dates.length" class="question-date-results" aria-live="polite">
      <h3>วันที่ควรพิจารณา · อันดับทดลอง</h3>
      <button v-for="(item, index) in dates" :key="item.date" type="button" :aria-pressed="result?.date === item.date" @click="result = item">
        <strong>{{ index + 1 }}. {{ item.date }}</strong><span>{{ item.headline }}</span><small>องค์ประกอบตรงหัวข้อ {{ item.relevanceCount }} รายการ · ปฏิสัมพันธ์ที่ต้องอ่านร่วม {{ item.interactionCount }} รายการ</small><span>ดูเหตุผลและข้อควรระวัง →</span>
      </button>
    </div>
    <article v-if="result" :key="`${result.topic}-${result.date}`" class="question-result" aria-live="polite">
      <p class="eyebrow">{{ result.date }} · {{ result.topicLabel }}</p>
      <template v-if="result.presentation">
        <div class="plain-answer">
          <h3>{{ result.score.summary || result.presentation.headline }}</h3>
        </div>
        <details v-if="result.score.factors.length" class="score-details question-structure">
          <summary>ดูคะแนนและเหตุผล</summary>
          <h4>{{ result.score.label }}</h4>
          <p class="score-value">{{ result.score.value }} / {{ result.score.max }}</p>
          <p v-if="result.score.delta != null">ผลรวม {{ result.score.delta > 0 ? '+' : '' }}{{ result.score.delta }} เทียบค่ากลาง</p>
          <ul class="score-factors">
            <li v-for="factor in result.score.factors" :key="factor.id">
              <strong>{{ factor.delta > 0 ? '+' : '' }}{{ factor.delta }} · {{ factor.label }}</strong>
              <ul class="score-evidence"><li v-for="detail in factor.details" :key="detail.id">{{ detail.text }}</li></ul>
              <small>{{ factor.weightNote }}</small>
            </li>
          </ul>
          <small>“ปกติ” หมายถึงค่ากลาง {{ result.score.baseline }} ของเกณฑ์ทดลอง ไม่ใช่สถิติโอกาสจริง · คิดเฉพาะปัจจัยที่คำนวณได้ ไม่รับรองเหตุการณ์หรือความรู้สึกของอีกฝ่าย</small>
        </details>
      </template>
      <component :is="result.presentation ? 'details' : 'div'" v-if="!result.presentation" :class="{ 'calculation-details': result.presentation }">
        <summary v-if="result.presentation">ดูรายละเอียดการคำนวณ</summary>
        <h3>{{ result.headline }}</h3><p>{{ result.summary }}</p>
        <details v-if="result.structure" class="question-structure">
          <summary>โครงสร้างดวงและ用神ที่ใช้กับคำถามนี้</summary>
          <p>{{ result.structure.label }}</p>
          <p>{{ result.structure.useful.status === 'unresolved' ? 'ยังไม่สรุป用神: มีเงื่อนไขต้องตรวจเพิ่ม' : 'ตัวช่วย用神แบบมีเงื่อนไข · ยังเป็นสูตรทดลอง' }}</p>
          <p>{{ result.structure.useful.path }}</p>
          <section v-if="result.structure.resolution" class="structure-resolution">
            <h4>อะไรช่วย อะไรขัด และมีทางแก้ไหม</h4>
            <p>{{ result.structure.resolution.summary }}</p>
            <p v-if="result.structure.resolution.focus">โครงสร้างหลัก {{ result.structure.resolution.focus.god }}: {{ result.structure.resolution.focus.label }} · ดัชนี {{ result.structure.resolution.focus.index }}</p>
            <h4>ฝ่ายช่วยที่ตรวจ</h4>
            <p v-if="!result.structure.resolution.supports.length">ยังไม่เลือกฝ่ายช่วย เพราะเงื่อนไขโครงสร้างหรือกำลังดิถียังไม่ชัด</p>
            <ul><li v-for="item in result.structure.resolution.supports" :key="item.id">{{ item.god }}: {{ item.label }} · ดัชนี {{ item.index }}</li></ul>
            <h4>ฝ่ายขัดและทางแก้ที่ตรวจ</h4>
            <p v-if="!result.structure.resolution.conflicts.length">ไม่พบฝ่ายขัดในกฎที่ตรวจ ไม่ได้หมายความว่าตรวจครบทุกกรณีแล้ว</p>
            <div v-for="item in result.structure.resolution.conflicts" :key="item.id" class="structure-conflict">
              <p>{{ item.god }}: {{ item.label }} · ดัชนี {{ item.index }}</p>
              <p v-if="!item.rescues.length">ยังไม่รองรับกฎแก้กรณีนี้</p>
              <details v-for="rescue in item.rescues" :key="rescue.id">
                <summary>{{ rescue.god }} · {{ rescue.path }} — {{ rescue.label }}</summary>
                <p>ดัชนีตัวแก้ {{ rescue.index }} · ดัชนีฝ่ายขัด {{ item.index }} (น้ำหนักทดลอง ไม่ใช่โอกาสสำเร็จ)</p>
                <ul><li v-for="reason in rescue.reasons" :key="reason">{{ reason }}</li></ul>
              </details>
            </div>
            <small>{{ result.structure.resolution.ruleVersion }}</small>
          </section>
          <ul><li v-for="helper in result.structure.useful.helperCandidates" :key="helper.stem">ตัวช่วยเสนอ {{ helper.stem }} · {{ helper.god }} · {{ helper.presentAt.length ? 'พบในก้านฟ้าพื้นดวง' : 'ยังไม่พบในก้านฟ้าพื้นดวง' }} · {{ helper.rootsAt.length ? 'มีรากตรงก้าน' : 'ยังไม่พบรากตรงก้าน' }} · {{ helper.strength.levelLabel }}ตามสูตรทดลอง</li></ul>
          <ul><li v-for="reason in result.structure.useful.blockers" :key="reason">{{ reason }}</li></ul>
          <p>{{ result.structure.climate.text }}</p>
          <h4>ดวงจรเทียบกับตัวช่วยโครงสร้าง</h4>
          <p>{{ result.structureDay.text }}</p>
          <ul><li v-for="layer in result.structureContext" :key="layer.id">{{ layer.text }}</li></ul>
        </details>
        <details v-if="result.transits" class="question-structure transit-details">
          <summary>ดวงจรเข้ามาช่วยหรือขัดอย่างไร</summary>
          <p>อ่านสะสมจากวัยจร → ปี → เดือน → วัน โดยแยกสิ่งที่วันเพิ่มเข้ามาจากพื้นหลังระยะยาว</p>
          <section v-for="layer in result.transits.layers" :key="layer.key" class="structure-conflict">
            <h4>{{ layer.label }} · {{ layer.ganZhi }}</h4>
            <ul><li v-for="change in layer.changes" :key="change.id">{{ change.text }}</li></ul>
            <details>
              <summary>ดูฝ่ายช่วย–ฝ่ายขัดหลังเพิ่มชั้นนี้</summary>
              <p>{{ layer.resolution.summary }}</p>
              <ul><li v-for="item in layer.strengthChanges" :key="item.god">น้ำหนักกระตุ้น {{ item.god }}: {{ item.before }} → {{ item.after }} (เพิ่ม {{ item.delta }})</li></ul>
              <ul><li v-for="item in layer.resolution.evidence" :key="item.id">{{ item.text }}</li></ul>
            </details>
          </section>
          <ul><li v-for="limit in result.transits.limits" :key="limit">{{ limit }}</li></ul>
          <small>{{ result.transits.ruleVersion }}</small>
        </details>
        <details v-if="result.structure?.tenGodStrength" class="question-structure ten-god-strength">
          <summary>กำลังสิบเทพทั้ง 10 ตัวในพื้นดวง</summary>
          <p>ดูว่าบทบาทใดปรากฏมากน้อยและมีรากรองรับอย่างไร กำลังมากไม่ได้แปลว่าให้คุณ</p>
          <div class="ten-god-grid">
            <details v-for="god in result.structure.tenGodStrength.gods" :key="god.god" class="ten-god-item">
              <summary>{{ god.god }} · {{ god.name }} — {{ god.levelLabel }}</summary>
              <p>{{ god.presenceLabel }} · ดัชนีกำลังทดลอง {{ god.strengthIndex }}</p>
              <p>(ก้านฟ้า {{ god.visibleMass }} + ก้านซ่อน {{ god.hiddenMass }}) × ฤดูกาล {{ god.season.multiplier }}</p>
              <p>รากตรงก้าน {{ god.roots.length }} ตำแหน่ง · รากธาตุเดียวกันต่างขั้ว {{ god.elementRoots.length }} ตำแหน่ง (แสดงประกอบ ไม่บวกน้ำหนักซ้ำ)</p>
              <ul><li v-for="item in god.evidence" :key="item.id">{{ item.text }}</li></ul>
              <p v-if="god.interactions.length">พบปฏิสัมพันธ์ที่เกี่ยวกับตำแหน่งนี้ ยังไม่หักหรือเพิ่มกำลังอัตโนมัติ</p>
              <ul><li v-for="(item, index) in god.interactions" :key="index">{{ item.type }} · {{ item.branches.join('–') }}</li></ul>
            </details>
          </div>
          <p>{{ result.structure.tenGodStrength.method }}</p>
          <ul><li v-for="limit in result.structure.tenGodStrength.limits" :key="limit">{{ limit }}</li></ul>
          <small>{{ result.structure.tenGodStrength.ruleVersion }}</small>
        </details>
        <template v-if="result.supportingSignalIds">
          <h4>องค์ประกอบที่ใช้ตอบข้อนี้</h4>
          <ul><li v-for="id in result.supportingSignalIds" :key="id">{{ result.evidence.find(item => item.id === id)?.text }}</li></ul>
          <template v-if="result.counterSignalIds.length">
            <h4>องค์ประกอบที่ควรอ่านอีกด้านประกอบ</h4>
            <ul><li v-for="id in result.counterSignalIds" :key="id">{{ result.evidence.find(item => item.id === id)?.text }}</li></ul>
          </template>
        </template>
        <div class="question-actions"><section><h4>เตรียมตัวอย่างไร</h4><p>{{ result.action }}</p></section><section><h4>ควรระวังอะไร</h4><p>{{ result.caution }}</p></section></div>
        <h4>ชั้นข้อมูลที่นำมาอ่านร่วมกัน</h4>
        <div class="question-layers"><section v-for="layer in result.contexts" :key="layer.key"><small>{{ layer.label }}</small><strong>{{ layer.ganZhi }}</strong><span>{{ layer.god }} · {{ layer.godName }}</span></section></div>
        <details class="question-evidence">
          <summary>ดูหลักฐานและข้อจำกัดการวิเคราะห์</summary>
          <p>พื้นดวง: ดิถี {{ result.natal.dayMaster }} · เดือนเกิด {{ result.natal.season }} · ระดับกำลัง {{ result.natal.strength }} · คะแนนรากจากสูตรเดิม {{ result.natal.rootScore }} (ไม่ใช่ความแม่นยำ)</p>
          <ul><li v-for="item in result.evidence" :key="item.id"><strong>{{ item.layer }}</strong> · {{ item.text }} <small v-if="item.relevant">[สัมพันธ์กับหัวข้อในเกณฑ์ต้นแบบ]</small></li></ul>
          <h4>ข้อจำกัด</h4><ul><li v-for="limit in result.limits" :key="limit">{{ limit }}</li></ul>
          <small>เวอร์ชันเกณฑ์: {{ result.ruleVersion }}</small>
        </details>
      </component>
    </article>
    <p class="question-note">เป็นการตีความตามความเชื่อ ไม่รับประกันผล และไม่ใช้แทนข้อเท็จจริงหรือคำแนะนำจากผู้เชี่ยวชาญ</p>
  </section>
</template>

<style scoped>
.bazi-questions { color: #574d47; }
.bazi-questions p { line-height: 1.8; }
.question-modes { display: flex; flex-wrap: wrap; gap: 8px; margin: 20px 0; }
.question-modes button { min-height: 44px; padding: 10px 16px; border: 1px solid #d8cec6; border-radius: 12px; background: #fffaf4; color: #741b28; cursor: pointer; }
.question-modes button[aria-pressed=true] { background: #741b28; color: #fff6e8; }
.question-form { display: grid; gap: 16px; max-width: 720px; }
.question-form input, .question-form select { width: 100%; min-width: 0; min-height: 48px; padding: 10px 12px; border: 1px solid #d8cec6; border-radius: 12px; background: white; color: #574d47; font: inherit; }
.question-note { margin-top: 20px; font-size: .85rem; color: #786b64; }
.question-result { margin-top: 28px; padding-top: 24px; border-top: 1px solid #dfd2c5; }
.question-result h3 { color: #741b28; }
.plain-answer { max-width: 900px; }
.score-value { font-size: 1.8rem; font-weight: 700; color: #741b28; }
.score-factors { padding-left: 22px; }
.score-factors li { margin: 16px 0; }
.plain-answer li, .plain-reasons li { margin: 10px 0; line-height: 1.8; }
.calculation-details { margin-top: 16px; padding: 16px; border: 1px solid #dfd2c5; border-radius: 14px; overflow-wrap: anywhere; }
.calculation-details > summary { cursor: pointer; color: #741b28; font-weight: 700; min-height: 28px; }
.calculation-details > details { margin-top: 16px; }
.question-actions, .question-layers { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin: 20px 0; }
.question-actions section, .question-layers section { min-width: 0; padding: 16px; border-radius: 14px; background: #f2eee3; }
.question-layers small, .question-layers strong, .question-layers span { display: block; margin: 4px 0; }
.question-evidence, .question-structure { padding: 16px; border: 1px solid #dfd2c5; border-radius: 14px; line-height: 1.8; }
.question-evidence summary, .question-structure summary { cursor: pointer; color: #741b28; font-weight: 700; }
.question-evidence li { margin: 12px 0; }
.ten-god-strength { margin-top: 16px; }
.ten-god-grid { display: grid; gap: 12px; }
.ten-god-item, .structure-conflict { padding: 12px; background: #f2eee3; border-radius: 12px; overflow-wrap: anywhere; }
.question-date-results { margin-top: 28px; }
.question-date-results button { display: grid; gap: 8px; width: 100%; padding: 18px; margin: 12px 0; text-align: left; border: 1px solid #d8cec6; border-radius: 14px; background: #fffaf4; color: #574d47; cursor: pointer; }
.question-date-results button[aria-pressed=true] { border-color: #741b28; background: #f4e7e4; }
button:focus-visible, input:focus-visible, select:focus-visible, summary:focus-visible { outline: 3px solid #a57135; outline-offset: 3px; }
button:disabled { opacity: .65; cursor: wait; }
@media (max-width: 600px) { .question-actions { grid-template-columns: 1fr; } }
</style>
