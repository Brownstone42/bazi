<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import Button from 'primevue/button'
import DatePicker from 'primevue/datepicker'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import Textarea from 'primevue/textarea'
import MobileDateTimePicker from './components/MobileDateTimePicker.vue'
import IdentityReading from './components/IdentityReading.vue'
import CompatibilityScore from './components/CompatibilityScore.vue'
import PersonalDayReading from './components/PersonalDayReading.vue'
import MembershipSummary from './components/MembershipSummary.vue'
import BillingPanel from './components/BillingPanel.vue'
import PackageSelection from './components/PackageSelection.vue'
import { BIRTH_EDIT_INTERVAL, birthProfileChanged, birthEditBlocked, formatBirthEditDate } from './services/profile-policy'
import { loadComparisonPeople, saveComparisonPerson } from './services/comparison-people'
import './styles/identity.css'
import { calculateChart, calculateChartWithOptionalTime } from './services/bazi'
import { interpretNatalChart } from './services/interpretation'
import { assessDayMasterStrength } from './services/strength-engine'
import { createBlindTest, evaluateBlindTest } from './services/blind-test'
import { buildLuckPillarTimeline, interpretLuckPillar } from './services/luck-pillars'
import { pickerDateToTimeString, timeStringToPickerDate } from './services/time-input'
import { calendarFocusOptions, shiftCalendarMonth } from './services/calendar-options'
import { fetchPersonalCalendar } from './services/calendar-api'
import { bangkokDay, calendarForFocus, createCalendarCache, CALENDAR_CACHE_MS } from './services/calendar-view'
import {
  accessPlans,
  calendarHorizon,
  calendarDayAccess,
  calendarMonthAccess,
  calendarPlanForSession,
  canAccessCalendarDay,
  comparisonBalance,
} from './services/access-control'
import { initializeLineSession } from './services/liff-auth'
import { loadLocalBirthProfile, saveLocalBirthProfile, mockUser } from './services/local-account'
import {
  birthProfileToForm,
  reserveComparison,
  syncLineAccount
} from './services/account-api'

const isBlindTestMode = new URLSearchParams(window.location.search).get('mode') === 'blind-test'
const previewPlan = import.meta.env.DEV ? new URLSearchParams(window.location.search).get('preview') : null
const liffId = import.meta.env.VITE_LIFF_ID

const form = reactive({
  birthDate: '',
  birthTime: '',
  gender: 'male',
  timezoneId: 'Asia/Bangkok'
})

const comparisonForm = reactive({
  name: '',
  birthDate: '',
  birthTime: '',
  gender: 'female',
  timezoneId: 'Asia/Bangkok',
  relationship: 'unspecified',
  focus: 'overview'
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
  { label: 'ภาพรวม', value: 'overview' },
  { label: 'ความรักและชีวิตคู่', value: 'love' },
  { label: 'ครอบครัวและการอยู่ร่วมกัน', value: 'family' },
  { label: 'การทำงานและธุรกิจ', value: 'work' },
  { label: 'เพื่อนและการคบหา', value: 'friendship' }
]
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
const editingBirthProfile = ref(window.location.hash === '#account')
const profileSaving = ref(false)
const profileVersion = ref(null)
const nextBirthEditAt = ref(null)
const activeComparisonReport = ref(null)
const calculatedInput = ref(null)
const error = ref('')
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
const localComparisonReader = ref(null)
const comparisonTopics = computed(() => {
  if (!comparisonResult.value || activeComparisonReport.value?.isStale) return []
  return comparisonFocusOptions.map(topic => ({ ...topic, result: comparisonResult.value.topicResults?.[topic.value] })).filter(topic => topic.result)
})

const comparisonOverviewScore = computed(() => activeComparisonReport.value?.isStale
  ? comparisonResult.value?.score ?? null
  : comparisonResult.value?.score
  ? comparisonTopics.value.find(topic => topic.value === 'overview')?.result.score ?? comparisonResult.value.score
  : null)

function selectComparisonTopic(topic) {
  comparisonForm.focus = topic.value
  comparisonResult.value = { ...topic.result, topicResults: comparisonResult.value.topicResults }
}
const savedComparisons = ref([])
const comparisonPeople = ref([])
const comparisonPeopleWithScores = computed(() => comparisonPeople.value.map(person => {
  try {
    return { ...person, overallScore: buildPersonOverview(person)?.score.value ?? null }
  } catch {
    return { ...person, overallScore: null }
  }
}))
const selectedComparisonPerson = ref(null)
const comparisonSaveNotice = ref('')
const activeView = ref(viewFromHash())
const luckTrack = ref(null)
const accessPlan = ref(previewPlan === 'premium' ? 'premium' : 'free')
const billingCycle = ref('monthly')
const billingPaymentMethod = ref('card')
const nextMembership = ref(null)
const premiumExpiresAt = ref(null)
const calendarNow = ref(new Date())
const serverCalendar = ref(null)
const localCalendar = ref(null)
const calendarLoading = ref(false)
const calendarError = ref('')
let calendarRequestController
let calendarRequestVersion = 0
const calendarCache = createCalendarCache()
let displayedCalendarKey = ''
let calendarClock
function refreshCalendarClock() { calendarNow.value = new Date() }
const pricingNotice = ref('')
const selectedBillingCycle = ref('monthly')
const selectedBillingProduct = ref(null)
const renewalCanceled = ref(false)
const comparisonIncludedUsed = ref(0)
const purchasedComparisonCredits = ref(previewPlan === 'comparison' ? 5 : 0)
const calendarFocus = ref('all')
const selectedCalendarDayKey = ref(null)
const calendarCursor = reactive({ year: new Date().getFullYear(), month: new Date().getMonth() + 1 })
const calendarWeekdays = ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา']
const lineSession = reactive({ status: 'initializing', inClient: false, profile: null })
const accountSync = reactive({ status: 'idle', error: '' })
const accountLoaded = ref(false)
const accountReady = computed(() => accountLoaded.value)

const blindFocusOptions = [
  { label: 'ภาพรวมบุคลิก', value: 'identity' },
  { label: 'รูปแบบการทำงาน', value: 'work' },
  { label: 'ความสัมพันธ์', value: 'relationship' },
  { label: 'สิ่งที่ควรระวัง', value: 'risk' },
  { label: 'ไม่มีส่วนใดเป็นพิเศษ', value: 'none' }
]

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
const calendarPlan = computed(() => calendarPlanForSession(serverCalendar.value?.plan ?? { planId: accessPlan.value, billingCycle: billingCycle.value, premiumExpiresAt: premiumExpiresAt.value }, {
  development: import.meta.env.DEV, hostname: window.location.hostname, status: lineSession.status
}))
const calendarDaysAhead = computed(() => calendarHorizon(calendarPlan.value, calendarNow.value))
const isPremium = computed(() => calendarDaysAhead.value > 0)
function calendarDayAllowed(day) { return calendarPlan.value.localPreview ? canAccessCalendarDay(day, calendarPlan.value, calendarNow.value) : day?.access === 'available' }
function calendarDayState(day) { return calendarPlan.value.localPreview ? calendarDayAccess(day, calendarPlan.value, calendarNow.value) : day?.access ?? 'unavailable' }
const comparisonQuota = computed(() => comparisonBalance({
  planId: accessPlan.value,
  billingCycle: billingCycle.value,
  includedUsed: comparisonIncludedUsed.value,
  purchasedCredits: purchasedComparisonCredits.value
}))
const calendarPreviousAccess = computed(() => calendarMonthAccess(calendarCursor.year, calendarCursor.month - 1, calendarPlan.value, calendarNow.value))
const calendarNextAccess = computed(() => calendarMonthAccess(calendarCursor.year, calendarCursor.month + 1, calendarPlan.value, calendarNow.value))
const personalMonth = computed(() => calendarForFocus(calendarPlan.value.localPreview ? localCalendar.value : serverCalendar.value?.month ?? null, calendarFocus.value))
async function loadCalendar() {
  const version = ++calendarRequestVersion
  calendarRequestController?.abort()
  calendarRequestController = new AbortController()
  calendarLoading.value = false
  calendarError.value = ''
  const context = JSON.stringify([lineSession.idToken, lineSession.status, profileVersion.value, calculatedInput.value,
    accessPlan.value, billingCycle.value, premiumExpiresAt.value, bangkokDay(calendarNow.value),
    Boolean(premiumExpiresAt.value && new Date(premiumExpiresAt.value) <= calendarNow.value)])
  calendarCache.useContext(context)
  if (activeView.value !== 'calendar' || editingBirthProfile.value || !accountReady.value || !calculatedInput.value) {
    serverCalendar.value = null
    localCalendar.value = null
    displayedCalendarKey = ''
    return
  }
  const monthKey = `${calendarCursor.year}-${calendarCursor.month}`
  const displayKey = context + monthKey
  if (displayedCalendarKey !== displayKey) {
    serverCalendar.value = null
    localCalendar.value = null
  }
  displayedCalendarKey = displayKey
  const cached = calendarCache.get(monthKey)
  if (cached && !calendarPlan.value.localPreview) { serverCalendar.value = cached; return }
  calendarLoading.value = true
  try {
    // Vite removes this entire branch and its calculation module in production.
    if (import.meta.env.DEV && calendarPlan.value.localPreview) {
      const { buildPersonalMonth } = await import('./services/personal-calendar.js')
      if (version !== calendarRequestVersion) return
      localCalendar.value = buildPersonalMonth({ chart: chart.value, assessment: strength.value, input: calculatedInput.value,
        year: calendarCursor.year, month: calendarCursor.month, focus: 'all', now: calendarNow.value,
        currentLuckCycle: luckTimeline.value?.cycles.find(cycle => cycle.isCurrent) ?? null, displayTimezoneId: 'Asia/Bangkok' })
    } else {
      const result = await fetchPersonalCalendar({ idToken: lineSession.idToken, year: calendarCursor.year, month: calendarCursor.month,
        focus: 'all', signal: calendarRequestController.signal })
      if (version !== calendarRequestVersion) return
      if (profileVersion.value != null && result.profileVersion !== profileVersion.value) throw new Error('ข้อมูลเกิดมีการเปลี่ยนแปลง กรุณาเปิดแอปใหม่เพื่อโหลดข้อมูลล่าสุด')
      calendarCache.set(monthKey, result)
      serverCalendar.value = result
    }
  } catch (cause) {
    if (version === calendarRequestVersion && cause.name !== 'AbortError') {
      serverCalendar.value = null
      calendarError.value = cause.message || 'โหลดปฏิทินไม่ได้ กรุณาลองใหม่'
    }
  } finally {
    if (version === calendarRequestVersion) calendarLoading.value = false
  }
}
const selectedCalendarDay = computed(() => {
  const days = personalMonth.value?.days ?? []
  return days.find((day) => day.key === selectedCalendarDayKey.value && calendarDayAllowed(day)) ??
    days.find((day) => day.isToday && calendarDayAllowed(day)) ??
    days.find(calendarDayAllowed) ??
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
  if (isBlindTestMode) startBlindTest()
}

function applyEntitlement(entitlement) {
  if (!entitlement) return
  if (entitlement.billingCycle !== undefined) billingCycle.value = entitlement.billingCycle
  if (entitlement.billingPaymentMethod !== undefined) billingPaymentMethod.value = entitlement.billingPaymentMethod
  if (entitlement.nextMembership !== undefined) nextMembership.value = entitlement.nextMembership
  if (entitlement.premiumExpiresAt !== undefined) premiumExpiresAt.value = entitlement.premiumExpiresAt
  if (!previewPlan) accessPlan.value = entitlement.planId
  comparisonIncludedUsed.value = entitlement.includedComparisonUsed ?? 0
  if (previewPlan !== 'comparison') purchasedComparisonCredits.value = entitlement.purchasedComparisonCredits ?? 0
}

function upsertSavedComparison(report) {
  if (!report?.id) return
  savedComparisons.value = [report, ...savedComparisons.value.filter((item) => item.id !== report.id)]
}

function buildPersonOverview(person) {
  if (!chart.value) return null
  if (import.meta.env.DEV && calendarPlan.value.localPreview && localComparisonReader.value) {
    return localComparisonReader.value(calculatedInput.value, { ...person, relationship: 'unspecified', focus: 'overview' })
  }
  return savedReportForPerson(person)?.result ?? null
}

function savedReportForPerson(person) {
  const dateKey = value => String(value).replace(/^(\d{2})\/(\d{2})\/(\d{4})$/, '$3-$2-$1')
  return savedComparisons.value.find(report => !report.isStale && report.ownerProfileVersion === profileVersion.value &&
    dateKey(report.birthDate) === dateKey(person.birthDate) && (report.birthTime || '').slice(0, 5) === (person.birthTime || '').slice(0, 5) &&
    report.gender === person.gender && report.timezoneId === person.timezoneId && report.relationship === 'unspecified' && report.focus === 'overview')
}

async function selectComparisonPerson(person) {
  activeComparisonReport.value = null
  selectedComparisonPerson.value = person.id
  Object.assign(comparisonForm, { ...person, relationship: 'unspecified', focus: 'overview' })
  comparisonResult.value = null
  comparisonError.value = ''
  comparisonSaveNotice.value = ''
  await nextTick()
  if (selectedComparisonPerson.value !== person.id) return
  try {
    activeComparisonReport.value = savedReportForPerson(person) ?? null
    comparisonResult.value = buildPersonOverview(person)
  } catch (cause) {
    comparisonError.value = cause instanceof Error ? cause.message : 'ไม่สามารถอ่านข้อมูลของคนนี้ได้'
  }
}

function saveComparisonPersonFromForm() {
  comparisonError.value = ''
  comparisonSaveNotice.value = ''
  try {
    if (!comparisonForm.name.trim()) throw new Error('กรุณากรอกชื่อก่อนบันทึก')
    calculateChartWithOptionalTime(comparisonForm)
    const saved = saveComparisonPerson(window.localStorage, comparisonForm, selectedComparisonPerson.value)
    comparisonPeople.value = saved.people
    selectedComparisonPerson.value = saved.person.id
    comparisonSaveNotice.value = 'บันทึกข้อมูลคนนี้ในเบราว์เซอร์แล้ว'
    comparisonForm.focus = 'overview'
    activeComparisonReport.value = savedReportForPerson(saved.person) ?? null
    comparisonResult.value = buildPersonOverview(saved.person)
    return true
  } catch (cause) {
    comparisonError.value = cause instanceof Error ? cause.message : 'บันทึกไม่ได้ กรุณาลองใหม่'
    return false
  }
}

function newComparisonPerson() {
  activeComparisonReport.value = null
  selectedComparisonPerson.value = null
  Object.assign(comparisonForm, { name: '', birthDate: '', birthTime: '', gender: 'female', timezoneId: 'Asia/Bangkok', relationship: 'unspecified', focus: 'overview' })
  comparisonResult.value = null
  comparisonSaveNotice.value = ''
  comparisonError.value = ''
}

function comparisonContextLabel(report) {
  const relationship = relationshipOptions.find((item) => item.value === report.relationship)?.label ?? 'อีกฝ่าย'
  const focus = comparisonFocusOptions.find((item) => item.value === report.focus)?.label ?? 'ภาพรวมความสัมพันธ์'
  return `${relationship} · ${focus}`
}

async function openSavedComparison(report) {
  selectedComparisonPerson.value = null
  comparisonSaveNotice.value = ''
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
  activeComparisonReport.value = report
  comparisonResult.value = report.result
  comparisonError.value = report.result ? '' : 'รายการนี้ยังสร้างคำอ่านไม่เสร็จ กรุณากดดูคำแนะนำอีกครั้ง'
  if (lineSession.idToken && !report.isStale && report.ownerProfileVersion === profileVersion.value && !report.result?.topicResults) {
    const requested = { ...comparisonForm }
    try {
      const response = await reserveComparison({ idToken: lineSession.idToken, profileVersion: profileVersion.value, comparisonProfile: requested })
      if (response.allowed && response.report?.result) {
        upsertSavedComparison(response.report)
        applyEntitlement(response.entitlement)
        if (activeComparisonReport.value?.id === report.id && JSON.stringify(comparisonForm) === JSON.stringify(requested)) {
          activeComparisonReport.value = response.report
          comparisonResult.value = response.report.result
          comparisonError.value = ''
        }
      }
    } catch {
      if (activeComparisonReport.value?.id === report.id) comparisonError.value = 'โหลดคำอ่านครบทุกด้านไม่ได้ กรุณาเปิดรายการนี้ใหม่อีกครั้ง รายงานเดิมยังอยู่'
    }
  }
}

async function saveBirthProfile(input) {
  if (lineSession.status === 'local') {
    saveLocalBirthProfile(window.localStorage, input)
    return
  }
  if (!lineSession.idToken) return
  accountSync.status = 'saving'
  accountSync.error = ''
  try {
    const account = await syncLineAccount({ idToken: lineSession.idToken, birthProfile: input })
    applyEntitlement(account.entitlement)
    profileVersion.value = account.birthProfile?.profile_version ?? null
    nextBirthEditAt.value = account.nextBirthEditAt ?? null
    savedComparisons.value = account.comparisonReports ?? []
    accountSync.status = 'synced'
  } catch (cause) {
    if (cause.nextEditAt) nextBirthEditAt.value = cause.nextEditAt
    accountSync.status = 'error'
    accountSync.error = cause instanceof Error ? cause.message : 'ไม่สามารถบันทึกข้อมูลได้'
    throw cause
  }
}

async function submit() {
  if (profileSaving.value) return
  profileSaving.value = true
  error.value = ''
  try {
    const input = { ...form }
    const nextChart = calculateChart(input)
    const changed = birthProfileChanged(calculatedInput.value, input)
    if (changed && lineSession.status !== 'local' && !isBlindTestMode) {
      if (birthEditBlocked(nextBirthEditAt.value)) {
        throw new Error(`แก้ข้อมูลเกิดได้อีกครั้งวันที่ ${formatBirthEditDate(nextBirthEditAt.value)}`)
      }
      const nextDate = formatBirthEditDate(Date.now() + BIRTH_EDIT_INTERVAL)
      if (!window.confirm(`ยืนยันแก้ข้อมูลเกิดหรือไม่?\nรายงานเปรียบเทียบเดิมจะถูกทำเครื่องหมายว่าเป็นข้อมูลเก่า ไม่ลบและไม่คืนโควต้า\nปฏิทินจะคำนวณใหม่ สิทธิ์ Premium และโควต้าไม่เปลี่ยน\nแก้ข้อมูลเกิดได้อีกครั้งประมาณ ${nextDate}`)) return
    }
    if (!isBlindTestMode) await saveBirthProfile(input)
    chart.value = nextChart
    calculatedInput.value = input
    selectedLuckCycleIndex.value = null
    comparisonResult.value = null
    activeComparisonReport.value = null
    selectedCalendarDayKey.value = null
    if (changed) {
      calendarCursor.year = new Date().getFullYear()
      calendarCursor.month = new Date().getMonth() + 1
    }
    editingBirthProfile.value = false
    if (isBlindTestMode) startBlindTest()
    else setActiveView('profile')
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'ไม่สามารถคำนวณผังได้'
  } finally {
    profileSaving.value = false
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
  if (!chart.value && !isBlindTestMode) view = 'account'
  editingBirthProfile.value = view === 'account'
  if (editingBirthProfile.value && calculatedInput.value) Object.assign(form, calculatedInput.value)
  if (view === 'account') {
    activeView.value = 'profile'
    window.location.hash = 'account'
    window.scrollTo({ top: 0, behavior: 'smooth' })
    return
  }
  activeView.value = view
  const hashes = { luck: 'luck', calendar: 'calendar', compare: 'compare', pricing: 'pricing' }
  window.location.hash = hashes[view] ?? 'profile'
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function openPricing(message = '') {
  selectedBillingProduct.value = null
  pricingNotice.value = message
  setActiveView('pricing')
}

function choosePlan(planId, cycle = selectedBillingCycle.value) {
  const plan = accessPlans[planId]
  selectedBillingCycle.value = cycle
  selectedBillingProduct.value = planId === 'comparison' ? 'comparison' : cycle
  const period = planId === 'premium' ? cycle === 'yearly' ? ' รายปี · 999 บาท · ล่วงหน้า 90 วัน' : ' รายเดือน · 149 บาท · ล่วงหน้า 30 วัน' : ''
  pricingNotice.value = `เลือก ${plan.label}${period}`
}

async function refreshBillingAccount(billingStatus) {
  const subscriptions = billingStatus?.subscriptions ?? []
  const isCanceled = sub => sub.renewalCanceled ?? (sub.cancelAtPeriodEnd || Boolean(sub.cancelAt))
  renewalCanceled.value = subscriptions.some(sub => isCanceled(sub) && ['active', 'trialing', 'past_due', 'unpaid'].includes(sub.status)
    && (!sub.cancelAt || !sub.periodEnd || sub.cancelAt <= sub.periodEnd))
    && !subscriptions.some(sub => sub.status === 'active' && !isCanceled(sub))
  if (!lineSession.idToken) return
  try {
    const account = await syncLineAccount({ idToken: lineSession.idToken })
    applyEntitlement(account.entitlement)
  } catch {
    pricingNotice.value = 'ยังอัปเดตสิทธิ์ไม่ได้ กรุณากดตรวจสอบอีกครั้ง'
  }
}

function moveCalendarMonth(amount) {
  const shifted = shiftCalendarMonth(calendarCursor.year, calendarCursor.month, amount)
  const access = calendarMonthAccess(shifted.year, shifted.month, calendarPlan.value, calendarNow.value)
  if (access === 'premium') {
    openPricing('Premium รายเดือนดูล่วงหน้า 30 วัน รายปีดูล่วงหน้า 90 วัน')
    return
  }
  if (access === 'unavailable') return
  calendarCursor.year = shifted.year
  calendarCursor.month = shifted.month
  selectedCalendarDayKey.value = null
}

function selectCalendarDay(day) {
  refreshCalendarClock()
  if (calendarDayState(day) === 'unavailable') return
  if (!calendarDayAllowed(day)) {
    openPricing('ฟรีดูวันนี้ · Premium รายเดือนดูล่วงหน้า 30 วัน รายปีดูล่วงหน้า 90 วัน โดยไม่รวมวันย้อนหลัง')
    return
  }
  selectedCalendarDayKey.value = day.key
}

function syncViewFromHash() {
  activeView.value = chart.value || isBlindTestMode ? viewFromHash() : 'profile'
  editingBirthProfile.value = window.location.hash === '#account' || !chart.value
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
    if (session.status === 'local') {
      if (import.meta.env.DEV && calendarPlan.value.localPreview) {
        localComparisonReader.value = (await import('./services/comparison-reading.js')).buildComparisonReading
      }
      lineSession.profile = { ...mockUser }
      comparisonPeople.value = loadComparisonPeople(window.localStorage)
      if (comparisonPeople.value.length) selectComparisonPerson(comparisonPeople.value[0])
      const stored = loadLocalBirthProfile(window.localStorage)
      if (stored) {
        Object.assign(form, stored)
        calculateAndDisplay({ ...form })
      } else setActiveView('account')
      accountLoaded.value = true
      return
    }
    if (session.status === 'authenticated' && session.idToken) {
      accountSync.status = 'syncing'
      accountSync.error = ''
      try {
        const account = await syncLineAccount({ idToken: session.idToken })
        applyEntitlement(account.entitlement)
        savedComparisons.value = account.comparisonReports ?? []
        profileVersion.value = account.birthProfile?.profile_version ?? null
        nextBirthEditAt.value = account.nextBirthEditAt ?? null
        const storedBirthProfile = birthProfileToForm(account.birthProfile)
        if (storedBirthProfile) {
          Object.assign(form, storedBirthProfile)
          calculateAndDisplay({ ...form })
        } else setActiveView('account')
        accountSync.status = 'synced'
        accountLoaded.value = true
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
  if (comparisonSubmitting.value) return
  activeComparisonReport.value = null
  comparisonError.value = ''
  comparisonResult.value = null
  comparisonSubmitting.value = true

  try {
    if (!chart.value) throw new Error('กรุณาคำนวณพื้นดวงของคุณก่อน')
    comparisonForm.relationship = 'unspecified'
    comparisonForm.focus = 'overview'
    calculateChartWithOptionalTime(comparisonForm)
    const requestedProfile = { ...comparisonForm }
    const requestedVersion = profileVersion.value

    if (lineSession.idToken) {
      const reservation = await reserveComparison({
        idToken: lineSession.idToken,
        profileVersion: requestedVersion,
        comparisonProfile: requestedProfile
      })
      applyEntitlement(reservation.entitlement)
      if (profileVersion.value !== requestedVersion || JSON.stringify(comparisonForm) !== JSON.stringify(requestedProfile)) return
      if (!reservation.allowed) {
        openPricing('ใช้สิทธิ์เปรียบเทียบบุคคลครบแล้ว สามารถซื้อสิทธิ์เพิ่ม 5 คนในราคา 59 บาทและเก็บไว้ใช้ได้โดยไม่หมดอายุ')
        return
      }
      if (!reservation.report?.result) throw new Error('ยังสร้างคำอ่านไม่สำเร็จ กรุณาลองใหม่ ระบบจะไม่ตัดสิทธิ์ซ้ำสำหรับรายการเดิม')
      upsertSavedComparison(reservation.report)
      await openSavedComparison(reservation.report)
      return
    }

    if (import.meta.env.DEV && calendarPlan.value.localPreview && localComparisonReader.value) {
      if (!saveComparisonPersonFromForm()) return
      comparisonResult.value = localComparisonReader.value(calculatedInput.value, requestedProfile)
      return
    }

    throw new Error('กรุณาเข้าสู่ระบบ LINE ก่อนเปรียบเทียบ')
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


watch(() => [comparisonForm.name, comparisonForm.birthDate, comparisonForm.birthTime, comparisonForm.gender, comparisonForm.timezoneId], () => {
  activeComparisonReport.value = null
  comparisonResult.value = null
  comparisonSaveNotice.value = ''
})

watch(calendarFocus, () => {
  selectedCalendarDayKey.value = null
})

// A primitive key avoids reloading whenever the 30-second clock creates a new Date/array.
// Topic/day selection is presentation-only; refresh the same month in the background.
watch(() => JSON.stringify([activeView.value, editingBirthProfile.value, accountReady.value, lineSession.idToken, lineSession.status,
  profileVersion.value, calculatedInput.value, calendarCursor.year, calendarCursor.month,
  accessPlan.value, billingCycle.value, premiumExpiresAt.value, bangkokDay(calendarNow.value),
  Math.floor(calendarNow.value.getTime() / CALENDAR_CACHE_MS),
  Boolean(premiumExpiresAt.value && new Date(premiumExpiresAt.value) <= calendarNow.value)]), loadCalendar, { immediate: true })

watch(() => Boolean(nextMembership.value && new Date(nextMembership.value.startsAt) <= calendarNow.value), due => { if (due && lineSession.idToken) refreshBillingAccount(null) })
onMounted(() => {
  calendarClock = window.setInterval(refreshCalendarClock, 30000)
  window.addEventListener('focus', refreshCalendarClock)
  window.addEventListener('hashchange', syncViewFromHash)
  window.addEventListener('resize', handleViewportResize)
  if (activeView.value === 'luck') nextTick(() => centerSelectedLuckCycle('auto'))
  connectLineAccount()
})
onBeforeUnmount(() => {
  calendarRequestVersion++
  calendarRequestController?.abort()
  window.clearInterval(calendarClock)
  window.removeEventListener('focus', refreshCalendarClock)
  window.removeEventListener('hashchange', syncViewFromHash)
  window.removeEventListener('resize', handleViewportResize)
})

if (isBlindTestMode) {
  Object.assign(form, { birthDate: '26/08/1989', birthTime: '11:30' })
  submit()
}
</script>

<template>
  <main class="page-shell">
    <header class="hero">
      <div class="brand-mark">八字</div>
      <div class="hero-heading">
        <p class="eyebrow">BAZI</p>
        <h1>รู้จักตัวเอง ผ่านปาจื้อ</h1>
        <p class="hero-copy">
          {{ isBlindTestMode ? 'เครื่องมือภายในสำหรับทดสอบคุณภาพคำอ่านโดยไม่เฉลยดวงล่วงหน้า' : 'ค้นพบจุดเด่น เข้าใจวิธีของตัวเอง และนำไปใช้กับชีวิต' }}
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
          <strong v-else-if="lineSession.status === 'local'">สวัสดี {{ lineSession.profile?.displayName || 'คุณอนวัช' }}</strong>
          <strong v-else-if="lineSession.status === 'error'">เชื่อม LINE ไม่สำเร็จ</strong>
          <strong v-else-if="lineSession.status === 'unconfigured'">ยังไม่ได้ตั้งค่า LINE</strong>
          <strong v-else>กำลังเชื่อม LINE</strong>
          <small v-if="lineSession.status === 'authenticated'">{{ lineAccountSubtitle }}</small>
          <small v-else-if="lineSession.status === 'local'">บัญชีจำลอง · บันทึกข้อมูลในเครื่องนี้</small>
          <small v-else-if="lineSession.status === 'error'">ลองปิดแล้วเปิดจากลิงก์ LIFF อีกครั้ง</small>
          <small v-else-if="lineSession.status === 'unconfigured'">กรุณากำหนด LIFF ID</small>
          <small v-else>รอสักครู่</small>
        </div>
        <button v-if="accountReady" type="button" class="account-profile-button" :aria-current="editingBirthProfile ? 'page' : undefined" @click="setActiveView('account')"><i class="pi pi-user-edit" /> โปรไฟล์</button>
      </div>
    </header>

    <div v-if="!isBlindTestMode && !accountReady" class="account-loading" role="status">
      <p>{{ accountSync.error || (['error', 'unconfigured', 'unauthenticated'].includes(lineSession.status) ? 'ยังเปิดบัญชีไม่ได้ กรุณาลองเชื่อมต่ออีกครั้ง' : 'กำลังเปิดข้อมูลของคุณ…') }}</p>
      <button v-if="accountSync.error || ['error', 'unconfigured', 'unauthenticated'].includes(lineSession.status)" type="button" @click="connectLineAccount">ลองอีกครั้ง</button>
    </div>
    <nav v-if="!isBlindTestMode && accountReady && chart" class="view-navigation" aria-label="เลือกหน้าคำอ่าน">
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
        <span><strong>ถนนชีวิต 10 ปี</strong><small>แนวโน้มชีวิตในแต่ละช่วง 10 ปี</small></span>
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
        :class="{ active: activeView === 'calendar' }"
        :aria-current="activeView === 'calendar' ? 'page' : undefined"
        @click="setActiveView('calendar')"
      >
        <i class="pi pi-calendar" />
        <span><strong>ปฏิทินของฉัน</strong><small>วางแผนรายเดือนและรายวัน</small></span>
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

    <IdentityReading
      v-if="chart && strength && !isBlindTestMode && activeView === 'profile' && !editingBirthProfile"
      :chart="chart"
      :assessment="strength"
      :reading="reading"
      :input="calculatedInput"
    />
    <button v-if="editingBirthProfile && chart && activeView === 'profile'" type="button" class="identity-back" @click="setActiveView('profile')">← กลับไปดูตัวตน</button>
    <MembershipSummary
      v-if="!isBlindTestMode && accountReady && chart && ((activeView === 'profile' && editingBirthProfile) || activeView === 'pricing')"
      :plan-id="accessPlan"
      :billing-cycle="billingCycle"
      :payment-method="billingPaymentMethod"
      :next-membership="nextMembership"
      :expires-at="premiumExpiresAt"
      :renewal-canceled="renewalCanceled"
      :included-used="comparisonIncludedUsed"
      :purchased-credits="purchasedComparisonCredits"
      :local="lineSession.status === 'local'"
      :now="calendarNow"
      @packages="openPricing()"
    />
    <section v-if="isBlindTestMode || (accountReady && activeView === 'profile' && (editingBirthProfile || !chart))" class="workspace" :class="{ 'profile-workspace': !isBlindTestMode }">
      <form class="form-card" @submit.prevent="submit">
        <div class="section-heading">
          <span class="step">01</span>
          <div>
            <h2>{{ isBlindTestMode ? 'ข้อมูลผู้ทดสอบ' : chart ? 'โปรไฟล์ของฉัน' : 'เริ่มต้นด้วยข้อมูลวันเกิดของคุณ' }}</h2>
            <p>{{ isBlindTestMode ? 'ระบบจะใช้ข้อมูลคำนวณคำตอบ แต่ยังไม่แสดงผลให้เห็น' : chart ? 'แก้ข้อมูลเกิดแล้วบันทึก เพื่ออัปเดตคำอ่านของคุณ' : 'กรอกวัน เวลา และเขตเวลาที่เกิดก่อน เพื่อเปิดคำอ่านปาจื้อของคุณ' }}</p>
          </div>
        </div>

        <div class="field-grid">
          <label class="field">
            <span>วันเกิด (วัน/เดือน/ปี ค.ศ.)</span>
            <MobileDateTimePicker v-model="form.birthDate" type="date" placeholder="เลือกวันเกิด" />
            <DatePicker
              v-model="form.birthDate"
              class="desktop-date-time-picker"
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
            <MobileDateTimePicker v-model="form.birthTime" type="time" placeholder="เลือกเวลาเกิด" />
            <DatePicker
              v-model="birthTimePicker"
              class="desktop-date-time-picker"
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

        <p v-if="chart && !isBlindTestMode" class="comparison-topic-hint">
          {{ lineSession.status === 'local' ? 'โหมดทดสอบ: แก้ข้อมูลเกิดได้ไม่จำกัด' : 'แก้วันเกิด เวลาเกิด เพศ หรือเขตเวลาได้ 1 ครั้งต่อ 30 วัน บันทึกข้อมูลเดิมไม่นับเป็นการแก้ไข' }}
          <span v-if="nextBirthEditAt && lineSession.status !== 'local'"> · แก้ไขได้อีกครั้ง {{ formatBirthEditDate(nextBirthEditAt) }}</span>
        </p>
        <p v-if="error" class="comparison-error" role="alert">{{ error }}</p>
        <p class="comparison-topic-hint">อ่านรายละเอียดการใช้ข้อมูลเกิดและช่องทางขอลบได้ที่ <a href="/privacy.html" target="_blank" rel="noopener">นโยบายความเป็นส่วนตัว</a></p>
        <Button
          type="submit"
          :label="isBlindTestMode ? 'เริ่มการทดสอบ' : chart ? 'บันทึกโปรไฟล์' : 'บันทึกและดูปาจื้อของฉัน'"
          :loading="profileSaving"
          :disabled="profileSaving"
          icon="pi pi-sparkles"
          class="calculate-button"
        />
      </form>


      <section v-if="isBlindTestMode" class="blind-test-card">
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

    <section v-if="reading && !isBlindTestMode && activeView === 'profile' && !editingBirthProfile" class="reading-section identity-extended">
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
        </article>
      </div>
    </section>

    <section v-if="chart && !isBlindTestMode && activeView === 'compare'" class="comparison-section">
      <div class="view-profile-summary">
        <div>
          <span>ข้อมูลของคุณที่ใช้เปรียบเทียบ</span>
          <strong>{{ calculatedInput.birthDate }} · {{ calculatedInput.birthTime }} · {{ calculatedInput.gender === 'male' ? 'ชาย' : 'หญิง' }}</strong>
          <small>{{ calculatedInput.timezoneId }}</small>
        </div>
        <button type="button" @click="setActiveView('account')"><i class="pi pi-pencil" /> แก้ไขข้อมูล</button>
      </div>

      <div class="comparison-heading">
        <div>
          <p class="eyebrow">คำแนะนำเฉพาะความสัมพันธ์</p>
          <h2>เปรียบเทียบคุณกับอีกฝ่าย</h2>
          <p>เลือกคนที่บันทึกไว้หรือกรอกข้อมูลเกิด เพื่อดูภาพรวมเมื่อคุณสองคนอยู่ด้วยกัน</p>
        </div>
        <span class="premium-badge"><i class="pi pi-lock" /> ฟีเจอร์พิเศษ</span>
      </div>

      <div v-if="lineSession.status !== 'local'" class="quota-status">
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
          <Button v-if="activeComparisonReport && comparisonResult" class="comparison-deselect" label="ยกเลิกการเลือก" icon="pi pi-times" severity="secondary" outlined type="button" @click="newComparisonPerson" />
        </div>
        <div class="saved-comparisons-list">
          <button
            v-for="report in savedComparisons"
            :key="report.id"
            type="button"
            class="saved-person-option"
            :class="{ pending: !report.result }"
            :aria-pressed="activeComparisonReport?.id === report.id"
            @click="openSavedComparison(report)"
          >
            <span class="saved-comparison-icon"><i class="pi pi-users" /></span>
            <span><strong>{{ report.name || 'อีกฝ่าย' }}</strong><small>{{ comparisonContextLabel(report) }}</small><small v-if="report.isStale" class="stale-report-label">ข้อมูลเก่า · {{ report.ownerProfileVersion ? `โปรไฟล์รุ่น ${report.ownerProfileVersion}` : 'ไม่ทราบข้อมูลเกิดต้นทาง' }}</small></span>
            <span class="saved-person-score"><strong>{{ report.result?.score?.value ?? '—' }}<small>/100</small></strong><small>คะแนนรวม</small></span>
            <i :class="report.result ? 'pi pi-chevron-right' : 'pi pi-refresh'" />
          </button>
        </div>
      </div>

      <div v-if="lineSession.status === 'local'" class="saved-comparisons">
        <div class="saved-comparisons-heading">
          <div><span>คนที่บันทึกไว้</span><strong>เก็บในเบราว์เซอร์นี้ · ทดสอบซ้ำได้ไม่จำกัด</strong></div>
          <Button v-if="selectedComparisonPerson" class="comparison-deselect" label="ยกเลิกการเลือก" icon="pi pi-times" severity="secondary" outlined type="button" @click="newComparisonPerson" />
        </div>
        <div class="saved-comparisons-list">
          <button v-for="person in comparisonPeopleWithScores" :key="person.id" class="saved-person-option" type="button" :aria-pressed="selectedComparisonPerson === person.id" @click="selectComparisonPerson(person)">
            <span class="saved-comparison-icon"><i class="pi pi-user" /></span>
            <span><strong>{{ person.name }}</strong><small>{{ person.birthDate }} · {{ person.birthTime || 'ไม่ทราบเวลาเกิด' }}</small></span>
            <span class="saved-person-score"><strong>{{ person.overallScore ?? '—' }}<small>/100</small></strong><small>คะแนนรวม</small></span>
            <i :class="selectedComparisonPerson === person.id ? 'pi pi-check-circle' : 'pi pi-chevron-right'" />
          </button>
        </div>
      </div>

      <div v-if="comparisonError" class="comparison-error" role="alert"><i class="pi pi-exclamation-circle" />{{ comparisonError }}</div>
      <p v-if="comparisonSaveNotice" class="comparison-save-success" role="status"><i class="pi pi-check-circle" /> {{ comparisonSaveNotice }}</p>

      <form v-if="!selectedComparisonPerson && !(activeComparisonReport && comparisonResult)" class="comparison-form" @submit.prevent="submitComparison">
        <div class="comparison-form-heading">
          <span class="step">01</span>
          <div><h3>ข้อมูลของอีกฝ่าย</h3><p>เวลาเกิดเว้นว่างได้หากไม่ทราบ</p><p>กรุณาขออนุญาตอีกฝ่ายและให้เขาอ่าน <a href="/privacy.html#others" target="_blank" rel="noopener">รายละเอียดการใช้ข้อมูล</a> ก่อนกรอก</p></div>
        </div>

        <div class="comparison-fields">
          <label class="field field-wide">
            <span>ชื่อที่ใช้เรียก <small>(ไม่บังคับ)</small></span>
            <InputText v-model="comparisonForm.name" placeholder="เช่น คุณเอ" />
          </label>
          <label class="field">
            <span>วันเกิด (วัน/เดือน/ปี ค.ศ.)</span>
            <MobileDateTimePicker v-model="comparisonForm.birthDate" type="date" placeholder="เลือกวันเกิด" />
            <DatePicker
              v-model="comparisonForm.birthDate"
              class="desktop-date-time-picker"
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
            <MobileDateTimePicker
              v-model="comparisonForm.birthTime"
              type="time"
              allow-empty
              placeholder="เลือกเวลาหรือระบุว่าไม่ทราบ"
            />
            <DatePicker
              v-model="comparisonTimePicker"
              class="desktop-date-time-picker"
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


        <div class="comparison-form-actions">
          <Button v-if="lineSession.status === 'local'" class="comparison-save-button" type="button" label="บันทึก" icon="pi pi-bookmark" @click="saveComparisonPersonFromForm" />
          <Button
            type="submit"
            label="ดูคะแนน"
            icon="pi pi-heart"
            class="calculate-button"
            :loading="comparisonSubmitting"
            :disabled="comparisonSubmitting"
          />
        </div>
      </form>

      <article v-if="comparisonResult" class="comparison-result">
        <div v-if="activeComparisonReport?.isStale" class="comparison-warning">
          <p>ข้อมูลเก่า — แสดงผลที่บันทึกไว้ ไม่ได้คำนวณด้วยข้อมูลเกิดปัจจุบัน ไม่คืนโควต้า
            <span v-if="activeComparisonReport.ownerBirthSnapshot"> · ข้อมูลเกิดเดิม: {{ birthProfileToForm(activeComparisonReport.ownerBirthSnapshot).birthDate }} {{ birthProfileToForm(activeComparisonReport.ownerBirthSnapshot).birthTime }} · {{ activeComparisonReport.ownerBirthSnapshot.timezone_id }}</span>
          </p>
        </div>
        <CompatibilityScore v-if="comparisonOverviewScore" :score="comparisonOverviewScore" :name="comparisonForm.name.trim() || 'อีกฝ่าย'" :summary="activeComparisonReport?.isStale ? comparisonResult.summary : comparisonTopics.find(topic => topic.value === 'overview')?.result.summary || ''" />
        <p v-else class="comparison-warning">รายงานนี้สร้างก่อนมีระบบคะแนน จึงยังแสดงเฉพาะคำอ่านเดิม</p>

        <div class="comparison-topics" role="group" aria-label="เลือกเรื่องที่ต้องการเปรียบเทียบ">
          <button v-for="topic in comparisonTopics" :key="topic.value" type="button" :aria-pressed="comparisonForm.focus === topic.value" @click="selectComparisonTopic(topic)">
            <span>{{ topic.label }}</span>
          </button>
        </div>
        <div class="comparison-result-heading">
          <div>
            <h3>{{ comparisonResult.focusLabel }}</h3>
          </div>
          <small><i class="pi pi-shield" /> {{ comparisonResult.confidence }}</small>
        </div>

        <div v-if="comparisonResult.timeWarning" class="comparison-warning">
          <i class="pi pi-exclamation-triangle" /><p>{{ comparisonResult.timeWarning }}</p>
        </div>

        <div class="comparison-result-grid">
          <div class="comparison-result-card"><span>จุดที่ไปด้วยกันได้</span><p>{{ comparisonResult.connection }}</p></div>
          <div class="comparison-result-card"><span>วิธีพูดคุยกัน</span><p>{{ comparisonResult.communication }}</p></div>
          <div class="comparison-result-card positive"><span>สิ่งที่ควรทำ</span><p>{{ comparisonResult.shouldDo }}</p></div>
          <div class="comparison-result-card caution"><span>สิ่งที่ควรหลีกเลี่ยง</span><p>{{ comparisonResult.shouldAvoid }}</p></div>
        </div>

      </article>
    </section>

    <section v-if="chart && !isBlindTestMode && activeView === 'pricing'" class="pricing-section">
      <div v-if="!selectedBillingProduct" class="pricing-heading">
        <p class="eyebrow">CHOOSE YOUR PLAN</p>
        <h2>เลือกสิทธิ์ที่เหมาะกับการใช้งาน</h2>
        <p>พื้นดวง วันนี้ และถนนชีวิต 10 ปีทุกช่วงดูฟรี · Premium รายเดือนดูล่วงหน้า 30 วัน รายปีดูล่วงหน้า 90 วัน</p>
      </div>

      <div v-if="pricingNotice" class="pricing-notice"><i class="pi pi-info-circle" /> {{ pricingNotice }}</div>

      <PackageSelection v-if="!selectedBillingProduct" :plan-id="accessPlan" :billing-cycle="billingCycle" :payment-method="billingPaymentMethod" :expires-at="premiumExpiresAt" :next-membership="nextMembership" @select="product => choosePlan(product === 'comparison' ? 'comparison' : 'premium', product)" />

      <p class="pricing-footnote">ช่วงดูล่วงหน้าเลื่อนตามวันใช้งาน ขณะสมาชิกยังมีผล เมื่อหมดอายุดูได้เฉพาะวันนี้ โดยไม่ลบข้อมูลที่บันทึกไว้</p>
      <BillingPanel :id-token="lineSession.idToken || ''" :product="selectedBillingProduct" :local="lineSession.status === 'local'" :advance-starts-at="selectedBillingProduct === 'yearly' && accessPlan === 'premium' && billingCycle === 'monthly' && new Date(premiumExpiresAt) > calendarNow ? premiumExpiresAt : null" :promptpay-only="accessPlan === 'premium' && billingPaymentMethod === 'promptpay' && selectedBillingProduct === billingCycle && new Date(premiumExpiresAt) > calendarNow" @back="selectedBillingProduct = null; pricingNotice = ''" @refresh-account="refreshBillingAccount" />
    </section>

    <section v-if="!personalMonth && !isBlindTestMode && activeView === 'calendar' && !editingBirthProfile" class="calendar-section" aria-live="polite">
      <h2>ปฏิทินของคุณ</h2>
      <p v-if="calendarLoading">กำลังโหลดปฏิทินและตรวจสอบสิทธิ์…</p>
      <template v-else-if="calendarError">
        <p role="alert">{{ calendarError }}</p>
        <Button label="ลองใหม่" icon="pi pi-refresh" @click="loadCalendar" />
      </template>
    </section>
    <section v-if="personalMonth && !isBlindTestMode && activeView === 'calendar'" class="calendar-section">
      <div class="view-profile-summary">
        <div>
          <span>ปฏิทินนี้คำนวณสำหรับ</span>
          <strong>{{ calculatedInput.birthDate }} · {{ calculatedInput.birthTime }} · {{ calculatedInput.gender === 'male' ? 'ชาย' : 'หญิง' }}</strong>
          <small>{{ calculatedInput.timezoneId }}</small>
        </div>
        <button type="button" @click="setActiveView('account')"><i class="pi pi-pencil" /> แก้ไขข้อมูล</button>
      </div>

      <div class="calendar-heading">
        <div>
          <h2>ปฏิทินของคุณ</h2>
          <p>วันไหนเหมาะกับเรื่องอะไร เลือกวันเพื่ออ่านคำแนะนำที่คำนวณจากข้อมูลเกิดของคุณ</p>
        </div>
        <span class="premium-badge"><i class="pi" :class="isPremium ? 'pi-crown' : 'pi-calendar'" /> {{ calendarPlan.localPreview ? 'โหมดทดสอบ · ล่วงหน้า 90 วัน' : isPremium ? 'Premium · ล่วงหน้า ' + calendarDaysAhead + ' วัน' : 'วันนี้ใช้ฟรี' }}</span>
      </div>

      <label class="field calendar-focus-field">
        <span>อยากดูภาพรวมหรือเจาะเรื่องไหน?</span>
        <Select v-model="calendarFocus" :options="calendarFocusOptions" option-label="label" option-value="value" />
      </label>

      <button v-if="!isPremium" type="button" class="feature-lock-callout" @click="openPricing('Premium รายเดือนดูล่วงหน้า 30 วัน รายปีดูล่วงหน้า 90 วัน')">
        <i class="pi pi-lock" /><span><strong>วางแผนล่วงหน้า 30 หรือ 90 วัน</strong><small>เปิดคะแนนและรายละเอียดรายวัน</small></span><b>ดู Premium</b>
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
            :class="[calendarDayAllowed(day) ? day.level : null, { selected: calendarDayAllowed(day) && selectedCalendarDay?.key === day.key, today: day.isToday, locked: calendarDayState(day) === 'premium', unavailable: calendarDayState(day) === 'unavailable' }]"
            :aria-label="calendarDayAllowed(day) ? `วันที่ ${day.day} คะแนน ${day.personalScore} จาก 100 ${day.stars.map(star => star.name).join(' ')}` : calendarDayState(day) === 'unavailable' ? `วันที่ ${day.day} ไม่เปิดให้ดู อยู่นอกช่วงวันนี้ถึงล่วงหน้า 90 วัน` : `วันที่ ${day.day} สำหรับ ${isPremium ? 'Premium รายปี' : 'Premium'}`"
            :disabled="calendarDayState(day) === 'unavailable'"
            :aria-pressed="calendarDayAllowed(day) && selectedCalendarDay?.key === day.key"
            @click="selectCalendarDay(day)"
          >
            <span>{{ day.day }}</span>
            <span v-if="calendarDayState(day) === 'unavailable'" class="calendar-unavailable-mark" aria-hidden="true">—</span>
            <i v-else-if="!calendarDayAllowed(day)" class="pi pi-lock calendar-lock-icon" />
            <b v-else class="calendar-personal-score">{{ day.personalScore }}<em>/100</em></b>
            <span v-if="calendarDayAllowed(day) && day.stars.length" class="calendar-personal-stars">
              <i v-for="star in day.stars" :key="star.id" class="pi" :class="star.icon" :title="star.name" :aria-label="star.name" />
            </span>
            <small v-else-if="calendarDayState(day) === 'premium'">{{ isPremium ? 'รายปี' : 'Premium' }}</small>
          </button>
        </div>
        <div class="calendar-legend">
          <span>— ไม่เปิดให้ดู (วันย้อนหลังหรือเกิน 90 วัน)</span>
          <span><i class="strong" /> เหมาะเดินหน้า</span>
          <span><i class="balanced" /> ใช้ได้เมื่อเตรียมตัว</span>
          <span><i class="caution" /> เพิ่มความระวัง</span>
        </div>
      </div>

      <PersonalDayReading v-if="selectedCalendarDay && calendarDayAllowed(selectedCalendarDay)" :day="selectedCalendarDay" :month-label="personalMonth.monthLabel" />

    </section>

    <section v-if="luckTimeline && !isBlindTestMode && activeView === 'luck'" class="luck-section">
      <div class="view-profile-summary">
        <div>
          <span>ข้อมูลที่ใช้ดูจังหวะชีวิต</span>
          <strong>{{ calculatedInput.birthDate }} · {{ calculatedInput.birthTime }} · {{ calculatedInput.gender === 'male' ? 'ชาย' : 'หญิง' }}</strong>
          <small>{{ calculatedInput.timezoneId }}</small>
        </div>
        <button type="button" @click="setActiveView('account')"><i class="pi pi-pencil" /> แก้ไขข้อมูล</button>
      </div>

      <div class="luck-heading">
        <div>
          <p class="eyebrow">ภาพรวมชีวิตเป็นช่วง</p>
          <h2>ถนนชีวิต 10 ปี</h2>
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

    </section>
    <footer class="service-links" style="text-align: center; padding: 24px 16px; font-size: .85rem;">
      <a href="/service.html">ข้อมูลบริการ · บริษัท จีเนียส พิคเจอร์ จำกัด</a>
      <a href="/terms.html">เงื่อนไขบริการ</a>
      <a href="/privacy.html">ความเป็นส่วนตัว</a>
      <a href="/service.html#refund-title">การยกเลิกและคืนเงิน</a>
      <a href="/service.html#contact-title">ติดต่อ / แจ้งปัญหา</a>
    </footer>
  </main>
</template>
