<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import Button from 'primevue/button'
import DatePicker from 'primevue/datepicker'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import Textarea from 'primevue/textarea'
import {
  branchThaiLabel,
  calculateChart,
  calculateChartWithOptionalTime,
  elementThaiLabel,
  pillarLabel,
  stemThai
} from './services/bazi'
import { interpretNatalChart } from './services/interpretation'
import { assessDayMasterStrength } from './services/strength-engine'
import { createBlindTest, evaluateBlindTest } from './services/blind-test'
import { buildLuckPillarTimeline, interpretLuckPillar } from './services/luck-pillars'
import { interpretCompatibility } from './services/compatibility'

const isBlindTestMode = new URLSearchParams(window.location.search).get('mode') === 'blind-test'

const form = reactive({
  birthDate: '26/08/1989',
  birthTime: '11:30',
  gender: 'male',
  timezoneId: 'Asia/Bangkok'
})

const comparisonForm = reactive({
  name: '',
  birthDate: '',
  birthTime: '',
  gender: 'female',
  timezoneId: 'Asia/Bangkok',
  relationship: 'partner',
  focus: 'love'
})

const genderOptions = [
  { label: 'ชาย', value: 'male' },
  { label: 'หญิง', value: 'female' }
]
const relationshipOptions = [
  { label: 'คนที่สนใจ / กำลังคุย', value: 'interest' },
  { label: 'แฟน', value: 'partner' },
  { label: 'คู่สมรส', value: 'spouse' },
  { label: 'พ่อหรือแม่', value: 'parent' },
  { label: 'ลูก', value: 'child' },
  { label: 'พี่หรือน้อง', value: 'sibling' },
  { label: 'เพื่อน', value: 'friend' },
  { label: 'เจ้านาย', value: 'boss' },
  { label: 'เพื่อนร่วมงาน', value: 'colleague' },
  { label: 'ลูกน้อง', value: 'subordinate' },
  { label: 'หุ้นส่วนธุรกิจ', value: 'business_partner' },
  { label: 'ลูกค้าหรือคู่ค้า', value: 'client' }
]
const comparisonFocusOptions = [
  { label: 'ความรักและชีวิตคู่', value: 'love' },
  { label: 'ครอบครัวและการอยู่ร่วมกัน', value: 'family' },
  { label: 'การทำงานและธุรกิจ', value: 'work' },
  { label: 'เพื่อนและการคบหากัน', value: 'friendship' },
  { label: 'ภาพรวมความสัมพันธ์', value: 'overview' }
]
const focusByRelationship = {
  interest: ['love', 'friendship', 'overview'],
  partner: ['love', 'family', 'work', 'overview'],
  spouse: ['love', 'family', 'work', 'overview'],
  parent: ['family', 'overview'],
  child: ['family', 'overview'],
  sibling: ['family', 'work', 'overview'],
  friend: ['friendship', 'work', 'overview'],
  boss: ['work', 'overview'],
  colleague: ['work', 'friendship', 'overview'],
  subordinate: ['work', 'overview'],
  business_partner: ['work', 'overview'],
  client: ['work', 'overview']
}
const featuredTimezones = [
  { label: 'ประเทศไทย · กรุงเทพฯ (UTC+7)', value: 'Asia/Bangkok' },
  { label: 'สิงคโปร์ (UTC+8)', value: 'Asia/Singapore' },
  { label: 'ฮ่องกง (UTC+8)', value: 'Asia/Hong_Kong' },
  { label: 'จีน · เซี่ยงไฮ้ (UTC+8)', value: 'Asia/Shanghai' },
  { label: 'ญี่ปุ่น · โตเกียว (UTC+9)', value: 'Asia/Tokyo' },
  { label: 'เกาหลีใต้ · โซล (UTC+9)', value: 'Asia/Seoul' },
  { label: 'สหราชอาณาจักร · ลอนดอน', value: 'Europe/London' },
  { label: 'สหรัฐฯ · นิวยอร์ก', value: 'America/New_York' },
  { label: 'สหรัฐฯ · ลอสแอนเจลิส', value: 'America/Los_Angeles' },
  { label: 'ออสเตรเลีย · ซิดนีย์', value: 'Australia/Sydney' }
]

const timezoneOptions = (() => {
  const featured = new Set(featuredTimezones.map((zone) => zone.value))
  const supported = typeof Intl.supportedValuesOf === 'function'
    ? Intl.supportedValuesOf('timeZone')
    : []
  return [
    ...featuredTimezones,
    ...supported.filter((zone) => !featured.has(zone)).map((zone) => ({ label: zone, value: zone }))
  ]
})()
const chart = ref(null)
const calculatedInput = ref(null)
const error = ref('')
const feedback = reactive({})
const blindTest = ref(null)
const blindSelection = ref('')
const blindFocus = ref('')
const blindReason = ref('')
const blindError = ref('')
const blindResult = ref(null)
const blindAttempts = ref(0)
const selectedLuckCycleIndex = ref(null)
const comparisonResult = ref(null)
const comparisonError = ref('')
const activeView = ref(viewFromHash())
const luckTrack = ref(null)

const blindFocusOptions = [
  { label: 'ภาพรวมบุคลิก', value: 'identity' },
  { label: 'รูปแบบการทำงาน', value: 'work' },
  { label: 'ความสัมพันธ์', value: 'relationship' },
  { label: 'สิ่งที่ควรระวัง', value: 'risk' },
  { label: 'ไม่มีส่วนใดเป็นพิเศษ', value: 'none' }
]

const pillars = computed(() => chart.value ? [
  { key: 'hour', title: 'ยาม', subtitle: 'เสายาม', value: chart.value.pillars.hour },
  { key: 'day', title: 'วัน', subtitle: 'เสาวัน', value: chart.value.pillars.day },
  { key: 'month', title: 'เดือน', subtitle: 'เสาเดือน', value: chart.value.pillars.month },
  { key: 'year', title: 'ปี', subtitle: 'เสาปี', value: chart.value.pillars.year }
] : [])
const strength = computed(() => chart.value ? assessDayMasterStrength(chart.value) : null)
const reading = computed(() => chart.value && strength.value ? interpretNatalChart(chart.value, strength.value) : null)
const luckTimeline = computed(() => chart.value && calculatedInput.value
  ? buildLuckPillarTimeline(chart.value, calculatedInput.value.gender, calculatedInput.value.timezoneId)
  : null)
const selectedLuckCycle = computed(() => {
  const cycles = luckTimeline.value?.cycles ?? []
  return cycles.find((cycle) => cycle.index === selectedLuckCycleIndex.value) ??
    cycles.find((cycle) => cycle.isCurrent) ??
    cycles[0] ??
    null
})
const selectedLuckReading = computed(() => chart.value && strength.value && selectedLuckCycle.value
  ? interpretLuckPillar(chart.value, strength.value, selectedLuckCycle.value)
  : null)
const selectedLuckPosition = computed(() => luckTimeline.value?.cycles.findIndex((cycle) => cycle.index === selectedLuckCycle.value?.index) ?? -1)
const canMoveLuckPrevious = computed(() => selectedLuckPosition.value > 0)
const canMoveLuckNext = computed(() => selectedLuckPosition.value >= 0 && selectedLuckPosition.value < (luckTimeline.value?.cycles.length ?? 0) - 1)
const selectedRelationshipLabel = computed(() => relationshipOptions.find((item) => item.value === comparisonForm.relationship)?.label ?? 'อีกฝ่าย')
const availableComparisonFocusOptions = computed(() => {
  const allowed = focusByRelationship[comparisonForm.relationship] ?? ['overview']
  return comparisonFocusOptions.filter((item) => allowed.includes(item.value))
})

function viewFromHash() {
  if (window.location.hash === '#luck') return 'luck'
  if (window.location.hash === '#compare') return 'compare'
  return 'profile'
}

function submit() {
  error.value = ''
  try {
    const input = { ...form }
    chart.value = calculateChart(input)
    calculatedInput.value = input
    selectedLuckCycleIndex.value = null
    Object.keys(feedback).forEach((key) => delete feedback[key])
    if (isBlindTestMode) startBlindTest()
  } catch (cause) {
    chart.value = null
    calculatedInput.value = null
    error.value = cause instanceof Error ? cause.message : 'ไม่สามารถคำนวณผังได้'
  }
}

function centerSelectedLuckCycle(behavior = 'smooth') {
  const track = luckTrack.value
  if (!track || !selectedLuckCycle.value) return
  const target = track.querySelector(`[data-cycle-index="${selectedLuckCycle.value.index}"]`)
  if (!target) return
  const left = target.offsetLeft - (track.clientWidth - target.offsetWidth) / 2
  track.scrollTo({ left, behavior })
}

function selectLuckCycle(index, behavior = 'smooth') {
  selectedLuckCycleIndex.value = index
  nextTick(() => centerSelectedLuckCycle(behavior))
}

function moveLuckCycle(direction) {
  const cycles = luckTimeline.value?.cycles ?? []
  const nextCycle = cycles[selectedLuckPosition.value + direction]
  if (nextCycle) selectLuckCycle(nextCycle.index)
}

function setActiveView(view) {
  activeView.value = view
  window.location.hash = view === 'luck' ? 'luck' : view === 'compare' ? 'compare' : 'profile'
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function syncViewFromHash() {
  activeView.value = viewFromHash()
}

function handleViewportResize() {
  if (activeView.value === 'luck') centerSelectedLuckCycle('auto')
}

function submitComparison() {
  comparisonError.value = ''
  comparisonResult.value = null

  try {
    if (!chart.value) throw new Error('กรุณาคำนวณพื้นดวงของคุณก่อน')
    const { chart: otherChart, hasBirthTime } = calculateChartWithOptionalTime(comparisonForm)
    comparisonResult.value = interpretCompatibility(chart.value, otherChart, {
      relationship: comparisonForm.relationship,
      focus: comparisonForm.focus,
      hasBirthTime
    })
  } catch (cause) {
    comparisonError.value = cause instanceof Error ? cause.message : 'ไม่สามารถเปรียบเทียบความสัมพันธ์ได้'
  }
}

function startBlindTest() {
  if (!chart.value || !strength.value) return
  const seed = `${calculatedInput.value.birthDate}|${calculatedInput.value.birthTime}|${calculatedInput.value.timezoneId}|${blindAttempts.value}`
  blindTest.value = createBlindTest(chart.value.dayMaster.char, strength.value.strengthLevel, seed)
  blindSelection.value = ''
  blindFocus.value = ''
  blindReason.value = ''
  blindError.value = ''
  blindResult.value = null
}

function storeBlindResult(record) {
  try {
    const key = 'bazi-blind-test-results'
    const current = JSON.parse(window.localStorage.getItem(key) || '[]')
    window.localStorage.setItem(key, JSON.stringify([...current, record]))
  } catch {
    // การบันทึกในเครื่องเป็นส่วนเสริม ผลทดสอบบนหน้าจอยังใช้งานได้ตามปกติ
  }
}

function submitBlindTest() {
  blindError.value = ''
  if (!blindFocus.value || !blindReason.value.trim()) {
    blindError.value = 'กรุณาเลือกส่วนที่ช่วยตัดสินใจและบอกเหตุผลสั้น ๆ'
    return
  }

  try {
    const evaluation = evaluateBlindTest(blindTest.value, blindSelection.value)
    blindResult.value = evaluation
    storeBlindResult({
      ...evaluation,
      decisiveSection: blindFocus.value,
      reason: blindReason.value.trim(),
      dayMaster: blindTest.value.dayMaster,
      strengthLevel: blindTest.value.strengthLevel,
      contentVersion: blindTest.value.contentVersion,
      createdAt: new Date().toISOString()
    })
    blindAttempts.value += 1
  } catch (cause) {
    blindError.value = cause instanceof Error ? cause.message : 'ไม่สามารถบันทึกผลทดสอบได้'
  }
}

watch(activeView, (view) => {
  if (view === 'luck') nextTick(() => centerSelectedLuckCycle('auto'))
})

watch(() => comparisonForm.relationship, () => {
  if (!availableComparisonFocusOptions.value.some((item) => item.value === comparisonForm.focus)) {
    comparisonForm.focus = availableComparisonFocusOptions.value[0]?.value ?? 'overview'
  }
  comparisonResult.value = null
})

onMounted(() => {
  window.addEventListener('hashchange', syncViewFromHash)
  window.addEventListener('resize', handleViewportResize)
  if (activeView.value === 'luck') nextTick(() => centerSelectedLuckCycle('auto'))
})
onBeforeUnmount(() => {
  window.removeEventListener('hashchange', syncViewFromHash)
  window.removeEventListener('resize', handleViewportResize)
})

submit()
</script>

<template>
  <main class="page-shell">
    <header class="hero">
      <div class="brand-mark">八字</div>
      <div>
        <p class="eyebrow">BAZI CALENDAR LAB</p>
        <h1>ผังโป๊ยหยี่สี่เถี่ยว</h1>
        <p class="hero-copy">
          {{ isBlindTestMode ? 'เครื่องมือภายในสำหรับทดสอบคุณภาพคำอ่านโดยไม่เฉลยดวงล่วงหน้า' : 'ต้นแบบสำหรับตรวจสอบ 8 เม็ดจากวัน เวลา และสถานที่เกิด' }}
        </p>
      </div>
    </header>

    <nav v-if="!isBlindTestMode" class="view-navigation" aria-label="เลือกหน้าคำอ่าน">
      <button
        type="button"
        :class="{ active: activeView === 'profile' }"
        :aria-current="activeView === 'profile' ? 'page' : undefined"
        @click="setActiveView('profile')"
      >
        <i class="pi pi-user" />
        <span><strong>พื้นดวง</strong><small>ตัวตนและด้านต่าง ๆ ของชีวิต</small></span>
      </button>
      <button
        type="button"
        :class="{ active: activeView === 'luck' }"
        :aria-current="activeView === 'luck' ? 'page' : undefined"
        @click="setActiveView('luck')"
      >
        <i class="pi pi-chart-line" />
        <span><strong>จังหวะชีวิต 10 ปี</strong><small>แนวโน้มในแต่ละช่วงวัย</small></span>
      </button>
      <button
        type="button"
        :class="{ active: activeView === 'compare' }"
        :aria-current="activeView === 'compare' ? 'page' : undefined"
        @click="setActiveView('compare')"
      >
        <i class="pi pi-users" />
        <span><strong>เปรียบเทียบบุคคล</strong><small>คำแนะนำสำหรับความสัมพันธ์</small></span>
      </button>
    </nav>

    <section v-if="isBlindTestMode || activeView === 'profile'" class="workspace">
      <form class="form-card" @submit.prevent="submit">
        <div class="section-heading">
          <span class="step">01</span>
          <div>
            <h2>{{ isBlindTestMode ? 'ข้อมูลผู้ทดสอบ' : 'ข้อมูลวันเกิด' }}</h2>
            <p>{{ isBlindTestMode ? 'ระบบจะใช้ข้อมูลคำนวณคำตอบ แต่ยังไม่แสดงผลให้เห็น' : 'กรอกตามเวลาท้องถิ่นที่บันทึกไว้' }}</p>
          </div>
        </div>

        <div class="field-grid">
          <label class="field">
            <span>วันเกิด (วัน/เดือน/ปี ค.ศ.)</span>
            <DatePicker
              v-model="form.birthDate"
              date-format="dd/mm/yy"
              update-model-type="string"
              placeholder="วว/ดด/ปปปป"
              show-icon
              fluid
              required
            />
          </label>
          <label class="field">
            <span>เวลาเกิด (รูปแบบ 24 ชั่วโมง)</span>
            <InputText v-model="form.birthTime" type="text" inputmode="numeric" placeholder="เช่น 23:30" maxlength="5" required />
          </label>
          <label class="field field-wide">
            <span>เพศ</span>
            <Select v-model="form.gender" :options="genderOptions" option-label="label" option-value="value" />
          </label>
        </div>

        <label class="field timezone-field">
          <span>เขตเวลาที่เกิด</span>
          <Select
            v-model="form.timezoneId"
            :options="timezoneOptions"
            option-label="label"
            option-value="value"
            filter
            filter-placeholder="ค้นหาเมืองหรือเขตเวลา"
          />
          <small>เลือกตามประเทศหรือเมืองที่เกิด</small>
        </label>

        <Button
          type="submit"
          :label="isBlindTestMode ? 'เริ่มการทดสอบ' : 'คำนวณผังดวง'"
          icon="pi pi-sparkles"
          class="calculate-button"
        />
      </form>

      <section v-if="!isBlindTestMode" class="result-card">
        <div class="result-topline">
          <div>
            <p class="eyebrow">FOUR PILLARS</p>
            <h2>แปดอักษรประจำดวง</h2>
          </div>
          <span class="status-dot">คำนวณในเครื่อง</span>
        </div>

        <div v-if="error" class="error-box">
          <i class="pi pi-exclamation-circle" />{{ error }}
        </div>

        <template v-else-if="chart">
          <div class="pillars-grid">
            <article v-for="pillar in pillars" :key="pillar.key" class="pillar">
              <div class="pillar-label">{{ pillar.title }} <small>{{ pillar.subtitle }}</small></div>
              <div class="stem">{{ pillar.value?.stem || '—' }}</div>
              <div class="seed-translation">({{ stemThai(pillar.value) }})</div>
              <div class="branch">{{ pillar.value?.branch || '—' }}</div>
              <div class="seed-translation branch-translation">({{ branchThaiLabel(pillar.value) }})</div>
              <div class="pillar-code">{{ pillarLabel(pillar.value) }}</div>
            </article>
          </div>

          <div class="day-master">
            <span>ดิถี · Day Master</span>
            <strong>{{ chart.dayMaster?.char || chart.pillars.day.stem }} · {{ elementThaiLabel(chart.dayMaster?.element) }}</strong>
          </div>

          <div class="birth-summary">
            <i class="pi pi-clock" />
            {{ calculatedInput.birthDate }} · {{ calculatedInput.birthTime }} · {{ calculatedInput.timezoneId }}
          </div>
        </template>

        <p class="disclaimer">คำอ่านเป็นแนวโน้มจากข้อมูลวันเกิด ไม่ใช่ข้อสรุปตายตัวหรือคำแนะนำทางการแพทย์</p>
      </section>

      <section v-else class="blind-test-card">
        <div class="result-topline">
          <div>
            <p class="eyebrow">BLIND READING TEST</p>
            <h2>เลือกคำอ่านที่ใกล้เคียงคุณที่สุด</h2>
          </div>
          <span class="internal-badge">สำหรับทดสอบภายใน</span>
        </div>

        <p class="blind-instruction">
          ทั้งสามชุดถูกเขียนด้วยระดับกำลังดวงเดียวกัน มีเพียงหนึ่งชุดที่สร้างจากดิถีของผู้ทดสอบ
          อ่านให้ครบก่อนเลือก โดยไม่ต้องพยายามเดาตัวอักษรจีน
        </p>

        <div v-if="error" class="blind-error"><i class="pi pi-exclamation-circle" />{{ error }}</div>

        <template v-else-if="blindTest">
          <div class="blind-candidates">
            <article
              v-for="candidate in blindTest.candidates"
              :key="candidate.id"
              class="blind-candidate"
              :class="{
                selected: blindSelection === candidate.id,
                answer: blindResult && candidate.id === blindResult.answerId,
                incorrect: blindResult && candidate.id === blindResult.selectedId && !blindResult.isCorrect
              }"
            >
              <div class="candidate-heading">
                <strong>ชุด {{ candidate.id }}</strong>
                <button
                  type="button"
                  :disabled="Boolean(blindResult)"
                  @click="blindSelection = candidate.id"
                >
                  <i :class="blindSelection === candidate.id ? 'pi pi-check-circle' : 'pi pi-circle'" />
                  {{ blindSelection === candidate.id ? 'เลือกแล้ว' : 'เลือกชุดนี้' }}
                </button>
              </div>
              <p>{{ candidate.identity }}</p>
              <dl>
                <div><dt>การทำงาน</dt><dd>{{ candidate.work }}</dd></div>
                <div><dt>ความสัมพันธ์</dt><dd>{{ candidate.relationship }}</dd></div>
                <div><dt>สิ่งที่ควรระวัง</dt><dd>{{ candidate.risk }}</dd></div>
              </dl>
            </article>
          </div>

          <div v-if="!blindResult" class="blind-response">
            <label class="field">
              <span>ส่วนใดช่วยให้คุณตัดสินใจมากที่สุด</span>
              <Select
                v-model="blindFocus"
                :options="blindFocusOptions"
                option-label="label"
                option-value="value"
                placeholder="เลือกหนึ่งข้อ"
              />
            </label>
            <label class="field">
              <span>เพราะอะไรจึงเลือกชุดนี้</span>
              <Textarea
                v-model="blindReason"
                rows="3"
                auto-resize
                placeholder="เช่น รูปแบบการทำงานใกล้เคียง แต่เรื่องความสัมพันธ์ยังไม่ตรง"
              />
            </label>
            <div v-if="blindError" class="blind-error"><i class="pi pi-exclamation-circle" />{{ blindError }}</div>
            <Button label="ส่งคำตอบและดูเฉลย" icon="pi pi-check" class="calculate-button" @click="submitBlindTest" />
          </div>

          <div v-else class="blind-result" :class="blindResult.isCorrect ? 'correct' : 'not-correct'">
            <i :class="blindResult.isCorrect ? 'pi pi-check-circle' : 'pi pi-info-circle'" />
            <div>
              <strong>{{ blindResult.isCorrect ? 'คุณเลือกชุดที่สร้างจากดวงจริง' : 'คำอ่านที่สร้างจากดวงจริงคือชุด ' + blindResult.answerId }}</strong>
              <p>ผลและเหตุผลถูกบันทึกไว้ในเครื่องนี้แล้ว โดยไม่ได้เก็บวันเกิดหรือเขตเวลา</p>
            </div>
          </div>
        </template>
      </section>
    </section>

    <section v-if="reading && !isBlindTestMode && activeView === 'profile'" class="reading-section">
      <div class="reading-intro">
        <div>
          <p class="eyebrow">พื้นดวงและด้านต่าง ๆ ของชีวิต</p>
          <h2>{{ reading.headline }}</h2>
          <p>{{ reading.summary }}</p>
        </div>
        <div class="reading-badge">
          <i class="pi pi-sparkles" /> คำอ่านพื้นดวง
        </div>
      </div>

      <div class="insight-grid">
        <article v-for="item in reading.lifeAreas" :key="item.id" class="insight-card life-area-card">
          <div class="insight-icon"><i class="pi" :class="item.icon" /></div>
          <h3>{{ item.title }}</h3>
          <strong class="life-verdict">{{ item.verdict }}</strong>
          <p>{{ item.text }}</p>
          <div v-if="item.recommendations" class="career-recommendations">
            <span>แนวอาชีพที่ควรพิจารณาเป็นอันดับต้น</span>
            <div><b v-for="role in item.recommendations" :key="role">{{ role }}</b></div>
          </div>
          <p v-if="item.environment" class="work-environment"><strong>สภาพงานที่ส่งเสริม:</strong> {{ item.environment }}</p>
          <div class="life-actions">
            <div><span><i class="pi pi-check-circle" /> ควรทำ</span><p>{{ item.shouldDo }}</p></div>
            <div><span><i class="pi pi-times-circle" /> ควรหลีกเลี่ยง</span><p>{{ item.shouldAvoid }}</p></div>
          </div>
          <small v-if="item.disclaimer" class="life-disclaimer">{{ item.disclaimer }}</small>
          <div class="feedback-row">
            <span>{{ feedback[item.id] ? 'ขอบคุณสำหรับคำตอบ' : 'ข้อนี้ตรงกับคุณไหม?' }}</span>
            <div v-if="!feedback[item.id]">
              <button type="button" aria-label="ตรง" @click="feedback[item.id] = 'yes'"><i class="pi pi-thumbs-up" /></button>
              <button type="button" aria-label="ไม่ตรง" @click="feedback[item.id] = 'no'"><i class="pi pi-thumbs-down" /></button>
            </div>
            <i v-else class="pi pi-check-circle feedback-done" />
          </div>
        </article>
      </div>
    </section>

    <section v-if="!isBlindTestMode && activeView === 'compare'" class="comparison-section">
      <div class="view-profile-summary">
        <div>
          <span>ข้อมูลของคุณที่ใช้เปรียบเทียบ</span>
          <strong>{{ calculatedInput.birthDate }} · {{ calculatedInput.birthTime }} · {{ calculatedInput.gender === 'male' ? 'ชาย' : 'หญิง' }}</strong>
          <small>{{ calculatedInput.timezoneId }}</small>
        </div>
        <button type="button" @click="setActiveView('profile')"><i class="pi pi-pencil" /> แก้ไขข้อมูล</button>
      </div>

      <div class="comparison-heading">
        <div>
          <p class="eyebrow">คำแนะนำเฉพาะความสัมพันธ์</p>
          <h2>เปรียบเทียบคุณกับอีกฝ่าย</h2>
          <p>เลือกอีกฝ่ายหนึ่งคนและเรื่องที่ต้องการดูหนึ่งเรื่อง เพื่อให้คำแนะนำตรงกับสถานการณ์ของคุณ</p>
        </div>
        <span class="premium-badge"><i class="pi pi-lock" /> ฟีเจอร์พิเศษ</span>
      </div>

      <form class="comparison-form" @submit.prevent="submitComparison">
        <div class="comparison-form-heading">
          <span class="step">01</span>
          <div><h3>ข้อมูลของอีกฝ่าย</h3><p>เวลาเกิดเว้นว่างได้หากไม่ทราบ</p></div>
        </div>

        <div class="comparison-fields">
          <label class="field field-wide">
            <span>ชื่อที่ใช้เรียก <small>(ไม่บังคับ)</small></span>
            <InputText v-model="comparisonForm.name" placeholder="เช่น คุณเอ" />
          </label>
          <label class="field">
            <span>วันเกิด (วัน/เดือน/ปี ค.ศ.)</span>
            <DatePicker
              v-model="comparisonForm.birthDate"
              date-format="dd/mm/yy"
              update-model-type="string"
              placeholder="วว/ดด/ปปปป"
              show-icon
              fluid
              required
            />
          </label>
          <label class="field">
            <span>เวลาเกิด (24 ชั่วโมง) <small>(ไม่บังคับ)</small></span>
            <InputText v-model="comparisonForm.birthTime" type="text" inputmode="numeric" placeholder="เช่น 23:30" maxlength="5" />
            <small v-if="!comparisonForm.birthTime" class="unknown-time-hint"><i class="pi pi-info-circle" /> ไม่ทราบเวลาก็เปรียบเทียบได้ แต่รายละเอียดบางส่วนอาจคลาดเคลื่อน</small>
          </label>
          <label class="field">
            <span>เพศ</span>
            <Select v-model="comparisonForm.gender" :options="genderOptions" option-label="label" option-value="value" />
          </label>
          <label class="field">
            <span>เขตเวลาที่เกิด</span>
            <Select
              v-model="comparisonForm.timezoneId"
              :options="timezoneOptions"
              option-label="label"
              option-value="value"
              filter
              filter-placeholder="ค้นหาเมืองหรือเขตเวลา"
            />
          </label>
        </div>

        <div class="comparison-choice-grid">
          <label class="field">
            <span>อีกฝ่ายเป็นใครสำหรับคุณ?</span>
            <Select v-model="comparisonForm.relationship" :options="relationshipOptions" option-label="label" option-value="value" />
          </label>
          <label class="field">
            <span>คุณอยากดูความสัมพันธ์นี้ในด้านใด?</span>
            <Select v-model="comparisonForm.focus" :options="availableComparisonFocusOptions" option-label="label" option-value="value" />
          </label>
        </div>

        <div class="comparison-order-summary">
          <i class="pi pi-sparkles" />
          <div><span>คำอ่านรายการนี้</span><strong>{{ selectedRelationshipLabel }} + {{ availableComparisonFocusOptions.find((item) => item.value === comparisonForm.focus)?.label }}</strong></div>
        </div>

        <div v-if="comparisonError" class="comparison-error"><i class="pi pi-exclamation-circle" />{{ comparisonError }}</div>
        <Button type="submit" label="ดูคำแนะนำความสัมพันธ์" icon="pi pi-heart" class="calculate-button" />
      </form>

      <article v-if="comparisonResult" class="comparison-result">
        <div class="comparison-result-heading">
          <div>
            <span>{{ comparisonForm.name.trim() || 'อีกฝ่าย' }} · {{ selectedRelationshipLabel }}</span>
            <h3>{{ comparisonResult.headline }}</h3>
            <p>{{ comparisonResult.focusLabel }}</p>
          </div>
          <small><i class="pi pi-shield" /> {{ comparisonResult.confidence }}</small>
        </div>

        <div v-if="comparisonResult.timeWarning" class="comparison-warning">
          <i class="pi pi-exclamation-triangle" /><p>{{ comparisonResult.timeWarning }}</p>
        </div>

        <div class="comparison-result-grid">
          <div class="comparison-result-card featured"><span>ภาพรวมของคุณสองคน</span><p>{{ comparisonResult.summary }}</p></div>
          <div class="comparison-result-card"><span>จุดที่ไปด้วยกันได้</span><p>{{ comparisonResult.connection }}</p></div>
          <div class="comparison-result-card"><span>วิธีพูดคุยกัน</span><p>{{ comparisonResult.communication }}</p></div>
          <div class="comparison-result-card positive"><span>สิ่งที่ควรทำ</span><p>{{ comparisonResult.shouldDo }}</p></div>
          <div class="comparison-result-card caution"><span>สิ่งที่ควรหลีกเลี่ยง</span><p>{{ comparisonResult.shouldAvoid }}</p></div>
        </div>

        <p class="comparison-disclaimer">คำอ่านนี้แสดงแนวโน้มของวิธีตอบสนองต่อกัน ไม่ได้ตัดสินว่าความสัมพันธ์ใดดีหรือไม่ดีตายตัว</p>
      </article>
    </section>

    <section v-if="luckTimeline && !isBlindTestMode && activeView === 'luck'" class="luck-section">
      <div class="view-profile-summary">
        <div>
          <span>ข้อมูลที่ใช้ดูจังหวะชีวิต</span>
          <strong>{{ calculatedInput.birthDate }} · {{ calculatedInput.birthTime }} · {{ calculatedInput.gender === 'male' ? 'ชาย' : 'หญิง' }}</strong>
          <small>{{ calculatedInput.timezoneId }}</small>
        </div>
        <button type="button" @click="setActiveView('profile')"><i class="pi pi-pencil" /> แก้ไขข้อมูล</button>
      </div>

      <div class="luck-heading">
        <div>
          <p class="eyebrow">ภาพรวมชีวิตเป็นช่วง</p>
          <h2>จังหวะชีวิตในแต่ละ 10 ปี</h2>
          <p>เลือกช่วงอายุเพื่อดูว่าเรื่องใดมีแนวโน้มเด่นขึ้น และควรวางตัวอย่างไร</p>
        </div>
      </div>

      <div class="luck-metadata">
        <div>
          <span>ช่วงแรกเริ่มเมื่ออายุ</span>
          <strong>{{ luckTimeline.startAgeLabel }}</strong>
          <small>{{ luckTimeline.startDateLabel }}</small>
        </div>
      </div>

      <div class="luck-carousel">
        <button
          type="button"
          class="luck-arrow luck-arrow-previous"
          aria-label="ดูช่วงชีวิตก่อนหน้า"
          :disabled="!canMoveLuckPrevious"
          @click="moveLuckCycle(-1)"
        >
          <i class="pi pi-chevron-left" />
        </button>

        <div ref="luckTrack" class="luck-track" aria-label="ช่วงชีวิตแต่ละ 10 ปี">
          <button
            v-for="cycle in luckTimeline.cycles"
            :key="cycle.index"
            type="button"
            class="luck-cycle"
            :class="{ current: cycle.isCurrent, selected: cycle.index === selectedLuckCycle.index }"
            :data-cycle-index="cycle.index"
            :aria-label="`ดูคำอ่านช่วงที่ ${cycle.index} อายุ ${cycle.startAge} ถึง ${cycle.endAge} ปี`"
            :aria-pressed="cycle.index === selectedLuckCycle.index"
            @click="selectLuckCycle(cycle.index)"
          >
            <div class="luck-cycle-content">
              <div class="luck-cycle-topline">
                <span>ช่วงที่ {{ cycle.index }}</span>
                <strong v-if="cycle.index === selectedLuckCycle.index">
                  <i class="pi pi-check-circle" /> {{ cycle.isCurrent ? 'ปัจจุบัน · กำลังดู' : 'กำลังดู' }}
                </strong>
              </div>
              <div class="luck-cycle-summary">
                <b>{{ cycle.publicTitle }}</b>
                <small>{{ cycle.publicSummary }}</small>
              </div>
              <p class="luck-years">อายุ {{ cycle.startAge }}–{{ cycle.endAge }} ปี</p>
              <p class="luck-calendar">พ.ศ. {{ cycle.startYear + 543 }}–{{ cycle.endYear + 543 }} <small>ค.ศ. {{ cycle.startYear }}–{{ cycle.endYear }}</small></p>
            </div>
          </button>
        </div>

        <button
          type="button"
          class="luck-arrow luck-arrow-next"
          aria-label="ดูช่วงชีวิตถัดไป"
          :disabled="!canMoveLuckNext"
          @click="moveLuckCycle(1)"
        >
          <i class="pi pi-chevron-right" />
        </button>
      </div>

      <p class="luck-carousel-position">ช่วงที่ {{ selectedLuckPosition + 1 }} จาก {{ luckTimeline.cycles.length }}</p>

      <article v-if="selectedLuckReading" class="current-luck-reading">
        <div class="current-luck-heading">
          <div>
            <span>{{ selectedLuckReading.isCurrent ? 'ช่วงชีวิตปัจจุบัน' : `ช่วงชีวิตที่ ${selectedLuckReading.index}` }}</span>
            <h3>{{ selectedLuckReading.headline }}</h3>
          </div>
          <small>อายุ {{ selectedLuckReading.ageRange }}<br />ค.ศ. {{ selectedLuckReading.yearRange }}</small>
        </div>

        <div class="current-luck-grid">
          <div><span>ภาพรวมช่วงนี้</span><p>{{ selectedLuckReading.summary }} {{ selectedLuckReading.keyThemes }}</p></div>
          <div><span>การเรียนและการงาน</span><p>{{ selectedLuckReading.workOutlook }}</p></div>
          <div><span>การเงิน</span><p>{{ selectedLuckReading.moneyOutlook }}</p></div>
          <div><span>ความสัมพันธ์</span><p>{{ selectedLuckReading.relationshipOutlook }}</p></div>
          <div><span>สิ่งที่ควรทำ</span><p>{{ selectedLuckReading.shouldDo }}</p></div>
          <div><span>สิ่งที่ควรหลีกเลี่ยง</span><p>{{ selectedLuckReading.shouldAvoid }}</p></div>
        </div>
      </article>

      <p class="luck-note"><i class="pi pi-info-circle" /> ภาพรวมนี้แสดงแนวโน้มของแต่ละช่วงวัย เหตุการณ์จริงยังขึ้นอยู่กับการตัดสินใจและสถานการณ์ของแต่ละคน</p>
    </section>
  </main>
</template>
