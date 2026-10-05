<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'

const props = defineProps({ modelValue: { type: Number, required: true }, options: { type: Array, required: true }, label: { type: String, required: true } })
const emit = defineEmits(['update:modelValue'])
const wheel = ref(null)
const rowHeight = 48
const selectedIndex = computed(() => Math.max(0, props.options.findIndex(item => item.value === props.modelValue)))
const selected = computed(() => props.options[selectedIndex.value])
function align() {
  if (wheel.value && Math.abs(wheel.value.scrollTop - selectedIndex.value * rowHeight) > 1) wheel.value.scrollTop = selectedIndex.value * rowHeight
}
onMounted(align)
watch(() => [props.modelValue, props.options.length], async () => {
  await nextTick()
  // During a gesture the selected row is already within half a row of the centre.
  if (wheel.value && Math.abs(wheel.value.scrollTop - selectedIndex.value * rowHeight) > rowHeight / 2) align()
})
function scroll() {
  const index = Math.max(0, Math.min(props.options.length - 1, Math.round(wheel.value.scrollTop / rowHeight)))
  if (props.options[index]?.value !== props.modelValue) emit('update:modelValue', props.options[index].value)
}
function choose(index) {
  const item = props.options[Math.max(0, Math.min(props.options.length - 1, index))]
  if (!item) return
  emit('update:modelValue', item.value)
  wheel.value.scrollTop = props.options.indexOf(item) * rowHeight
}
function keydown(event) {
  const movement = { ArrowDown: 1, ArrowUp: -1, PageDown: 5, PageUp: -5 }
  if (event.key in movement) { event.preventDefault(); choose(selectedIndex.value + movement[event.key]) }
  else if (event.key === 'Home' || event.key === 'End') { event.preventDefault(); choose(event.key === 'Home' ? 0 : props.options.length - 1) }
}
</script>

<template>
  <div ref="wheel" class="picker-wheel" role="spinbutton" tabindex="0" :aria-label="label" :aria-valuemin="0" :aria-valuemax="options.length - 1" :aria-valuenow="selectedIndex" :aria-valuetext="selected?.label" @scroll="scroll" @keydown="keydown">
    <div class="picker-wheel-spacer" aria-hidden="true" />
    <div v-for="(item, index) in options" :key="item.value" class="picker-wheel-row" :class="{ selected: item.value === modelValue }" aria-hidden="true" @click="choose(index)">{{ item.label }}</div>
    <div class="picker-wheel-spacer" aria-hidden="true" />
  </div>
</template>
