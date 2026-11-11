<script setup>
import { computed } from 'vue'
const props = defineProps({ identity: { type: Object, required: true } })
const colors = ['#43694f', '#c06445', '#9b7549', '#778797', '#3c7188']
const color = computed(() => colors[Math.floor(props.identity.stemIndex / 2)])
const horizon = computed(() => 112 + props.identity.branchIndex % 4 * 8)
</script>

<template>
  <!-- Original code-drawn artwork: ten foreground motifs over twelve landscapes. -->
  <svg viewBox="0 0 240 180" role="img" :aria-label="`ภาพสัญลักษณ์ ${identity.title}`" class="identity60-art">
    <rect width="240" height="180" rx="24" fill="#f3eadb" />
    <path d="M0 0H240V115Q120 65 0 116Z" :fill="color" opacity=".16" />
    <circle :cx="36 + identity.branchIndex * 14" :cy="28 + identity.branchIndex % 3 * 12" r="17" fill="#d5a658" opacity=".8" />
    <path :d="`M0 ${horizon} Q55 ${horizon - 48} 115 ${horizon} T240 ${horizon - 8} V180H0Z`" :fill="color" opacity=".25" />
    <path v-if="identity.branchIndex % 3 === 0" d="M-5 145 Q40 125 88 148 T245 145 M-5 162 Q40 142 88 165 T245 162" fill="none" stroke="#577f88" stroke-width="5" opacity=".55" />
    <path v-else-if="identity.branchIndex % 3 === 1" d="M0 171L50 126L90 167L152 112L240 170V180H0Z" :fill="color" opacity=".3" />
    <g v-else :stroke="color" opacity=".45" stroke-width="2"><path v-for="x in [22, 45, 185, 211]" :key="x" :d="`M${x} 168v-25m0 12l-7-6m7 1l7-9`" /></g>
    <g :fill="color" :stroke="color" stroke-linejoin="round" stroke-linecap="round">
      <g v-if="identity.stemIndex === 0"><path d="M120 142V70" stroke-width="9" /><path d="M120 43L82 95H158Z" /><path d="M120 68L70 121H170Z" /></g>
      <g v-else-if="identity.stemIndex === 1"><path d="M119 146Q100 110 125 76" fill="none" stroke-width="5" /><ellipse cx="101" cy="115" rx="20" ry="8" transform="rotate(30 101 115)" /><ellipse cx="137" cy="95" rx="20" ry="8" transform="rotate(-35 137 95)" /><circle cx="125" cy="68" r="16" fill="#b97c82" stroke="none" /><circle cx="125" cy="68" r="6" fill="#f6e6b6" stroke="none" /></g>
      <g v-else-if="identity.stemIndex === 2"><circle cx="120" cy="83" r="30" /><path v-for="angle in [0,45,90,135,180,225,270,315]" :key="angle" d="M120 39V29" :transform="`rotate(${angle} 120 83)`" stroke-width="4" /></g>
      <g v-else-if="identity.stemIndex === 3"><path d="M96 83H144L138 137H102Z" fill="#d7af65" stroke-width="3" /><path d="M120 54Q141 85 120 102Q104 89 120 54Z" /><path d="M94 140H146M105 78Q120 50 135 78" fill="none" stroke-width="4" /></g>
      <g v-else-if="identity.stemIndex === 4"><path d="M55 145L113 54L176 145Z" /><path d="M95 82L113 54L133 84L114 76Z" fill="#fff6e5" stroke="none" /><path d="M128 145L164 99L207 145Z" opacity=".65" /></g>
      <g v-else-if="identity.stemIndex === 5"><path d="M66 137Q120 100 174 137L156 154H84Z" /><path d="M120 129V91M120 111Q91 111 94 92Q114 88 120 111M120 101Q124 75 145 78Q146 98 120 101" fill="none" stroke="#527359" stroke-width="5" /></g>
      <g v-else-if="identity.stemIndex === 6"><path d="M109 128V52L120 40L131 52V128Z" /><path d="M92 123H148M120 129V148" fill="none" stroke="#9a7446" stroke-width="7" /><path d="M120 54V114" stroke="#e2e6df" stroke-width="2" /></g>
      <g v-else-if="identity.stemIndex === 7"><path d="M83 75L103 53H137L157 75L120 132Z" /><path d="M83 75H157M103 53L108 75L120 132L133 75L137 53M108 75H133" fill="none" stroke="#e4ece9" stroke-width="2" /></g>
      <g v-else-if="identity.stemIndex === 8"><path d="M62 123Q80 70 117 84Q143 95 128 115Q155 122 178 99Q175 141 126 142Q86 141 62 123Z" /><path d="M82 119Q100 100 118 107" fill="none" stroke="#e1efe8" stroke-width="4" /></g>
      <g v-else><path d="M120 48Q73 106 100 128Q120 146 142 125Q164 105 120 48Z" /><path d="M104 105Q98 119 113 124" fill="none" stroke="#e1efe8" stroke-width="4" /></g>
    </g>
    <circle v-for="i in identity.branchIndex % 4 + 1" :key="i" :cx="177 + i * 9" cy="24" r="2" :fill="color" opacity=".6" />
  </svg>
</template>

<style scoped>
.identity60-art { display: block; width: 100%; height: auto; }
</style>
