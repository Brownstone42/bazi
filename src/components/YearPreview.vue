<script setup>
import { computed, ref } from 'vue'
import { buildYearPreview, currentSolarYear, shortDate } from '../services/year-preview.js'
const props = defineProps({ today: { type: String, required: true }, chart: Object, assessment: Object, input: Object, luckTimeline: Object })
defineEmits(['month'])
const selected = ref(null)
const ready = computed(() => props.chart && props.assessment && props.input)
const year = computed(() => ready.value ? currentSolarYear(props.today, props.input) : Number(props.today.slice(0, 4)))
const data = computed(() => ready.value ? buildYearPreview({ ...props, year: year.value }) : null)
const active = computed(() => selected.value ?? data.value?.months.find(month => month.isCurrent)?.key ?? data.value?.months[0]?.key)
const sorted = computed(() => [...(data.value?.topics ?? [])].sort((a, b) => b.score - a.score))
function point(index, value = 100) {
  const angle = -Math.PI / 2 + index * 2 * Math.PI / 5
  return [170 + Math.cos(angle) * 100 * value / 100, 145 + Math.sin(angle) * 100 * value / 100]
}
const polygon = value => Array.from({ length: 5 }, (_, index) => point(index, value).join(',')).join(' ')
const scores = computed(() => data.value?.topics.map((topic, index) => point(index, topic.score).join(',')).join(' '))
const icons = { work: 'briefcase', money: 'wallet', love: 'heart', communication: 'comments', wellbeing: 'sun' }
const advice = {
  work: ['ทำงานทีละขั้นและเผื่อเวลาตรวจซ้ำ', 'จัดลำดับงานก่อนรับภาระเพิ่ม', 'เดินหน้างานที่เตรียมพร้อมและติดตามผล'],
  money: ['ตรวจเงื่อนไขและกันเงินสำรองก่อนใช้จ่าย', 'วางงบและทบทวนรายการเงินเข้าออก', 'ติดตามรายได้และจัดการแผนการเงินที่มีข้อมูลพร้อม'],
  love: ['เว้นเวลาฟังกันและหลีกเลี่ยงการกดดัน', 'พูดความต้องการให้ชัดโดยไม่เร่งคำตอบ', 'จัดเวลาให้ความสัมพันธ์และแสดงความใส่ใจ'],
  communication: ['ตรวจข้อความและข้อเท็จจริงก่อนส่ง', 'สรุปประเด็นให้สั้นและถามให้เข้าใจตรงกัน', 'ใช้โอกาสนำเสนอและขอความร่วมมือ'],
  wellbeing: ['ลดความหักโหมและกันเวลาพัก', 'รักษากิจวัตรที่ทำไหวอย่างสม่ำเสมอ', 'วางกิจวัตรพักผ่อนและดูแลตัวเองให้ต่อเนื่อง']
}
</script>
<template>
  <section class="year-preview" aria-label="ดวงประจำปี">
    <header class="year-hero"><p class="year-label">ดวงปี {{ year + 543 }}</p><template v-if="data"><small>{{ data.pillarLabel }} · {{ shortDate(data.start) }} {{ year + 543 }} – {{ shortDate(data.end) }} {{ year + 544 }}</small><h2>{{ data.title }}</h2><p>{{ data.advice }}</p><span class="year-badge">{{ data.yearClash ? 'ปีจรชงกับปีเกิด' : 'ปีจรไม่ชงกับปีเกิด' }}</span></template></header>
    <div class="year-body"><p v-if="!data" role="status">กรุณาระบุวันเกิด เวลาเกิด และเพศในแท็บข้อมูลเกิดให้ครบก่อน</p><template v-else>
      <section class="radar-card"><div class="section-heading"><h3>ภาพรวม 5 ด้าน</h3><small>ยิ่งกว้าง คะแนนยิ่งสูง</small></div><svg viewBox="0 0 340 290" role="img" :aria-label="data.topics.map(topic => `${topic.label} ${topic.score} จาก 100`).join(' · ')"><polygon v-for="level in [25,50,75,100]" :key="level" :points="polygon(level)" fill="none" stroke="#e9e2d9" stroke-dasharray="3 3"/><line v-for="(_, index) in data.topics" :key="index" x1="170" y1="145" :x2="point(index)[0]" :y2="point(index)[1]" stroke="#e9e2d9"/><defs><linearGradient id="year-radar-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#e6b079" stop-opacity=".65"/><stop offset="100%" stop-color="#a64764" stop-opacity=".5"/></linearGradient></defs><polygon :points="scores" fill="url(#year-radar-fill)" stroke="#b36d72" stroke-width="1.5"/><circle v-for="(topic,index) in data.topics" :key="topic.focus" :cx="point(index,topic.score)[0]" :cy="point(index,topic.score)[1]" r="3" fill="#a65158" stroke="#fff" stroke-width="1.5"/><g v-for="(topic,index) in data.topics" :key="topic.focus"><text :x="point(index,130)[0]" :y="point(index,122)[1]" text-anchor="middle" class="radar-label">{{ topic.label }}</text><text :x="point(index,130)[0]" :y="point(index,122)[1]+17" text-anchor="middle" :fill="topic.rating.ink" class="radar-rating">{{ topic.rating.label }}</text></g></svg><div class="radar-summary"><div><small>ด้านที่คะแนนสูงสุด</small><strong>{{ sorted[0].label }}</strong></div><div><small>ด้านที่ควรใส่ใจเพิ่ม</small><strong>{{ sorted.at(-1).label }}</strong></div></div><p class="method-note">สรุปจากคะแนนรายวันตลอดปีปาจื้อ</p></section>
      <div class="section-heading"><h3>อ่านทีละด้าน</h3><small>เรียงตามคะแนนเฉลี่ย</small></div><section class="year-topics"><article v-for="topic in sorted" :key="topic.focus"><span class="topic-icon" :style="{background:topic.rating.background,color:topic.rating.ink}"><i :class="`pi pi-${icons[topic.focus]}`" aria-hidden="true"/></span><div><div class="topic-heading"><h4>{{ topic.label }}</h4><span :style="{background:topic.rating.background,color:topic.rating.ink}">{{ topic.rating.label }}</span></div><p>{{ advice[topic.focus][topic.score <=45 ? 0 : topic.score <=60 ? 1 : 2] }}</p><small>เดือนที่คะแนนสูงสุด <b>{{ topic.best.label }}</b><template v-if="topic.caution"> · ควรระวัง <b>{{ topic.caution.label }}</b></template></small></div></article></section>
      <p v-if="data.yearClash || data.dayClash" class="year-alert">{{ data.yearClash ? 'กิ่งปีจรชงกับปีเกิด' : 'กิ่งปีจรชงกับเสาวันเกิด' }} เผื่อเวลารองรับการเปลี่ยนแปลงและทบทวนข้อตกลงสำคัญ</p>
      <section class="year-months"><div class="section-heading"><h3>12 เดือนของปี {{ year + 543 }}</h3><small>แตะเดือนเพื่ออ่าน</small></div><div class="month-strip" aria-label="เลือกเดือนจีน"><button v-for="month in data.months" :key="month.key" :aria-label="`${shortDate(month.start)} – ${shortDate(month.end)} ${month.rating.label}`" :aria-pressed="active === month.key" :style="{background:month.rating.color}" @click="selected=month.key"><span>{{ month.label }}</span></button></div><div class="year-counts"><span v-for="level in data.counts" :key="level.key"><b :style="{color:level.ink}">{{ level.count }}</b> {{ level.label }}</span></div><div class="month-list"><article v-for="month in data.months" :key="month.key" class="solar-month"><button class="month-toggle" :aria-expanded="active === month.key" @click="selected=active === month.key ? '' : month.key"><span class="month-date"><b>{{ month.label }}</b><small>{{ month.isCurrent ? 'เดือนนี้' : `เริ่ม ${shortDate(month.start)}` }}</small></span><strong>{{ month.title }}</strong><span class="month-rating" :style="{color:month.rating.ink,background:month.rating.background}">{{ month.rating.label }}</span><i class="pi pi-angle-down month-chevron" aria-hidden="true"/></button><div v-if="active === month.key" class="month-detail"><small>{{ shortDate(month.start) }} – {{ shortDate(month.end) }} · {{ month.pillarLabel }}</small><p>{{ month.advice }}</p><button @click="$emit('month', month.start)">ดูปฏิทินเดือนนี้ <span aria-hidden="true">›</span></button></div></article></div><p class="method-note">ปีปาจื้อเปลี่ยนที่ลี่ชุน ช่วงเดือนแสดงตามเสา ณ เที่ยงของแต่ละวัน คะแนนเป็นค่าเฉลี่ยจากสูตรรายวันเดิม</p></section>
      <section class="zodiac-card"><h3>นักษัตรของคุณ</h3><div><span><small>ปีเกิด</small><b>{{ data.zodiac.natal }}</b></span><span><small>นักษัตรคู่ผสม</small><b>{{ data.zodiac.friend }}</b></span><span><small>นักษัตรชง</small><b>{{ data.zodiac.clash }}</b></span></div></section>
    </template></div>
  </section>
</template>
<style scoped>
.year-preview{--year-border:#eee8e1;--year-muted:#978b82;--year-paper:#fffefa}
.year-hero{position:relative;isolation:isolate;overflow:hidden;color:#fffaf3;padding:24px 24px 28px;background:linear-gradient(165deg,transparent 12%,#a35946aa 70%,#cb8d61cc)}
.year-hero::after{content:"";position:absolute;z-index:-1;width:220px;height:220px;right:-82px;top:-28px;border:1px solid #fff2;border-radius:50%;box-shadow:0 0 0 24px #fff04,0 0 0 48px #fff03;pointer-events:none}
.year-hero .year-label{margin:0 0 6px;font-size:.85rem;letter-spacing:.03em;font-weight:600}
.year-hero small{opacity:.8;font-size:.73rem;line-height:1.7}
.year-hero h2{font-size:clamp(1.4rem,4.8vw,1.85rem);font-weight:700;line-height:1.45;letter-spacing:-.025em;margin:12px 0 8px}
.year-hero p{line-height:1.7;font-size:.87rem;max-width:40em;margin:0 0 16px;color:#fff6e8}
.year-badge{display:inline-flex;align-items:center;gap:6px;border-radius:20px;background:#fff2;border:1px solid #ffffff30;padding:6px 12px;font-size:.73rem}
.year-body{background:#f8f6f2;padding:18px 18px 26px;color:#463d36}
.radar-card{background:var(--year-paper);border:1px solid var(--year-border);border-radius:20px;padding:18px 16px 12px;box-shadow:0 6px 24px #58352606}
.section-heading{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:24px 2px 12px}
.section-heading h3,h3{margin:0;font-size:.97rem;font-weight:650;line-height:1.5}
.section-heading small{font-size:.68rem;color:var(--year-muted)}
.radar-card .section-heading{padding:0}
.radar-card svg{display:block;width:100%;max-width:350px;margin:8px auto 0;overflow:visible}
.radar-label{font-size:11px;fill:#514238;font-weight:600}
.radar-rating{font-size:10px}
.radar-summary{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.radar-summary>div{border-radius:12px;padding:12px;background:#edf2e9}
.radar-summary>div+div{background:#f8eee9}
.radar-summary small,.radar-summary strong{display:block;font-size:.85rem;line-height:1.5}
.radar-summary small{font-size:.66rem;margin-bottom:5px;color:#897b6e}
.method-note{font-size:.67rem;color:var(--year-muted);line-height:1.7;margin:12px 2px 0}
.radar-card .method-note{text-align:center}
.year-topics{border:1px solid var(--year-border);background:var(--year-paper);border-radius:18px;overflow:hidden}
.year-topics article{display:flex;gap:12px;padding:17px 15px;border-bottom:1px solid var(--year-border)}
.year-topics article:last-child{border:0}
.topic-icon{display:grid;place-items:center;width:34px;height:34px;border-radius:11px;flex:none;font-size:.9rem}
.year-topics article>div{flex:1;min-width:0}
.topic-heading{display:flex;align-items:center;justify-content:space-between;gap:8px}
.topic-heading h4{margin:0;font-size:.88rem;font-weight:650}
.topic-heading>span{border-radius:20px;padding:3px 9px;font-size:.66rem;white-space:nowrap}
.year-topics p{margin:6px 0;font-size:.81rem;line-height:1.65;color:#6e6258}
.year-topics small{color:var(--year-muted);font-size:.68rem;line-height:1.6}
.year-topics small b{font-weight:600;color:#77604d}
.year-alert{padding:14px 16px;border-radius:12px;border-left:3px solid #b8895d;background:#f2eade;font-size:.8rem;line-height:1.7;margin:18px 0 0}
.year-months{margin-top:4px}
.month-strip{display:flex;gap:4px;padding:8px 0 25px}
.month-strip button{position:relative;flex:1;min-width:0;height:22px;border:0;border-radius:5px;cursor:pointer}
.month-strip button[aria-pressed=true]{box-shadow:inset 0 0 0 2px #702536}
.month-strip span{position:absolute;top:28px;left:50%;transform:translateX(-50%);font-size:.55rem;white-space:nowrap;color:#86786a}
.year-counts{display:flex;justify-content:center;flex-wrap:wrap;gap:8px 15px;font-size:.68rem;margin:16px 0 20px;color:#8e8074}
.year-counts b{font-size:.8rem;margin-right:2px}
.month-list{background:var(--year-paper);border:1px solid var(--year-border);border-radius:18px;overflow:hidden}
.solar-month{border-bottom:1px solid var(--year-border)}
.solar-month:last-child{border-bottom:0}
.month-toggle{display:flex;align-items:center;gap:10px;width:100%;padding:16px 14px;background:none;border:0;text-align:left;color:inherit;font:inherit;cursor:pointer}
.month-date{display:grid;gap:4px;flex:none;width:56px}
.month-date b{font-size:.95rem;font-weight:650}
.month-date small{font-size:.6rem;color:var(--year-muted);white-space:nowrap}
.month-toggle>strong{flex:1;min-width:0;font-size:.81rem;font-weight:550;line-height:1.6}
.month-rating{font-size:.63rem;padding:4px 8px;border-radius:14px;white-space:nowrap}
.month-chevron{font-size:.65rem;color:#ac9a89;transition:transform .18s}
.month-toggle[aria-expanded=true]{background:#f5ebe3}
.month-toggle[aria-expanded=true] .month-chevron{transform:rotate(180deg)}
.month-detail{padding:4px 15px 16px;background:#f5ebe3}
.month-detail>small{color:#9a8b7f;font-size:.68rem;line-height:1.7}
.month-detail p{font-size:.8rem;line-height:1.7;margin:10px 0 14px;color:#796958}
.month-detail button{width:100%;background:#fffaf5;border:1px solid #eaddcf;border-radius:10px;padding:11px 12px;text-align:left;color:#792f3d;font:inherit;font-size:.77rem;cursor:pointer}
.month-detail button span{float:right}
.zodiac-card{background:var(--year-paper);border:1px solid var(--year-border);border-radius:18px;padding:18px;margin-top:22px}
.zodiac-card>div{display:grid;grid-template-columns:repeat(3,1fr);text-align:center;margin-top:18px}
.zodiac-card span{display:grid;gap:9px;border-right:1px solid var(--year-border)}
.zodiac-card span:last-child{border:0}
.zodiac-card small{font-size:.68rem;color:var(--year-muted)}
.zodiac-card b{font-size:1.15rem;color:#783541;font-weight:600}
.year-preview button:focus-visible{outline:3px solid #b18d51;outline-offset:-3px}
@media(min-width:600px){.year-hero{padding:26px 28px 30px}.year-body{padding:22px 26px 30px}.radar-card{padding:22px}.year-topics article{padding:18px}.month-toggle{padding:18px}.month-detail{padding:4px 18px 18px}}
@media(max-width:360px){.year-body{padding-left:12px;padding-right:12px}.month-toggle{gap:7px;padding:14px 10px}.month-date{width:48px}.month-chevron{display:none}.section-heading small{font-size:.6rem}}
</style>
