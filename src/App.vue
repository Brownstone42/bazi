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
import { pickerDateToTimeString, timeStringToPickerDate } from './services/time-input'
import { buildPersonalMonth, calendarFocusOptions, shiftCalendarMonth } from './services/personal-calendar'
import {
  accessPlans,
  calendarMonthAccess,
  canAccessCalendarDay,
  canAccessLuckCycle,
  comparisonBalance,
  consumeComparison
} from './services/access-control'
import { initializeLineSession } from './services/liff-auth'
import {
  birthProfileToForm,
  reserveComparison,
  saveComparisonResult,
  syncLineAccount
} from './services/account-api'

const isBlindTestMode = new URLSearchParams(window.location.search).get('mode') === 'blind-test'
const previewPlan = new URLSearchParams(window.location.search).get('preview')
const liffId = import.meta.env.VITE_LIFF_ID

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
const birthTimePicker = computed({
  get: () => timeStringToPickerDate(form.birthTime),
  set: (value) => { form.birthTime = pickerDateToTimeString(value) }
})
const comparisonTimePicker = computed({
  get: () => timeStringToPickerDate(comparisonForm.birthTime),
  set: (value) => { comparisonForm.birthTime = pickerDateToTimeString(value) }
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
const comparisonSubmitting = ref(false)
const savedComparisons = ref([])
const activeView = ref(viewFromHash())
const luckTrack = ref(null)
const accessPlan = ref(previewPlan === 'premium' ? 'premium' : 'free')
const pricingNotice = ref('')
const comparisonIncludedUsed = ref(0)
const purchasedComparisonCredits = ref(previewPlan === 'comparison' ? 5 : 0)
const calendarFocus = ref('all')
const selectedCalendarDayKey = ref(null)
const calendarCursor = reactive({ year: new Date().getFullYear(), month: new Date().getMonth() + 1 })
const calendarWeekdays = ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา']
const lineSession = reactive({ status: 'initializing', inClient: false, profile: null })
const accountSync = reactive({ status: 'idle', error: '' })

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
const currentLuckCycle = computed(() => luckTimeline.value?.cycles.find((cycle) => cycle.isCurrent) ?? null)
const selectedLuckCycle = computed(() => {
  const cycles = luckTimeline.value?.cycles ?? []
  return cycles.find((cycle) => cycle.index === selectedLuckCycleIndex.value) ??
    currentLuckCycle.value ??
    cycles[0] ??
    null
})
const selectedLuckReading = computed(() => chart.value && strength.value && selectedLuckCycle.value
  ? interpretLuckPillar(chart.value, strength.value, selectedLuckCycle.value)
  : null)
const selectedLuckPosition = computed(() => luckTimeline.value?.cycles.findIndex((cycle) => cycle.index === selectedLuckCycle.value?.index) ?? -1)
const canMoveLuckPrevious = computed(() => selectedLuckPosition.value > 0)
const canMoveLuckNext = computed(() => selectedLuckPosition.value >= 0 && selectedLuckPosition.value < (luckTimeline.value?.cycles.length ?? 0) - 1)
const selectedLuckLocked = computed(() => !canAccessLuckCycle(selectedLuckCycle.value, currentLuckCycle.value, accessPlan.value))
const isPremium = computed(() => accessPlan.value === 'premium')
const comparisonQuota = computed(() => comparisonBalance({
  planId: accessPlan.value,
  includedUsed: comparisonIncludedUsed.value,
  purchasedCredits: purchasedComparisonCredits.value
}))
const calendarPreviousAccess = computed(() => calendarMonthAccess(calendarCursor.year, calendarCursor.month - 1, accessPlan.value))
const calendarNextAccess = computed(() => calendarMonthAccess(calendarCursor.year, calendarCursor.month + 1, accessPlan.value))
const selectedRelationshipLabel = computed(() => relationshipOptions.find((item) => item.value === comparisonForm.relationship)?.label ?? 'อีกฝ่าย')
const availableComparisonFocusOptions = computed(() => {
  const allowed = focusByRelationship[comparisonForm.relationship] ?? ['overview']
  return comparisonFocusOptions.filter((item) => allowed.includes(item.value))
})
const personalMonth = computed(() => chart.value && strength.value && calculatedInput.value
  ? buildPersonalMonth({
      chart: chart.value,
      assessment: strength.value,
      input: calculatedInput.value,
      year: calendarCursor.year,
      month: calendarCursor.month,
      focus: calendarFocus.value,
      currentLuckCycle: luckTimeline.value?.cycles.find((cycle) => cycle.isCurrent) ?? null
    })
  : null)
const selectedCalendarDay = computed(() => {
  const days = personalMonth.value?.days ?? []
  return days.find((day) => day.key === selectedCalendarDayKey.value) ??
    days.find((day) => day.isToday) ??
    days[0] ??
    null
})
const lineAccountSubtitle = computed(() => {
  if (accountSync.status === 'syncing' || accountSync.status === 'saving') return 'กำลังโหลดข้อมูลส่วนตัว'
  if (accountSync.status === 'synced') return lineSession.inClient ? 'เปิดผ่านแอป LINE · บันทึกข้อมูลแล้ว' : 'เข้าสู่ระบบและบันทึกข้อมูลแล้ว'
  if (accountSync.status === 'error') return 'เข้าสู่ระบบ LINE แล้ว · ยังไม่เชื่อมฐานข้อมูล'
  return lineSession.inClient ? 'เปิดผ่านแอป LINE' : 'เข้าสู่ระบบด้วย LINE แล้ว'
})

function viewFromHash() {
  if (window.location.hash === '#luck') return 'luck'
  if (window.location.hash === '#calendar') return 'calendar'
  if (window.location.hash === '#compare') return 'compare'
  if (window.location.hash === '#pricing') return 'pricing'
  return 'profile'
}

function calculateAndDisplay(input) {
  chart.value = calculateChart(input)
  calculatedInput.value = input
  selectedLuckCycleIndex.value = null
  Object.keys(feedback).forEach((key) => delete feedback[key])
  if (isBlindTestMode) startBlindTest()
}

function applyEntitlement(entitlement) {
  if (!entitlement) return
  if (!previewPlan) accessPlan.value = entitlement.planId
  comparisonIncludedUsed.value = entitlement.includedComparisonUsed ?? 0
  if (previewPlan !== 'comparison') purchasedComparisonCredits.value = entitlement.purchasedComparisonCredits ?? 0
}

function upsertSavedComparison(report) {
  if (!report?.id) return
  savedComparisons.value = [report, ...savedComparisons.value.filter((item) => item.id !== report.id)]
}

function comparisonContextLabel(report) {
  const relationship = relationshipOptions.find((item) => item.value === report.relationship)?.label ?? 'อีกฝ่าย'
  const focus = comparisonFocusOptions.find((item) => item.value === report.focus)?.label ?? 'ภาพรวมความสัมพันธ์'
  return `${relationship} · ${focus}`
}

async function openSavedComparison(report) {
  Object.assign(comparisonForm, {
    name: report.name ?? '',
    birthDate: report.birthDate,
    birthTime: report.birthTime ?? '',
    gender: report.gender,
    timezoneId: report.timezoneId,
    relationship: report.relationship,
    focus: report.focus
  })
  await nextTick()
  comparisonResult.value = report.result
  comparisonError.value = report.result ? '' : 'รายการนี้ยังสร้างคำอ่านไม่เสร็จ กรุณากดดูคำแนะนำอีกครั้ง'
}

async function saveBirthProfile(input) {
  if (!lineSession.idToken) return
  accountSync.status = 'saving'
  accountSync.error = ''
  try {
    const account = await syncLineAccount({ idToken: lineSession.idToken, birthProfile: input })
    applyEntitlement(account.entitlement)
    accountSync.status = 'synced'
  } catch (cause) {
    accountSync.status = 'error'
    accountSync.error = cause instanceof Error ? cause.message : 'ไม่สามารถบันทึกข้อมูลได้'
  }
}

function submit() {
  error.value = ''
  try {
    const input = { ...form }
    calculateAndDisplay(input)
    saveBirthProfile(input)
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
  const hashes = { luck: 'luck', calendar: 'calendar', compare: 'compare', pricing: 'pricing' }
  window.location.hash = hashes[view] ?? 'profile'
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function openPricing(message = '') {
  pricingNotice.value = message
  setActiveView('pricing')
}

function choosePlan(planId) {
  const plan = accessPlans[planId]
  pricingNotice.value = `เลือก ${plan.label} แล้ว — ระบบรับชำระเงินจริงจะเชื่อมในขั้นถัดไป`
}

function moveCalendarMonth(amount) {
  const shifted = shiftCalendarMonth(calendarCursor.year, calendarCursor.month, amount)
  const access = calendarMonthAccess(shifted.year, shifted.month, accessPlan.value)
  if (access === 'premium') {
    openPricing('การดูปฏิทินเดือนหน้าเป็นสิทธิ์ของสมาชิก Premium')
    return
  }
  if (access === 'unavailable') return
  calendarCursor.year = shifted.year
  calendarCursor.month = shifted.month
  selectedCalendarDayKey.value = null
}

function selectCalendarDay(day) {
  if (!canAccessCalendarDay(day, accessPlan.value)) {
    openPricing('ผู้ใช้ฟรีดูรายละเอียดได้เฉพาะวันนี้ สมัคร Premium เพื่อดูรายละเอียดได้ทั้งเดือนนี้และเดือนหน้า')
    return
  }
  selectedCalendarDayKey.value = day.key
}

function syncViewFromHash() {
  activeView.value = viewFromHash()
}

function handleViewportResize() {
  if (activeView.value === 'luck') centerSelectedLuckCycle('auto')
}

async function connectLineAccount() {
  if (isBlindTestMode) {
    lineSession.status = 'local'
    return
  }

  try {
    const session = await initializeLineSession({ liffId })
    Object.assign(lineSession, session)
    if (session.status === 'authenticated' && session.idToken) {
      accountSync.status = 'syncing'
      accountSync.error = ''
      try {
        const account = await syncLineAccount({ idToken: session.idToken })
        applyEntitlement(account.entitlement)
        savedComparisons.value = account.comparisonReports ?? []
        const storedBirthProfile = birthProfileToForm(account.birthProfile)
        if (storedBirthProfile) {
          Object.assign(form, storedBirthProfile)
          calculateAndDisplay({ ...form })
        }
        accountSync.status = 'synced'
      } catch (cause) {
        accountSync.status = 'error'
        accountSync.error = cause instanceof Error ? cause.message : 'ไม่สามารถโหลดบัญชีผู้ใช้ได้'
      }
    }
  } catch {
    lineSession.status = 'error'
    lineSession.profile = null
  }
}

async function submitComparison() {
  comparisonError.value = ''
  comparisonResult.value = null
  comparisonSubmitting.value = true

  try {
    if (!chart.value) throw new Error('กรุณาคำนวณพื้นดวงของคุณก่อน')
    const { chart: otherChart, hasBirthTime } = calculateChartWithOptionalTime(comparisonForm)
    const generatedResult = interpretCompatibility(chart.value, otherChart, {
      relationship: comparisonForm.relationship,
      focus: comparisonForm.focus,
      hasBirthTime
    })

    if (lineSession.idToken) {
      const reservation = await reserveComparison({
        idToken: lineSession.idToken,
        comparisonProfile: { ...comparisonForm }
      })
      applyEntitlement(reservation.entitlement)
      if (!reservation.allowed) {
        openPricing('ใช้สิทธิ์เปรียบเทียบบุคคลครบแล้ว สามารถซื้อสิทธิ์เพิ่ม 5 คนในราคา 59 บาทและเก็บไว้ใช้ได้โดยไม่หมดอายุ')
        return
      }
      if (reservation.existing && reservation.report.result) {
        upsertSavedComparison(reservation.report)
        await openSavedComparison(reservation.report)
        return
      }
      comparisonResult.value = generatedResult
      const saved = await saveComparisonResult({
        idToken: lineSession.idToken,
        reportId: reservation.report.id,
        result: generatedResult
      })
      upsertSavedComparison(saved.report)
      return
    }

    const quotaUse = consumeComparison({
      planId: accessPlan.value,
      includedUsed: comparisonIncludedUsed.value,
      purchasedCredits: purchasedComparisonCredits.value
    })
    if (!quotaUse) {
      openPricing('ใช้สิทธิ์เปรียบเทียบบุคคลครบแล้ว สามารถซื้อสิทธิ์เพิ่ม 5 คนในราคา 59 บาทและเก็บไว้ใช้ได้โดยไม่หมดอายุ')
      return
    }
    comparisonResult.value = generatedResult
    comparisonIncludedUsed.value = quotaUse.includedUsed
    purchasedComparisonCredits.value = quotaUse.purchasedCredits
  } catch (cause) {
    comparisonError.value = cause instanceof Error ? cause.message : 'ไม่สามารถเปรียบเทียบความสัมพันธ์ได้'
  } finally {
    comparisonSubmitting.value = false
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

watch(calendarFocus, () => {
  selectedCalendarDayKey.value = null
})

onMounted(() => {
  window.addEventListener('hashchange', syncViewFromHash)
  window.addEventListener('resize', handleViewportResize)
  if (activeView.value === 'luck') nextTick(() => centerSelectedLuckCycle('auto'))
  connectLineAccount()
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
      <div class="hero-heading">
        <p class="eyebrow">BAZI CALENDAR LAB</p>
        <h1>ผังโป๊ยหยี่สี่เถี่ยว</h1>
        <p class="hero-copy">
          {{ isBlindTestMode ? 'เครื่องมือภายในสำหรับทดสอบคุณภาพคำอ่านโดยไม่เฉลยดวงล่วงหน้า' : 'ต้นแบบสำหรับตรวจสอบ 8 เม็ดจากวัน เวลา และสถานที่เกิด' }}
        </p>
      </div>
      <div v-if="!isBlindTestMode" class="line-account" :class="`line-account-${lineSession.status}`">
        <img
          v-if="lineSession.profile?.pictureUrl"
          :src="lineSession.profile.pictureUrl"
          alt="รูปโปรไฟล์ LINE"
        />
        <i v-else :class="lineSession.status === 'initializing' ? 'pi pi-spin pi-spinner' : 'pi pi-user'" />
        <div>
          <strong v-if="lineSession.status === 'authenticated'">สวัสดี {{ lineSession.profile.displayName }}</strong>
          <strong v-else-if="lineSession.status === 'local'">โหมดพัฒนา</strong>
          <strong v-else-if="lineSession.status === 'error'">เชื่อม LINE ไม่สำเร็จ</strong>
          <strong v-else-if="lineSession.status === 'unconfigured'">ยังไม่ได้ตั้งค่า LINE</strong>
          <strong v-else>กำลังเชื่อม LINE</strong>
          <small v-if="lineSession.status === 'authenticated'">{{ lineAccountSubtitle }}</small>
          <small v-else-if="lineSession.status === 'local'">หน้าเว็บจริงจะเข้าสู่ระบบด้วย LINE</small>
          <small v-else-if="lineSession.status === 'error'">ลองปิดแล้วเปิดจากลิงก์ LIFF อีกครั้ง</small>
          <small v-else-if="lineSession.status === 'unconfigured'">กรุณากำหนด LIFF ID</small>
          <small v-else>รอสักครู่</small>
        </div>
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
        :class="{ active: activeView === 'calendar' }"
        :aria-current="activeView === 'calendar' ? 'page' : undefined"
        @click="setActiveView('calendar')"
      >
        <i class="pi pi-calendar" />
        <span><strong>ปฏิทินของฉัน</strong><small>วางแผนรายเดือนและรายวัน</small></span>
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
      <button
        type="button"
        :class="{ active: activeView === 'pricing' }"
        :aria-current="activeView === 'pricing' ? 'page' : undefined"
        @click="setActiveView('pricing')"
      >
        <i class="pi pi-crown" />
        <span><strong>แพ็กเกจ</strong><small>ดูสิทธิ์ Free และ Premium</small></span>
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
            <DatePicker
              v-model="birthTimePicker"
              time-only
              hour-format="24"
              show-icon
              :manual-input="false"
              placeholder="เลือกเวลา"
              fluid
              required
            >
              <template #dropdownicon><i class="pi pi-clock" /></template>
            </DatePicker>
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

      <div class="quota-status">
        <div>
          <span>สิทธิ์ที่ใช้ได้ตอนนี้</span>
          <strong>โควตาแพ็กเกจ {{ comparisonQuota.includedRemaining }}/{{ comparisonQuota.includedLimit }} คน · สิทธิ์ซื้อไว้ {{ comparisonQuota.purchasedRemaining }} คน</strong>
        </div>
        <small>{{ accessPlans[accessPlan].label }}</small>
      </div>

      <div v-if="savedComparisons.length" class="saved-comparisons">
        <div class="saved-comparisons-heading">
          <div><span>รายการที่เคยดู</span><strong>เปิดดูซ้ำได้โดยไม่หักสิทธิ์เพิ่ม</strong></div>
          <small>{{ savedComparisons.length }} รายการ</small>
        </div>
        <div class="saved-comparisons-list">
          <button
            v-for="report in savedComparisons"
            :key="report.id"
            type="button"
            :class="{ pending: !report.result }"
            @click="openSavedComparison(report)"
          >
            <span class="saved-comparison-icon"><i class="pi pi-users" /></span>
            <span><strong>{{ report.name || 'อีกฝ่าย' }}</strong><small>{{ comparisonContextLabel(report) }}</small></span>
            <i :class="report.result ? 'pi pi-chevron-right' : 'pi pi-refresh'" />
          </button>
        </div>
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
            <DatePicker
              v-model="comparisonTimePicker"
              time-only
              hour-format="24"
              show-icon
              show-clear
              :manual-input="false"
              placeholder="เลือกเวลาหรือเว้นว่าง"
              fluid
            >
              <template #dropdownicon><i class="pi pi-clock" /></template>
            </DatePicker>
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
        <Button
          type="submit"
          label="ดูคำแนะนำความสัมพันธ์"
          icon="pi pi-heart"
          class="calculate-button"
          :loading="comparisonSubmitting"
          :disabled="comparisonSubmitting"
        />
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

    <section v-if="!isBlindTestMode && activeView === 'pricing'" class="pricing-section">
      <div class="pricing-heading">
        <p class="eyebrow">CHOOSE YOUR PLAN</p>
        <h2>เลือกสิทธิ์ที่เหมาะกับการใช้งาน</h2>
        <p>พื้นดวง ภาพรวมวันนี้ และถนนสิบปีถึงปัจจุบันยังใช้ฟรี ส่วน Premium ช่วยให้วางแผนล่วงหน้าได้มากขึ้น</p>
      </div>

      <div v-if="pricingNotice" class="pricing-notice"><i class="pi pi-info-circle" /> {{ pricingNotice }}</div>

      <div class="pricing-grid">
        <article class="price-card free-card">
          <div class="price-card-topline"><span>เริ่มต้นใช้งาน</span><b>Free</b></div>
          <h3>ฟรี</h3>
          <p>ทำความเข้าใจตัวเองและดูภาพรวมของวันนี้</p>
          <ul>
            <li><i class="pi pi-check" /> พื้นดวงทั้งหมด</li>
            <li><i class="pi pi-check" /> ถนนสิบปีตั้งแต่อดีตถึงปัจจุบัน</li>
            <li><i class="pi pi-check" /> ภาพรวมและคำแนะนำวันนี้</li>
            <li><i class="pi pi-check" /> เปรียบเทียบบุคคล 1 คน</li>
          </ul>
          <button type="button" class="price-button secondary" disabled>แพ็กเกจปัจจุบัน</button>
        </article>

        <article class="price-card premium-card">
          <div class="price-card-topline"><span>วางแผนล่วงหน้า</span><b>แนะนำ</b></div>
          <h3>Premium</h3>
          <div class="price-options">
            <button type="button" @click="choosePlan('premium')"><strong>149 บาท</strong><small>ต่อเดือน</small></button>
            <button type="button" @click="choosePlan('premium')"><strong>999 บาท</strong><small>ต่อปี · ประหยัด 789 บาท</small></button>
          </div>
          <ul>
            <li><i class="pi pi-check" /> ถนนสิบปีครบทุกช่วง</li>
            <li><i class="pi pi-check" /> ปฏิทินเดือนนี้และเดือนหน้า</li>
            <li><i class="pi pi-check" /> ค้นหาวันเหมาะและเปรียบเทียบวัน</li>
            <li><i class="pi pi-check" /> Notification ที่เลือกหัวข้อได้</li>
            <li><i class="pi pi-check" /> เปรียบเทียบบุคคล 5 คนต่อเดือน</li>
          </ul>
          <button type="button" class="price-button primary" @click="choosePlan('premium')">เลือก Premium</button>
        </article>

        <article class="price-card comparison-card">
          <div class="price-card-topline"><span>ใช้เฉพาะความสัมพันธ์</span><b>ไม่หมดอายุ</b></div>
          <h3>เปรียบเทียบบุคคล</h3>
          <div class="single-price"><strong>59 บาท</strong><small>ใช้ได้ 5 คน เก็บสิทธิ์ไว้ได้โดยไม่จำกัดเวลา</small></div>
          <ul>
            <li><i class="pi pi-check" /> เลือกคนและเรื่องที่อยากดู</li>
            <li><i class="pi pi-check" /> เปิดรายงานเดิมซ้ำได้</li>
            <li><i class="pi pi-check" /> หากเป็น Premium ระบบใช้โควตารายเดือนก่อน</li>
            <li><i class="pi pi-check" /> ไม่รวมปฏิทินและถนนสิบปีในอนาคต</li>
          </ul>
          <button type="button" class="price-button secondary" @click="choosePlan('comparison')">เลือกเฉพาะเปรียบเทียบ</button>
        </article>
      </div>

      <p class="pricing-footnote">ระบบรับชำระเงินและการต่ออายุยังไม่ได้เปิดใช้งาน หน้านี้เป็นต้นแบบเพื่อยืนยันแพ็กเกจและประสบการณ์ใช้งาน</p>
    </section>

    <section v-if="personalMonth && !isBlindTestMode && activeView === 'calendar'" class="calendar-section">
      <div class="view-profile-summary">
        <div>
          <span>ปฏิทินนี้คำนวณสำหรับ</span>
          <strong>{{ calculatedInput.birthDate }} · {{ calculatedInput.birthTime }} · {{ calculatedInput.gender === 'male' ? 'ชาย' : 'หญิง' }}</strong>
          <small>{{ calculatedInput.timezoneId }}</small>
        </div>
        <button type="button" @click="setActiveView('profile')"><i class="pi pi-pencil" /> แก้ไขข้อมูล</button>
      </div>

      <div class="calendar-heading">
        <div>
          <p class="eyebrow">PERSONAL DECISION CALENDAR</p>
          <h2>ปฏิทินช่วยวางแผนของคุณ</h2>
          <p>เลือกเรื่องที่กำลังสนใจ แล้วดูว่าแต่ละวันเหมาะกับการเดินหน้า เตรียมตัว หรือเพิ่มความระมัดระวังอย่างไร</p>
        </div>
        <span class="premium-badge"><i class="pi" :class="isPremium ? 'pi-crown' : 'pi-calendar'" /> {{ isPremium ? 'Premium' : 'วันนี้ใช้ฟรี' }}</span>
      </div>

      <label class="field calendar-focus-field">
        <span>อยากดูภาพรวมหรือเจาะเรื่องไหน?</span>
        <Select v-model="calendarFocus" :options="calendarFocusOptions" option-label="label" option-value="value" />
      </label>

      <article class="calendar-month-summary">
        <span>ภาพรวม {{ personalMonth.monthLabel }}</span>
        <h3>{{ personalMonth.focusLabel }}</h3>
        <p>{{ personalMonth.summary }}</p>
        <div class="calendar-month-counts">
          <b><i class="pi pi-arrow-up-right" /> วันที่เหมาะเดินหน้า {{ personalMonth.counts.supportive }} วัน</b>
          <b><i class="pi pi-shield" /> วันที่ควรเพิ่มความระวัง {{ personalMonth.counts.caution }} วัน</b>
        </div>
      </article>

      <div v-if="isPremium" class="calendar-highlights">
        <div>
          <span>วันที่น่าใช้กับเรื่องสำคัญ</span>
          <button v-for="day in personalMonth.recommended" :key="day.key" type="button" @click="selectCalendarDay(day)">
            {{ day.day }} <small>{{ day.tag }}</small>
          </button>
        </div>
        <div class="caution">
          <span>วันที่ควรวางแผนเผื่อไว้</span>
          <button v-for="day in personalMonth.caution" :key="day.key" type="button" @click="selectCalendarDay(day)">
            {{ day.day }} <small>{{ day.tag }}</small>
          </button>
        </div>
      </div>
      <button v-else type="button" class="feature-lock-callout" @click="openPricing('วันที่น่าใช้และวันที่ควรวางแผนเผื่อเป็นสิทธิ์ของสมาชิก Premium')">
        <i class="pi pi-lock" /><span><strong>เปิดวันที่น่าใช้ตลอดทั้งเดือน</strong><small>รวมวันที่ควรวางแผนเผื่อและรายละเอียดรายวัน</small></span><b>ดู Premium</b>
      </button>

      <div class="calendar-panel">
        <div class="calendar-toolbar">
          <button type="button" aria-label="เดือนก่อนหน้า" :disabled="calendarPreviousAccess === 'unavailable'" @click="moveCalendarMonth(-1)"><i class="pi pi-chevron-left" /></button>
          <strong>{{ personalMonth.monthLabel }}</strong>
          <button type="button" aria-label="เดือนถัดไป" :disabled="calendarNextAccess === 'unavailable'" @click="moveCalendarMonth(1)"><i :class="calendarNextAccess === 'premium' ? 'pi pi-lock' : 'pi pi-chevron-right'" /></button>
        </div>
        <div class="calendar-grid calendar-weekdays">
          <span v-for="weekday in calendarWeekdays" :key="weekday">{{ weekday }}</span>
        </div>
        <div class="calendar-grid calendar-days">
          <span v-for="blank in personalMonth.leadingBlanks" :key="`blank-${blank}`" class="calendar-blank" />
          <button
            v-for="day in personalMonth.days"
            :key="day.key"
            type="button"
            class="calendar-day"
            :class="[day.level, { selected: selectedCalendarDay?.key === day.key, today: day.isToday, locked: !canAccessCalendarDay(day, accessPlan) }]"
            :aria-label="`วันที่ ${day.day} ${day.tag}`"
            :aria-pressed="selectedCalendarDay?.key === day.key"
            @click="selectCalendarDay(day)"
          >
            <span>{{ day.day }}</span>
            <i v-if="!canAccessCalendarDay(day, accessPlan)" class="pi pi-lock calendar-lock-icon" />
            <i v-else class="calendar-day-dot" />
            <small>{{ canAccessCalendarDay(day, accessPlan) ? day.tag : 'Premium' }}</small>
          </button>
        </div>
        <div class="calendar-legend">
          <span><i class="strong" /> เหมาะเดินหน้า</span>
          <span><i class="balanced" /> ใช้ได้เมื่อเตรียมตัว</span>
          <span><i class="caution" /> เพิ่มความระวัง</span>
        </div>
      </div>

      <article v-if="selectedCalendarDay" class="daily-reading">
        <div class="daily-reading-heading">
          <div>
            <span>{{ selectedCalendarDay.isToday ? 'วันนี้' : 'คำแนะนำประจำวันที่เลือก' }}</span>
            <h3>{{ selectedCalendarDay.day }} {{ personalMonth.monthLabel }}</h3>
            <p>{{ selectedCalendarDay.headline }}</p>
          </div>
          <small>{{ selectedCalendarDay.confidence }}</small>
        </div>
        <p class="daily-summary">{{ selectedCalendarDay.summary }}</p>
        <div v-if="selectedCalendarDay.topicReadings" class="daily-topic-grid">
          <div v-for="topic in selectedCalendarDay.topicReadings" :key="topic.focus" :class="topic.level">
            <span>{{ topic.focusLabel }}</span>
            <strong>{{ topic.status }}</strong>
            <small>{{ topic.tag }}</small>
          </div>
        </div>
        <div class="daily-advice">
          <span><i class="pi pi-compass" /> คำแนะนำสำหรับวันนี้</span>
          <p>{{ selectedCalendarDay.dailyAdvice }}</p>
        </div>
      </article>

      <p class="calendar-note"><i class="pi pi-info-circle" /> ปฏิทินนี้แสดงจังหวะที่สัมพันธ์กับพื้นดวงและช่วงชีวิตของคุณ ไม่ได้รับประกันผลลัพธ์ของเหตุการณ์</p>
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
            :class="{ current: cycle.isCurrent, selected: cycle.index === selectedLuckCycle.index, locked: !canAccessLuckCycle(cycle, currentLuckCycle, accessPlan) }"
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
            <div v-if="!canAccessLuckCycle(cycle, currentLuckCycle, accessPlan)" class="luck-cycle-lock"><i class="pi pi-lock" /><span>Premium</span></div>
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

      <article v-if="selectedLuckLocked" class="luck-premium-gate">
        <div class="luck-premium-icon"><i class="pi pi-lock" /></div>
        <span>PREMIUM</span>
        <h3>ช่วงชีวิตในอนาคต</h3>
        <p>สมัคร Premium เพื่อเปิดคำอ่านถนนสิบปีในอนาคต พร้อมคำแนะนำด้านงาน การเงิน ความสัมพันธ์ และสิ่งที่ควรวางแผนในแต่ละช่วง</p>
        <button type="button" @click="openPricing('ถนนสิบปีในอนาคตเป็นสิทธิ์ของสมาชิก Premium')">
          ดูแพ็กเกจ <i class="pi pi-arrow-right" />
        </button>
      </article>

      <article v-else-if="selectedLuckReading" class="current-luck-reading">
        <div class="current-luck-heading">
          <div>
            <span>{{ selectedLuckReading.isCurrent ? 'ช่วงชีวิตปัจจุบัน' : `ช่วงชีวิตที่ ${selectedLuckReading.index}` }}</span>
            <h3>รูปแบบของช่วงชีวิตนี้</h3>
          </div>
          <small>อายุ {{ selectedLuckReading.ageRange }}<br />ค.ศ. {{ selectedLuckReading.yearRange }}</small>
        </div>

        <div class="current-luck-patterns">
          <div><span>สิ่งที่แสดงออก</span><p>{{ selectedLuckReading.visiblePattern }}</p></div>
          <div><span>แรงขับภายใน</span><p>{{ selectedLuckReading.innerDrive }}</p></div>
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
