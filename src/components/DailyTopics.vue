<script setup>
import { scoreLevel } from '../services/score-level.js'
defineProps({ topics: { type: Array, required: true }, date: { type: String, required: true } })
const icons = { work: 'briefcase', money: 'wallet', love: 'heart', communication: 'comments', wellbeing: 'sun' }
const copy = {
  work: ['ชะลอการรับงานเพิ่ม แล้วเก็บรายละเอียดงานสำคัญให้ครบ', 'เลือกงานหลักให้ชัด แล้วเดินหน้าทีละขั้น', 'เหมาะผลักดันงานที่เตรียมไว้ให้คืบหน้า', 'ให้งานสำคัญเป็นลำดับแรก วันนี้มีปัจจัยหนุนเด่น'],
  money: ['ตรวจยอดและเงื่อนไขให้ครบก่อนตกลงเรื่องเงิน', 'จัดรายรับรายจ่ายให้ชัด ก่อนเพิ่มภาระใหม่', 'เหมาะติดตามรายการค้างและจัดการเรื่องเงินที่เตรียมไว้', 'ใช้วันนี้สะสางเรื่องเงินและทบทวนข้อตกลงให้ชัด'],
  love: ['ค่อย ๆ คุย อย่าเร่งให้อีกฝ่ายตอบหรือตัดสินใจ', 'เปิดพื้นที่ให้ฟังกัน โดยไม่คาดหวังคำตอบทันที', 'เหมาะเริ่มบทสนทนาและแสดงความใส่ใจ', 'ให้เวลากับความสัมพันธ์ วันนี้มีปัจจัยสนับสนุนเด่น'],
  communication: ['ตรวจถ้อยคำก่อนส่ง และยืนยันว่าเข้าใจตรงกัน', 'คุยทีละประเด็น จะช่วยให้ตกลงกันง่ายขึ้น', 'เหมาะนำเสนอความคิดและขอความร่วมมือ', 'หยิบเรื่องสำคัญมาคุย พร้อมข้อมูลที่เตรียมไว้'],
  wellbeing: ['ลดสิ่งที่ไม่จำเป็น แล้วเว้นเวลาให้ตัวเองได้พัก', 'สลับงานกับช่วงพัก และรักษากิจวัตรที่ทำไหว', 'เหมาะจัดเวลาพักให้เป็นส่วนหนึ่งของวัน', 'ใช้จังหวะนี้วางกิจวัตรดูแลตัวเองที่ทำต่อได้'],
}
const levelIndex = score => score <= 45 ? 0 : score <= 60 ? 1 : score <= 75 ? 2 : 3
const summary = topic => copy[topic.focus]?.[levelIndex(topic.personalScore)] ?? topic.summary
</script>
<template>
  <section class="daily-topics" aria-label="แต่ละด้าน">
    <header><h3>แต่ละด้าน</h3></header>
    <article v-for="topic in topics.filter(item => item.focus !== 'communication')" :key="`${date}-${topic.focus}`" class="today-topic" :style="{ '--level-color': scoreLevel(topic.personalScore).color, '--level-ink': scoreLevel(topic.personalScore).ink, '--level-bg': scoreLevel(topic.personalScore).background }">
      <div>
        <div class="topic-heading"><span class="topic-icon"><i :class="`pi pi-${icons[topic.focus] ?? 'circle'}`" aria-hidden="true" /></span><strong>{{ topic.focus === 'wellbeing' ? 'สุขภาพ' : topic.focusLabel }}</strong><span class="topic-rating" role="img" :aria-label="`คะแนน ${topic.personalScore} จาก 100 · ${scoreLevel(topic.personalScore).label}`"><span v-for="n in 5" :key="n" :class="{ filled: n <= Math.round(topic.personalScore / 20) }" /></span></div>
        <p class="topic-preview">{{ summary(topic) }}</p>
      </div>

    </article>
  </section>
</template>
<style scoped>
.daily-topics{background:#fffdf8;border-radius:20px;margin:0 16px 20px;padding:18px 16px 6px;color:#463d36}.daily-topics h3{color:#711d2b;font-size:1.1rem;margin:0 0 4px}.today-topic{padding:12px 0}.topic-heading{display:flex;align-items:center;gap:10px}.topic-heading>strong{flex:1;font-size:.94rem;font-weight:600;line-height:1.5}.topic-icon{display:grid;place-items:center;flex-shrink:0;width:32px;height:32px;border-radius:9px;font-size:.85rem;background:#e7edf5;color:#6083ac}.today-topic:nth-of-type(2) .topic-icon{background:#f7efd9;color:#ad8e3b}.today-topic:nth-of-type(3) .topic-icon{background:#f8e6ec;color:#b7657e}.today-topic:nth-of-type(4) .topic-icon{background:#e4f0e9;color:#5c9277}.topic-rating{display:flex;gap:4px;align-items:center;flex-shrink:0}.topic-rating>span{display:block;width:15px;height:5px;border-radius:4px;background:#e4e2e8}.topic-rating>span.filled{background:var(--level-color)}.topic-preview{margin:0 0 0 42px;color:#8a8179;font-size:.83rem;line-height:1.65}@media(max-width:360px){.daily-topics{margin-left:10px;margin-right:10px;padding-left:12px;padding-right:12px}.topic-rating{gap:3px}.topic-rating>span{width:12px}.topic-preview{font-size:.8rem}}
</style>
