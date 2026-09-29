<script setup>
import { computed, ref, watch } from 'vue'
const props = defineProps({ day: { type: Object, required: true }, monthLabel: { type: String, required: true } })
const focus = ref('all')
watch(() => [props.day.key, props.day.focus], () => { focus.value = 'all' })
const active = computed(() => props.day.topicReadings?.find(topic => topic.focus === focus.value) ?? props.day)
const signedPoints = value => `${value > 0 ? '+' : ''}${Number(value.toFixed(2))}`
</script>

<template>
  <article class="personal-day">
    <header>
      <div><span class="personal-day-eyebrow">{{ day.isToday ? 'วันนี้เหมาะกับคุณแค่ไหน' : 'วันนี้ในปฏิทินเหมาะกับคุณแค่ไหน' }}</span><h3>{{ day.day }} {{ monthLabel }}</h3><p>{{ day.focusLabel }}</p></div>
      <div class="personal-day-score"><strong>{{ day.personalScore }}</strong><span>/ 100</span></div>
    </header>
    <p class="personal-day-summary">{{ day.summary }}</p>
    <div v-if="day.topicReadings" class="personal-day-topics" role="group" aria-label="เลือกอ่านคำแนะนำรายด้าน">
      <button type="button" :aria-pressed="focus === 'all'" @click="focus = 'all'"><span>ภาพรวม</span><strong class="topic-score">{{ day.personalScore }}<small>/100</small></strong></button>
      <button v-for="topic in day.topicReadings" :key="topic.focus" type="button" :class="topic.level" :aria-pressed="focus === topic.focus" @click="focus = topic.focus">
        <span>{{ topic.focusLabel }}</span><strong class="topic-score">{{ topic.personalScore }}<small>/100</small></strong>
      </button>
    </div>
    <section class="personal-day-advice" aria-live="polite">
      <template v-if="active.scoreExplanation">
        <div v-for="factor in active.scoreExplanation.factors.filter(item => !item.technical)" :key="factor.id" class="score-factor">
          <div><strong>{{ factor.label }}</strong><b :class="factor.technical || factor.points === 0 ? 'neutral' : factor.points > 0 ? 'positive' : 'negative'">{{ signedPoints(factor.points) }}</b></div>
          <p>{{ factor.detail }}</p>
        </div>
        <div class="score-factor-total"><span>คะแนน{{ active.focus === 'all' ? 'ภาพรวม' : active.focusLabel }}</span><strong>{{ active.personalScore }}/100</strong></div>
      </template>
    </section>
    <section v-if="active.dailyBalance" class="daily-balance" aria-live="polite">
      <div class="balance-heading"><h4>ปรับสมดุลวันนี้</h4></div>
      <p>{{ active.dailyBalance.reason }}</p>
      <div class="balance-options">
        <div v-for="option in active.dailyBalance.options" :key="option.element" class="balance-option">
          <div class="balance-color"><span class="color-swatch" :style="{ backgroundColor: option.swatch }" aria-hidden="true" /><strong>ธาตุ{{ option.elementName }} · สี{{ option.color }}</strong></div>
          <p>{{ option.reason }}</p>
          <p>{{ option.suggestion }}</p>
        </div>
      </div>
      <p>{{ active.dailyBalance.suggestion }}</p>
      <p>{{ active.dailyBalance.reduce }}</p>
    </section>
    <section class="personal-day-stars">
      <h4><i class="pi pi-star" /> ดาวที่สัมพันธ์กับดวงคุณวันนี้</h4>
      <div v-for="star in day.stars" :key="star.id" class="personal-star">
        <strong><i class="pi" :class="star.icon" aria-hidden="true" /> {{ star.name }}</strong><p>{{ star.meaning }}</p><p v-if="star.advice">{{ star.advice }}</p>
      </div>
      <p v-if="!day.stars?.length">ไม่พบดาวที่สัมพันธ์กับดวงคุณ</p>
    </section>
  </article>
</template>

<style scoped>
.personal-day { margin-top: 20px; padding: clamp(18px, 3vw, 30px); border: 1px solid #e1d9cf; border-radius: 22px; background: #fffcf7; color: #463d36; }
header { display: flex; align-items: center; justify-content: space-between; gap: 14px; }
.personal-day-eyebrow { font-size: .85rem; color: #846b4c; }
h3 { font-size: 1.3rem; margin: 7px 0; }
h4 { font-size: 1rem; margin: 20px 0 8px; }
p { font-size: .9rem; line-height: 1.85; margin: 6px 0; }
.personal-day-score { display: grid; place-content: center; text-align: center; border: 5px solid #afc3ad; border-radius: 50%; width: 94px; height: 94px; flex-shrink: 0; background: white; }
.personal-day-score strong { font-size: 2rem; line-height: 1.2; color: #345340; }
.personal-day-score span { font-size: .7rem; color: #827264; }
.personal-day-topics { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 8px; margin-top: 20px; }
button { font: inherit; text-align: left; padding: 12px; border: 1px solid #e4dcd1; border-radius: 12px; background: white; color: #51483c; cursor: pointer; }
button span { display: block; font-size: .8rem; }
.topic-score { display: block; margin-top: 8px; font-size: 1.2rem; color: #345340; }
.topic-score small { display: inline; margin-left: 3px; font-size: .65rem; font-weight: 400; }
button[aria-pressed="true"] { background: #f0eadc; border-color: #887348; box-shadow: inset 0 0 0 1px #887348; }
button:focus-visible { outline: 3px solid #759681; outline-offset: 2px; }
.personal-day-advice { padding: 16px; border-radius: 14px; background: #f2f5ed; margin-top: 16px; }
.personal-day-advice h4 { margin-top: 0; }
.daily-balance { margin-top: 16px; padding: 18px; background: #faf4e8; border: 1px solid #e8dac1; border-radius: 16px; }
.balance-heading { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; }
.balance-heading h4 { margin: 0; }
.balance-options { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 230px), 1fr)); gap: 12px; margin: 14px 0; }
.balance-option { padding: 14px; border: 1px solid #e8dac1; background: #fffcf7; border-radius: 12px; min-width: 0; }
.balance-option .balance-color { margin-top: 0; }
.balance-color { display: flex; align-items: center; gap: 10px; margin: 14px 0 8px; }
.color-swatch { width: 30px; height: 30px; border: 1px solid #c9c1b4; border-radius: 50%; flex-shrink: 0; }
.score-factor { padding: 12px 0; border-top: 1px solid #dfe6d7; }
.score-factor > div, .score-factor-base, .score-factor-total { display: flex; justify-content: space-between; align-items: baseline; gap: 14px; }
.score-factor > div strong { font-size: .85rem; }
.score-factor b { flex-shrink: 0; font-size: 1rem; }
.score-factor .positive { color: #386748; }
.score-factor .negative { color: #a14943; }
.score-factor .neutral { color: #756d60; }
.score-factor p { font-size: .82rem; color: #696255; }
.score-factor-base { padding: 12px 0; font-size: .8rem; color: #746b5e; }
.score-factor-total { padding-top: 14px; border-top: 1px solid #ccd6c2; font-weight: 700; }
.personal-day-stars { border-top: 1px solid #e8e0d4; margin-top: 20px; }
.personal-star { border-left: 3px solid #b79a60; padding: 10px 14px; margin: 12px 0; background: #f8f2e8; border-radius: 0 12px 12px 0; }
small { display: block; color: #857867; font-size: .75rem; line-height: 1.7; }
.personal-day-footnote { margin-top: 20px; }
@media(max-width: 520px) { .personal-day-topics { grid-template-columns: repeat(2,minmax(0,1fr)); } h3 { font-size: 1.1rem; } .personal-day-score { width: 78px; height: 78px; } }
</style>
