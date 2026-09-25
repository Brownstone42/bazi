<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  type: { type: String, required: true, validator: (value) => ['date', 'time'].includes(value) },
  allowEmpty: { type: Boolean, default: false },
  placeholder: { type: String, default: 'แตะเพื่อเลือก' }
})
const emit = defineEmits(['update:modelValue'])

const thaiMonths = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
]
const currentYear = new Date().getFullYear()
const years = Array.from({ length: currentYear - 1899 }, (_, index) => currentYear - index)
const hours = Array.from({ length: 24 }, (_, value) => value)
const minutes = Array.from({ length: 60 }, (_, value) => value)

const isOpen = ref(false)
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
  return `${Number(match[1])} ${thaiMonths[Number(match[2]) - 1]} ${match[3]}`
})

watch([month, year], () => {
  if (day.value > days.value.length) day.value = days.value.length
})
watch(isOpen, (open) => {
  if (open) {
    previousBodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = previousBodyOverflow
  }
})

function openPicker() {
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
    <button type="button" class="mobile-picker-trigger" :class="{ empty: !modelValue }" @click="openPicker">
      <span>{{ displayValue }}</span>
      <i :class="type === 'date' ? 'pi pi-calendar' : 'pi pi-clock'" />
    </button>

    <Teleport to="body">
      <Transition name="mobile-sheet">
        <div v-if="isOpen" class="mobile-picker-overlay" role="presentation" @click.self="closePicker">
          <section class="mobile-picker-sheet" role="dialog" aria-modal="true" :aria-label="type === 'date' ? 'เลือกวันเกิด' : 'เลือกเวลาเกิด'">
            <div class="mobile-picker-handle" />
            <div class="mobile-picker-heading">
              <div>
                <small>{{ type === 'date' ? 'วัน / เดือน / ปี ค.ศ.' : 'รูปแบบ 24 ชั่วโมง' }}</small>
                <h3>{{ type === 'date' ? 'เลือกวันเกิด' : 'เลือกเวลาเกิด' }}</h3>
              </div>
              <button type="button" aria-label="ปิด" @click="closePicker"><i class="pi pi-times" /></button>
            </div>

            <div v-if="type === 'date'" class="mobile-picker-columns date-columns">
              <label><span>วัน</span><select v-model.number="day"><option v-for="item in days" :key="item" :value="item">{{ item }}</option></select></label>
              <label><span>เดือน</span><select v-model.number="month"><option v-for="(item, index) in thaiMonths" :key="item" :value="index + 1">{{ item }}</option></select></label>
              <label><span>ปี ค.ศ.</span><select v-model.number="year"><option v-for="item in years" :key="item" :value="item">{{ item }}</option></select></label>
            </div>
            <div v-else class="mobile-picker-columns time-columns">
              <label><span>ชั่วโมง</span><select v-model.number="hour"><option v-for="item in hours" :key="item" :value="item">{{ String(item).padStart(2, '0') }}</option></select></label>
              <b>:</b>
              <label><span>นาที</span><select v-model.number="minute"><option v-for="item in minutes" :key="item" :value="item">{{ String(item).padStart(2, '0') }}</option></select></label>
            </div>

            <div class="mobile-picker-actions">
              <button v-if="type === 'time' && allowEmpty" type="button" class="mobile-picker-clear" @click="clearTime">ไม่ทราบเวลาเกิด</button>
              <button type="button" class="mobile-picker-confirm" @click="confirm">ยืนยัน{{ type === 'date' ? 'วันเกิด' : 'เวลา' }}</button>
            </div>
          </section>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
