<script setup>
defineProps({ score: { type: Object, required: true }, name: { type: String, default: 'อีกฝ่าย' }, summary: { type: String, default: '' } })
</script>

<template>
  <section class="pair-score" aria-label="คะแนนเปรียบเทียบ">
    <header class="pair-score-heading">
      <div class="pair-score-number"><strong>{{ score.value ?? '—' }}</strong><span>/ 100</span></div>
      <div><h3>{{ score.label }}</h3><p v-if="summary" class="pair-score-summary">{{ summary }}</p></div>
    </header>
    <div class="pair-score-directions">
      <article v-for="item in [{ key: 'forward', label: `คุณ ส่งเสริม ${name}` }, { key: 'reverse', label: `${name} ส่งเสริม คุณ` }]" :key="item.key">
        <div class="pair-score-direction-title"><h4>{{ item.label }}</h4><strong>{{ score[item.key].value ?? '—' }}<small> / 100</small></strong></div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.pair-score { margin: 1.5rem 0; padding: clamp(1rem, 3vw, 2rem); border: 1px solid #dfd8cd; border-radius: 22px; background: #faf7f1; color: #343d38; }
.pair-score-heading { display: flex; align-items: center; gap: 1.5rem; }
.pair-score-number { flex-shrink: 0; display: grid; place-content: center; text-align: center; width: 112px; height: 112px; border-radius: 50%; border: 5px solid #b7c9bc; background: white; }
.pair-score-number strong { font-size: 2.8rem; line-height: 1.1; }
.pair-score-number span, small { color: #656b65; font-size: .8rem; }
h3, h4 { margin: 0; }
h3 { margin: .35rem 0; font-size: 1.2rem; }
.pair-score-summary { margin: .5rem 0 0; font-size: .95rem; line-height: 1.8; }
.pair-score-directions { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; margin-top: 1.5rem; }
article { min-width: 0; padding: 1.15rem; border-radius: 16px; background: white; border: 1px solid #e9e3d8; }
.pair-score-direction-title { display: flex; flex-direction: column; gap: .75rem; align-items: center; text-align: center; }
h4 { overflow-wrap: anywhere; font-size: 1rem; }
.pair-score-direction-title > strong { white-space: nowrap; font-size: 1.5rem; }
@media (max-width: 640px) { .pair-score-heading { flex-direction: column; text-align: center; gap: .8rem; } .pair-score-directions { grid-template-columns: 1fr; } }
</style>
