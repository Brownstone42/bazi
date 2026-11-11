<script setup>
import { computed, ref, watch, onMounted, onBeforeUnmount, toRaw } from 'vue'
import { buildLovePreview, presentLovePeriod, loveStatus } from '../services/love-preview.js'
import { shortDate } from '../services/year-preview.js'
const props=defineProps({chart:Object,assessment:Object,input:Object,relationshipStatus:String})
const emit=defineEmits(['profile'])
const status=ref(loveStatus(props.relationshipStatus))
const today=ref(new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()))
let timer
onMounted(()=>{timer=setInterval(()=>{today.value=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())},60000)})
onBeforeUnmount(()=>clearInterval(timer))
watch(()=>props.relationshipStatus,value=>status.value=loveStatus(value))
const data=ref(null), loading=ref(false), error=ref('')
watch(()=>[props.chart,props.assessment,props.input,today.value],(_,__,onCleanup)=>{
  data.value=null;error.value='';loading.value=false
  if(!props.chart||!props.assessment||!props.input?.birthTime||!['male','female'].includes(props.input.gender)) return
  loading.value=true
  const task=setTimeout(()=>{try{data.value=buildLovePreview({chart:toRaw(props.chart),assessment:toRaw(props.assessment),input:toRaw(props.input),today:today.value})}catch{error.value='ยังอ่านข้อมูลไม่สำเร็จ กรุณาตรวจข้อมูลเกิดอีกครั้ง'}finally{loading.value=false}},30)
  onCleanup(()=>clearTimeout(task))
},{immediate:true})
const months=computed(()=>data.value?.months.map(item=>presentLovePeriod(item,status.value))??[])
const years=computed(()=>data.value?.years.map(item=>presentLovePeriod(item,status.value))??[])
const monthIndex=ref(-1),yearIndex=ref(-1),person=ref(null)
const zodiac = pillar => ['ชวด','ฉลู','ขาล','เถาะ','มะโรง','มะเส็ง','มะเมีย','มะแม','วอก','ระกา','จอ','กุน']['子丑寅卯辰巳午未申酉戌亥'.indexOf(pillar?.[1])]
function highlighted(items,index,monthly) {
  const positive=items.filter(item=>item.score!==null && item.score>=50).sort((a,b)=>b.score-a.score).slice(0,monthly?3:4)
  const caution=monthly?items.filter(item=>item.score!==null && item.score<50).sort((a,b)=>a.score-b.score).slice(0,1):[]
  const result=[...positive.sort((a,b)=>a.date.localeCompare(b.date)),...caution]
  if(items[index] && !result.includes(items[index])) result.unshift(items[index])
  return result
}
const sections=computed(()=>[
{id:'months',title:'12 เดือนข้างหน้า',hint:'เดือนตามปฏิทินจีน',items:months.value,index:monthIndex.value,rows:highlighted(months.value,monthIndex.value,true)},
{id:'years',title:'ปีไหนความรักเด่น',hint:'10 ปีข้างหน้า',items:years.value,index:yearIndex.value,rows:highlighted(years.value,yearIndex.value,false)}])
const signalTitle=item=>item.tags.join(' · ') || item.factors.map(factor=>factor.label).join(' · ') || 'ยังไม่มีปัจจัยที่ให้คะแนนได้'
const statuses=[{id:'single',label:'โสด',hint:'เปิดใจรู้จักคนใหม่'},{id:'coupled',label:'มีคู่แล้ว',hint:'ดูแลความสัมพันธ์'}]
const loveText=computed(()=>data.value?.identity?.sections.find(item=>item.title==='ความสัมพันธ์')?.text)
</script>
<template>
  <section class="love-preview" aria-label="ดวงความรัก">
    <header class="love-heading"><span>พื้นที่ของความสัมพันธ์</span><h2>ดวงความรัก</h2><p>เข้าใจตัวเอง แล้วเลือกจังหวะที่เหมาะกับคุณ</p></header>
    <div class="love-body">
      <div class="status-options" role="group" aria-label="สถานะความรัก"><button v-for="item in statuses" :key="item.id" :aria-pressed="status===item.id" @click="status=item.id"><i class="pi pi-heart" aria-hidden="true"/><b>{{ item.label }}</b><small>{{ item.hint }}</small></button></div>
      <p v-if="loading" role="status" class="empty">กำลังอ่านจังหวะความรักของคุณ…</p>
      <div v-else-if="!data" class="empty"><p>{{ error || 'เพิ่มเวลาเกิดและเพศในข้อมูลเกิด เพื่ออ่านปาจื้อความรัก' }}</p><button @click="emit('profile')">ไปข้อมูลเกิด</button></div>
      <template v-else>
        <article class="love-style"><i class="pi pi-heart" aria-hidden="true"/><small>ความรักในแบบของคุณ</small><h3>{{ data.identity?.title }}</h3><p>{{ loveText }}</p><span v-if="data.natalPeach" class="peach-badge">มีดาวเสน่ห์ในพื้นดวง</span></article>
        <article class="love-now"><small>จังหวะปัจจุบัน · {{ shortDate(months[0].start) }} – {{ shortDate(months[0].end) }}</small><h3>{{ months[0].summary }}</h3><div class="tags"><span v-for="tag in months[0].tags" :key="tag">{{ tag }}</span></div></article>
        <section v-for="section in sections" :key="section.id" class="love-card">
          <div class="section-heading"><h3>{{ section.title }}</h3><small>{{ section.hint }}</small></div>
          <div class="love-bars" :style="{'--columns':section.items.length}" :aria-label="section.title"><button v-for="(item,index) in section.items" :key="item.date" :aria-pressed="index===section.index" :aria-label="`${item.label} ${item.rating.label}`" @click="section.id==='months'?monthIndex=index:yearIndex=index"><span class="bar-space"><span :style="{height:`${item.score===null?12:Math.max(12,item.score)}%`,background:item.rating.color}"/></span><small>{{ section.id==='years'?item.label.slice(-2):item.label }}</small><small v-if="section.id==='years'" class="year-animal">{{ zodiac(item.pillar) }}</small></button></div>
          <p class="legend">แตะแท่งเพื่ออ่าน · สีเทา = ยังไม่มีคะแนนชัดเจน</p>
          <div class="timeline-rows">
<article v-for="item in section.rows" :key="item.date" class="period-detail timeline-row" :class="{'is-selected':section.items[section.index]===item}" :style="{background:item.score!==null && item.score>=50?'#fcf0f3':'#f2eef5'}">
<div class="timeline-date"><b>{{ item.label }}</b><small v-if="section.id==='months'">{{ shortDate(item.start) }} – {{ shortDate(item.end) }}</small><small v-else>ปี{{ zodiac(item.pillar) }}</small></div>
<div class="timeline-copy"><div class="timeline-signals"><span v-if="item.score!==null && item.score>=50" class="love-hearts" :aria-label="item.score+' จาก 100'"><span v-for="heart in 5" :key="heart" :class="{filled:heart<=Math.round(item.score/20)}" aria-hidden="true">♥</span></span><b>{{ item.score!==null && item.score<50?'ควรระวัง · ':'' }}{{ signalTitle(item) }}</b></div><p>{{ item.summary }}</p><details><summary>ดูคะแนนและเหตุผล</summary><p v-if="item.score!==null" class="score">{{ item.score }} / 100 <small>คะแนนตามเกณฑ์ของแอป</small></p><p v-else>ยังไม่มีปัจจัยที่ให้คะแนนได้ในเกณฑ์นี้</p><div v-for="factor in item.factors" :key="factor.id" class="factor"><strong>{{ factor.delta>0?'+':'' }}{{ factor.delta }} · {{ factor.label }}</strong><p v-for="detail in factor.details" :key="detail.id">{{ detail.text }}</p></div><small>ฐาน 2.5 จาก 5 บวก/ลบตามปัจจัย แล้วแสดงบนสเกล 100 ไม่ใช่เปอร์เซ็นต์โอกาสเกิดเหตุการณ์</small></details></div>
</article></div><p v-if="!section.rows.length" class="section-note">ยังไม่พบช่วงเด่นที่ให้คะแนนได้จากปัจจัยที่ใช้อยู่ แตะแท่งเพื่อดูแต่ละช่วง</p>
        </section>
        <section class="love-card"><div class="section-heading"><h3>ตัวตนที่มีจุดเชื่อมกับคุณ</h3></div><p class="section-note">ธาตุและปีนักษัตรด้านล่างเป็นของเสาวัน ไม่ใช่ปีเกิด · คู่บุญหมายถึงก้านวันและวังคู่ประสานกัน ยังไม่ใช่การเทียบดวงเต็มของสองคน</p><div class="compatible"><button v-for="item in data.compatible" :key="item.id" :aria-expanded="person===item.id" @click="person=person===item.id?null:item.id"><i class="pi pi-heart" aria-hidden="true"/><b>{{ item.title }}</b><span v-if="item.soulmate" class="soulmate-badge">คู่บุญ</span><span class="identity-meta">{{ item.elementLabel }} · {{ item.zodiacLabel }}</span><small>{{ item.reasons.join(' · ') }}</small></button></div><p v-if="person" class="person-detail">{{ data.compatible.find(item=>item.id===person)?.sections.find(item=>item.title==='ความสัมพันธ์')?.text }}</p></section>
        <p class="reading-note">คำอ่านเดือนและปีเป็นแนวโน้มตลอดช่วง ไม่ใช่ฤกษ์รายวัน ใช้ร่วมกับสถานการณ์และการตัดสินใจของคุณ</p>
      </template>
    </div>
  </section>
</template>
<style scoped>
.love-preview{max-width:860px;margin:auto;color:#493a35;min-width:0}.love-heading{padding:22px 24px 28px;color:#fff6ec;background:linear-gradient(160deg,transparent,#a65d64)}.love-heading span{font-size:.72rem;opacity:.75}.love-heading h2{font-size:1.8rem;margin:8px 0}.love-heading p{font-size:.85rem;margin:0;opacity:.85}.love-body{padding:18px;background:#faf6f2}.status-options{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;margin-bottom:20px}.status-options button{display:grid;gap:7px;justify-items:center;padding:16px 4px;border:1px solid #e9ddd5;border-radius:15px;background:#fffdfa;color:#8c6666;font:inherit;cursor:pointer;min-width:0}.status-options b{font-size:.88rem}.status-options small{font-size:.58rem}.status-options button[aria-pressed=true]{background:#853549;color:white;border-color:#853549;box-shadow:0 5px 12px #85354920}.love-style{padding:26px 20px;text-align:center;color:#fff6ef;border-radius:22px;background:linear-gradient(155deg,#572333,#954958 65%,#c88772)}.love-style>i{font-size:2rem;margin:5px 0 20px}.love-style>small{display:block;opacity:.7}.love-style h3{font-size:1.5rem;margin:8px 0 12px}.love-style p{font-size:.88rem;line-height:1.9}.peach-badge{display:inline-block;padding:6px 12px;border-radius:20px;background:#fff2;font-size:.72rem}.love-now{padding:20px;margin:16px 0;background:#f4e5de;border:1px solid #ecd6cd;border-radius:18px}.love-now small{font-size:.72rem;color:#9b7466}.love-now h3{font-size:1rem;line-height:1.7;margin:8px 0}.tags{display:flex;flex-wrap:wrap;gap:6px}.tags span{font-size:.65rem;border-radius:20px;background:#ffffff80;padding:4px 8px;color:#91645b}.love-card{background:#fffdfa;border:1px solid #ece4dd;border-radius:20px;padding:18px 14px;margin-top:16px;min-width:0}.section-heading{display:flex;align-items:center;justify-content:space-between;gap:8px}.section-heading h3{font-size:.95rem;margin:0}.section-heading small{font-size:.65rem;color:#a28f83}.love-bars{display:grid;grid-template-columns:repeat(var(--columns),minmax(0,1fr));gap:4px;margin-top:20px}.love-bars button{border:0;background:none;padding:2px;min-width:0;cursor:pointer;color:#9a8175;border-radius:6px}.bar-space{display:flex;height:86px;align-items:flex-end}.bar-space>span{display:block;width:100%;border-radius:5px 5px 2px 2px}.love-bars small{font-size:.56rem;white-space:nowrap}.love-bars button[aria-pressed=true]{outline:2px solid #a95768;outline-offset:1px}.legend{color:#a28f83;font-size:.61rem;margin:13px 0}.period-detail{border-radius:14px;padding:14px}.detail-heading{display:flex;justify-content:space-between;gap:8px;font-size:.78rem}.detail-heading span{white-space:nowrap;font-size:.72rem}.period-detail p{line-height:1.75;font-size:.85rem;margin:9px 0}.period-detail details{border-top:1px solid #96796522;margin-top:14px;padding-top:12px}.period-detail summary{font-size:.7rem;color:#8a685b;cursor:pointer}.period-detail details>small{display:block;color:#9a8175;font-size:.64rem;line-height:1.7}.score{font-weight:700}.score small{font-weight:400;font-size:.65rem}.factor{border-top:1px solid #96796522;padding:10px 0}.factor strong{font-size:.75rem}.factor p{font-size:.7rem;color:#847064;overflow-wrap:anywhere}.section-note,.reading-note{font-size:.7rem;line-height:1.8;color:#9c877b}.compatible{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}.compatible button{display:flex;flex-direction:column;align-items:center;gap:10px;min-width:0;padding:15px 7px;border:1px solid #ecdeda;border-radius:14px;background:#fcf7f4;color:#985466;cursor:pointer;font:inherit}.soulmate-badge{font-size:.68rem;background:#f3e3b6;color:#795b21;border-radius:20px;padding:3px 9px}.identity-meta{font-size:.68rem;line-height:1.6;color:#76504d}.compatible b{font-size:.72rem}.compatible small{font-size:.62rem;color:#9c877b;line-height:1.6}.compatible button[aria-expanded=true]{border-color:#a95768}.person-detail{font-size:.8rem;line-height:1.8;padding:14px;background:#f5ece6;border-radius:12px}.reading-note{text-align:center;margin:22px 8px}.empty{padding:30px 10px;line-height:1.7}.empty button{padding:10px 16px;border:0;border-radius:10px;background:#853549;color:#fff}.love-preview button:focus-visible,.love-preview summary:focus-visible{outline:3px solid #ba9463;outline-offset:2px}@media(min-width:600px){.love-body{padding:24px}.love-card{padding:22px}.love-bars{gap:8px}.bar-space{height:110px}}@media(max-width:360px){.love-body{padding:12px}.love-card{padding:14px 10px}.section-heading{flex-wrap:wrap}}

.timeline-rows{display:grid;gap:9px;margin-top:14px}.timeline-row{display:grid;grid-template-columns:86px minmax(0,1fr);gap:12px;padding:12px;border-radius:12px}.timeline-date{display:flex;flex-direction:column;gap:3px}.timeline-date b{font-size:.85rem}.timeline-date small{font-size:.64rem;color:#97878a;line-height:1.45}.timeline-copy{min-width:0}.timeline-signals{display:flex;align-items:baseline;flex-wrap:wrap;gap:4px 8px}.timeline-signals>b{font-size:.78rem;line-height:1.5}.love-hearts{display:inline-flex;white-space:nowrap;color:#ead8de;font-size:.85rem;letter-spacing:1px}.love-hearts .filled{color:#ce667e}.timeline-copy>p{font-size:.78rem;line-height:1.6;margin:3px 0}.timeline-row details{margin-top:5px;padding-top:0;border:0}.timeline-row summary{font-size:.62rem;color:#a08b8e}.timeline-row.is-selected{box-shadow:inset 0 0 0 1px #c07b8c}.year-animal{display:block;font-size:.52rem!important;color:#a38e91}.love-bars button{padding:2px 0}.love-bars{gap:4px}@media(max-width:400px){.timeline-row{grid-template-columns:62px minmax(0,1fr);gap:8px;padding:10px}.timeline-date small{font-size:.58rem}.timeline-signals>b{font-size:.72rem}.timeline-copy>p{font-size:.73rem}.love-bars{gap:3px}}
</style>
