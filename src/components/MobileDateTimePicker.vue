<script setup>
import { computed, nextTick, onBeforeUnmount, ref, useId, watch } from 'vue'
import PickerWheel from './PickerWheel.vue'
import { birthDateDescription, thaiMonths } from '../services/birth-display'

const props = defineProps({
  modelValue: { type: String, default: '' },
  type: { type: String, required: true, validator: (value) => ['date', 'time'].includes(value) },
  allowEmpty: { type: Boolean, default: false },
  placeholder: { type: String, default: 'แตะเพื่อเลือก' },
  disabled: { type: Boolean, default: false },
  birthTime: { type: String, default: '' },
  timezoneId: { type: String, default: 'Asia/Bangkok' }
})
const emit = defineEmits(['update:modelValue'])

const currentYear = new Date().getFullYear()
const years = Array.from({ length: currentYear - 1899 }, (_, index) => currentYear - index)
const hours = Array.from({ length: 24 }, (_, value) => value)
const minutes = Array.from({ length: 60 }, (_, value) => value)

const isOpen = ref(false)
const dialogId = useId()
const dialog = ref(null)
const trigger = ref(null)
const day = ref(1)
const month = ref(1)
const year = ref(currentYear - 30)
const hour = ref(12)
const minute = ref(0)
let previousBodyOverflow = ''

const days = computed(() => Array.from(
  { length: new Date(year.value, month.value, 0).getDate() },
  (_, index) => index + 1
))
const displayValue = computed(() => {
  if (!props.modelValue) return props.placeholder
  if (props.type === 'time') return `${props.modelValue} น.`
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(props.modelValue)
  if (!match) return props.modelValue
  return `${Number(match[1])} ${thaiMonths[Number(match[2]) - 1]} ${Number(match[3]) + 543}`
})
const pad = value => String(value).padStart(2, '0')
const draftDescription = computed(() => birthDateDescription(`${pad(day.value)}/${pad(month.value)}/${year.value}`, props.birthTime, props.timezoneId))
const numberOptions = values => values.map(value => ({ value, label: pad(value) }))
const dayOptions = computed(() => numberOptions(days.value))
const monthOptions = thaiMonths.map((label, index) => ({ value: index + 1, label }))
const yearOptions = years.map(value => ({ value, label: String(value + 543) }))
const hourOptions = numberOptions(hours)
const minuteOptions = numberOptions(minutes)

watch([month, year], () => {
  if (day.value > days.value.length) day.value = days.value.length
})
watch(isOpen, async (open) => {
  if (open) {
    previousBodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = previousBodyOverflow
  }
  await nextTick()
  if (open && isOpen.value) dialog.value?.querySelector('[role="spinbutton"]')?.focus()
  else if (!isOpen.value && trigger.value?.isConnected) trigger.value.focus()
})

function handleDialogKey(event) {
  if (event.key === 'Escape') {
    event.preventDefault()
    closePicker()
  } else if (event.key === 'Tab') {
    const controls = [...dialog.value.querySelectorAll('button, [role="spinbutton"]')]
    const first = controls[0]
    const last = controls.at(-1)
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }
}

function openPicker() {
  if (props.disabled) return
  if (props.type === 'date') {
    const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(props.modelValue)
    if (match) {
      day.value = Number(match[1])
      month.value = Number(match[2])
      year.value = Number(match[3])
    }
  } else {
    const match = /^(\d{2}):(\d{2})$/.exec(props.modelValue)
    if (match) {
      hour.value = Number(match[1])
      minute.value = Number(match[2])
    }
  }
  isOpen.value = true
}

function closePicker() {
  isOpen.value = false
}

function confirm() {
  const pad = (value) => String(value).padStart(2, '0')
  emit('update:modelValue', props.type === 'date'
    ? `${pad(day.value)}/${pad(month.value)}/${year.value}`
    : `${pad(hour.value)}:${pad(minute.value)}`)
  closePicker()
}

function clearTime() {
  emit('update:modelValue', '')
  closePicker()
}

onBeforeUnmount(() => {
  if (isOpen.value) document.body.style.overflow = previousBodyOverflow
})
</script>

<template>
  <div class="mobile-date-time-picker">
    <button ref="trigger" type="button" class="mobile-picker-trigger" :disabled="disabled" :class="{ empty: !modelValue }" aria-haspopup="dialog" :aria-expanded="isOpen" :aria-controls="isOpen ? dialogId : undefined" @click="openPicker">
      <span>{{ displayValue }}</span>
      <i :class="type === 'date' ? 'pi pi-calendar' : 'pi pi-clock'" />
    </button>

    <Teleport to="body">
      <Transition name="mobile-sheet">
        <div v-if="isOpen" class="mobile-picker-overlay" role="presentation" @click.self="closePicker">
          <section :id="dialogId" ref="dialog" class="mobile-picker-sheet" role="dialog" aria-modal="true" :aria-label="type === 'date' ? 'เลือกวันเกิด' : 'เลือกเวลาเกิด'" @keydown="handleDialogKey">
            <div class="mobile-picker-handle" />
            <div class="mobile-picker-heading">
              <div>
                <small>{{ type === 'date' ? 'วัน / เดือน / ปี พ.ศ.' : 'รูปแบบ 24 ชั่วโมง' }}</small>
                <h3>{{ type === 'date' ? 'เลือกวันเกิด' : 'เลือกเวลาเกิด' }}</h3>
              </div>
              <button type="button" aria-label="ปิด" @click="closePicker"><i class="pi pi-times" /></button>
            </div>

            <div v-if="type === 'date'" class="mobile-picker-columns date-columns wheel-columns">
              <PickerWheel v-model="day" :options="dayOptions" label="วัน" />
              <PickerWheel v-model="month" :options="monthOptions" label="เดือน" />
              <PickerWheel v-model="year" :options="yearOptions" label="ปี พ.ศ." />
            </div>
            <div v-else class="mobile-picker-columns time-columns wheel-columns">
              <PickerWheel v-model="hour" :options="hourOptions" label="ชั่วโมง" />
              <PickerWheel v-model="minute" :options="minuteOptions" label="นาที" />
            </div>
            <p v-if="type === 'date' && draftDescription" class="picker-date-description" aria-live="polite">{{ draftDescription.weekday }} · ปี{{ draftDescription.animal }}ตามปาจื้อ</p>

            <div class="mobile-picker-actions">
              <button v-if="type === 'time' && allowEmpty" type="button" class="mobile-picker-clear" @click="clearTime">ไม่ทราบเวลาเกิด</button>
              <button type="button" class="mobile-picker-cancel" @click="closePicker">ยกเลิก</button>
              <button type="button" class="mobile-picker-confirm" @click="confirm">ตกลง</button>
            </div>
          </section>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
