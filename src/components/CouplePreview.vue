<script setup>
import {computed,reactive,ref,toRaw,watch} from 'vue'
import MobileDateTimePicker from './MobileDateTimePicker.vue'
import {COUPLE_PREVIEW_KEY,relationshipChoices,readCouplePeople,validateCouplePerson,rankCouples} from '../services/couple-preview.js'
const props=defineProps({input:Object,remoteReader:Function,savedReader:Function,storageKey:{type:String,default:COUPLE_PREVIEW_KEY}})
const emit=defineEmits(['profile'])
const busy=ref(false)
const people=ref([]),storageError=ref(''),error=ref(''),editing=ref(false),selected=ref(null),removed=ref(null)
try{people.value=readCouplePeople(window.localStorage,props.storageKey)}catch{storageError.value='อ่านรายชื่อในเครื่องไม่ได้ กรุณาตรวจพื้นที่จัดเก็บของเบราว์เซอร์ก่อนเพิ่มข้อมูล'}
const blank=()=>({id:null,name:'',relationship:'partner',birthDate:'',birthTime:'',gender:'unspecified',timezoneId:'Asia/Bangkok'})
const form=reactive(blank())
const ranked=computed(()=>{
 if(!props.remoteReader)return rankCouples(toRaw(props.input),people.value.map(p=>toRaw(p)))
 return people.value.map(person=>{
  const reading=props.savedReader?.(person)
  const focus=relationshipChoices.find(r=>r.value===person.relationship)?.focus||'love'
  return {person,result:reading?{...(reading.topicResults?.[focus]||reading),score:reading.topicResults?.overview?.score||reading.score}:null,notice:'กดดูคำอ่านเพื่อใช้สิทธิ์เปรียบเทียบตามแพ็กเกจ'}
 }).sort((a,b)=>(b.result?.score?.value??-1)-(a.result?.score?.value??-1))
})
async function view(person){
 selected.value=person.id;editing.value=false;error.value=''
 if(!props.remoteReader||props.savedReader?.(person)||busy.value)return
 if(!person.birthTime||!['male','female'].includes(person.gender)){error.value='เพิ่มเวลาเกิดและเพศก่อนอ่านปาจื้อ';return}
 busy.value=true
 try{await props.remoteReader(person)}catch(cause){error.value=cause.message}finally{busy.value=false}
}
const podium=computed(()=>[1,0,2].map(index=>({rank:index+1,entry:ranked.value.filter(p=>p.result?.score?.value!=null)[index]})))
const current=computed(()=>ranked.value.find(p=>p.person.id===selected.value))
const relation=value=>relationshipChoices.find(r=>r.value===value)?.label||'คนใกล้ตัว'
function edit(person){if(storageError.value)return;Object.assign(form,person||blank());error.value='';editing.value=true}
function persist(next){if(storageError.value)return false;try{window.localStorage.setItem(props.storageKey,JSON.stringify(next));people.value=next;return true}catch{error.value='บันทึกในเครื่องไม่ได้ กรุณาตรวจพื้นที่จัดเก็บของเบราว์เซอร์';return false}}
async function save(){
 if(busy.value||storageError.value)return
 error.value='';busy.value=true
 try{
  const person=validateCouplePerson({...form,id:form.id||crypto.randomUUID()})
  if(props.remoteReader&&person.birthTime&&['male','female'].includes(person.gender))await props.remoteReader(person)
  const next=form.id?people.value.map(p=>p.id===form.id?person:p):[...people.value,person]
  if(persist(next)){selected.value=person.id;editing.value=false}
 }catch(cause){error.value=cause.message}finally{busy.value=false}
}
function remove(){if(!current.value)return;const person=current.value.person;if(persist(people.value.filter(p=>p.id!==person.id))){removed.value=person;selected.value=null}}
function undo(){if(removed.value&&persist([...people.value,removed.value]))removed.value=null}
watch(()=>props.input,()=>{error.value=''}, {deep:true})
</script>
<template>
<section class="couple-preview" aria-label="ดวงคู่">
<header><small>เรียนรู้ความสัมพันธ์ของคุณสองคน</small><h2>ดวงคู่</h2><p>จุดที่ส่งเสริมกัน และเรื่องที่ควรคุยให้เข้าใจ</p></header>
<div class="couple-body">
<div class="podium"><button v-for="slot in podium" :key="slot.rank" :class="{winner:slot.rank===1}" :aria-label="slot.entry?`อันดับ ${slot.rank} ${slot.entry.person.name}`:`อันดับ ${slot.rank} ยังว่าง เพิ่มคน`" @click="slot.entry?view(slot.entry.person):edit()"><span class="rank">{{ slot.rank===1?'♛':slot.rank }}</span><span class="avatar">{{ slot.entry?.person.name.slice(0,1)||'♡' }}</span><b>{{ slot.entry?.person.name||'ยังว่าง' }}</b><strong>{{ slot.entry?.result.score.value??'—' }}</strong><small>{{ slot.entry?relation(slot.entry.person.relationship):'เพิ่มคนใกล้ตัว' }}</small></button></div>
<p class="fine">อันดับจากคะแนนภาพรวมของสูตรเรา ใช้เกณฑ์เดียวกันทุกคน ไม่ใช่เปอร์เซ็นต์ความสำเร็จของความสัมพันธ์</p>
<button class="add-person" :disabled="Boolean(storageError)" @click="edit()">＋ เพิ่มคน · ใส่วันเกิดเอง</button>
<p class="fine">ชื่อและข้อมูลเกิดเก็บในเบราว์เซอร์เครื่องนี้ คำอ่านออนไลน์ใช้สิทธิ์เปรียบเทียบตามแพ็กเกจ ไม่มีการส่งคำเชิญ LINE</p>
<p v-if="busy" role="status">กำลังเปิดคำอ่าน…</p><p v-if="storageError" role="alert">{{ storageError }}</p><p v-if="error" role="alert" class="error">{{ error }}</p>
<div v-if="removed" role="status" class="restore">ลบ {{ removed.name }} แล้ว <button @click="undo">เลิกทำ</button></div>
<form v-if="editing" class="person-form card" @submit.prevent="save">
<h3>{{ form.id?'แก้ไขข้อมูล':'เพิ่มคนในดวงคู่' }}</h3>
<label>ชื่อเรียก<input v-model="form.name" maxlength="40" placeholder="เช่น แฟน เพื่อน" required/></label>
<fieldset><legend>เป็นอะไรกับคุณ</legend><div class="relationship-options"><label v-for="r in relationshipChoices" :key="r.value"><input v-model="form.relationship" type="radio" name="couple-relationship" :value="r.value"/>{{ r.label }}</label></div></fieldset>
<div class="field"><span>วันเกิด</span><MobileDateTimePicker v-model="form.birthDate" type="date" placeholder="เลือกวันเกิด" :birth-time="form.birthTime"/></div>
<div class="field"><span>เวลาเกิด (ไม่ทราบเว้นว่างได้)</span><MobileDateTimePicker v-model="form.birthTime" type="time" allow-empty placeholder="เลือกเวลาเกิด"/></div>
<label>เพศ<select v-model="form.gender"><option value="unspecified">ไม่ระบุ</option><option value="female">หญิง</option><option value="male">ชาย</option></select></label>
<label>เขตเวลา<select v-model="form.timezoneId"><option value="Asia/Bangkok">กรุงเทพฯ ประเทศไทย</option><option value="Asia/Shanghai">จีน / เซี่ยงไฮ้</option><option value="Asia/Tokyo">ญี่ปุ่น / โตเกียว</option><option value="Asia/Singapore">สิงคโปร์</option><option value="Europe/London">ลอนดอน</option><option value="America/New_York">นิวยอร์ก</option></select></label>
<p class="fine">บันทึกได้แม้ไม่ทราบเวลาเกิดหรือไม่ระบุเพศ แต่ยังไม่แสดงคะแนนปาจื้อจนข้อมูลครบ</p><div class="actions"><button type="button" @click="editing=false">ยกเลิก</button><button type="submit" :disabled="busy">{{ busy ? 'กำลังอ่าน…' : 'บันทึกและดูดวงคู่' }}</button></div>
</form>
<template v-else>
<section v-if="current" class="card couple-result"><div class="result-heading"><div><small>{{ relation(current.person.relationship) }}</small><h3>คุณ × {{ current.person.name }}</h3></div><button @click="edit(current.person)">แก้ไข</button></div>
<template v-if="current.result"><div class="score-circle"><strong>{{ current.result.score.value??'—' }}</strong><small>/ 100</small></div><h4>{{ current.result.score.label }}</h4><p>{{ current.result.summary }}</p>
<div class="direction-grid"><div><small>คุณส่งเสริม {{ current.person.name }}</small><b>{{ current.result.score.forward.value??'—' }} / 100</b></div><div><small>{{ current.person.name }} ส่งเสริมคุณ</small><b>{{ current.result.score.reverse.value??'—' }} / 100</b></div></div>
<details v-for="part in [{key:'connection',title:'ความสัมพันธ์ของคุณสองคน'},{key:'communication',title:'คุยกันอย่างไรให้เข้าใจ'},{key:'shouldDo',title:'สิ่งที่ช่วยให้ไปต่อ'},{key:'shouldAvoid',title:'สิ่งที่ควรระวัง'}]" :key="part.key"><summary>{{ part.title }}</summary><p>{{ current.result[part.key] }}</p></details>
<details><summary>ดูที่มาของคะแนน</summary><section v-for="direction in ['forward','reverse']" :key="direction"><h4>{{ direction==='forward'?'คุณส่งเสริมอีกฝ่าย':'อีกฝ่ายส่งเสริมคุณ' }}</h4><div v-for="part in current.result.score[direction].components" :key="part.label"><b>{{ part.label }} · {{ part.value }}/100 · น้ำหนัก {{ part.weight }}%</b><p>{{ part.explanation }}</p></div></section><p>{{ current.result.score.note || 'คะแนนเป็นเกณฑ์เปรียบเทียบของแอป ไม่ใช่คำตัดสินว่าควรคบหรือเลิกคบ' }}</p></details></template>
<div v-else><p>{{ current.notice }}</p><button v-if="!input?.birthTime || !['male','female'].includes(input?.gender)" @click="emit('profile')">แก้ไขข้อมูลเกิดของฉัน</button><button v-else-if="remoteReader && current.person.birthTime && ['male','female'].includes(current.person.gender)" :disabled="busy" @click="view(current.person)">ดูคำอ่าน</button><button v-else @click="edit(current.person)">เพิ่มข้อมูลคนนี้</button></div><button class="delete-person" @click="remove">ลบคนนี้จากรายการ</button></section>
<section v-if="ranked.length" class="card"><h3>คนที่บันทึกไว้ <small>{{ ranked.length }} คน</small></h3><button v-for="entry in ranked" :key="entry.person.id" class="saved-person" :aria-pressed="selected===entry.person.id" @click="view(entry.person)"><span><b>{{ entry.person.name }}</b><small>{{ relation(entry.person.relationship) }}</small></span><strong>{{ entry.result?.score?.value??'—' }} <small>{{ entry.result?.score?.value!=null?'/ 100':'ข้อมูลยังไม่ครบ' }}</small></strong></button></section>
</template>
</div></section>
</template>
<style scoped>
.couple-preview{color:#51413c;max-width:860px;margin:auto;min-width:0}.couple-preview>header{padding:24px;color:#fff8f1;background:linear-gradient(135deg,#792b40,#b47779)}header h2{margin:8px 0;font-size:1.8rem}header p,header small{font-size:.8rem;opacity:.85}.couple-body{padding:18px;background:#faf6f2}.podium{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));align-items:end;gap:9px;margin:16px 0}.podium button{display:flex;flex-direction:column;align-items:center;gap:8px;background:#fffdfa;border:1px solid #e8d9d1;border-radius:22px;padding:18px 6px;color:inherit;min-width:0;cursor:pointer}.podium .winner{padding-top:30px;border-color:#c08f62;background:#fff6e6}.rank{color:#b68c51}.avatar{border-radius:50%;background:#f1e0e4;color:#9a5469;width:46px;height:46px;display:grid;place-items:center;font-size:1.3rem}.podium b{font-size:.85rem;max-width:100%;overflow-wrap:anywhere}.podium strong{font-size:1.6rem;color:#853549}.podium small{font-size:.63rem;color:#a2877a}.fine{font-size:.72rem;line-height:1.8;color:#9b847a}.add-person{width:100%;padding:14px;border:0;border-radius:14px;background:#853549;color:white;font:inherit;cursor:pointer}.card{padding:20px;background:#fffdfa;border:1px solid #e8ddd5;border-radius:20px;margin:18px 0;min-width:0}.card h3{margin:0 0 18px;font-size:1.1rem}.person-form label,.field{display:grid;gap:8px;margin:14px 0;font-size:.85rem}.person-form input:not([type=radio]),select{width:100%;box-sizing:border-box;border:1px solid #e3d7ce;border-radius:12px;background:white;padding:12px;color:inherit;font:inherit;min-width:0}.person-form fieldset{padding:0;border:0;min-width:0}.person-form legend{font-size:.85rem}.relationship-options{display:grid;grid-template-columns:1fr 1fr;gap:7px}.relationship-options label{display:flex;align-items:center;gap:7px;padding:10px 5px;margin:0;border:1px solid #eaded7;border-radius:10px;font-size:.75rem}.relationship-options label:has(input:checked){background:#f5e3e8;border-color:#ab657b}.actions{display:flex;gap:8px}.actions button,.result-heading button,.restore button{padding:10px 16px;border:1px solid #dfd1c6;border-radius:10px;background:#f8f0e9;color:inherit;font:inherit;font-size:.8rem;cursor:pointer}.actions button[type=submit]{background:#853549;color:white;flex:1}.result-heading{display:flex;justify-content:space-between;align-items:center;gap:10px}.result-heading h3{margin:5px 0;overflow-wrap:anywhere}.result-heading small{color:#a2877a}.score-circle{width:114px;height:114px;border-radius:50%;border:5px solid #cd97a5;display:grid;align-content:center;justify-items:center;margin:22px auto;background:#fff3f5}.score-circle strong{font-size:2.5rem}.score-circle small{font-size:.7rem;color:#a2877a}.couple-result>h4{text-align:center}.couple-result p{font-size:.85rem;line-height:1.85}.direction-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:18px 0}.direction-grid>div{background:#f8edef;border-radius:12px;padding:12px;text-align:center;min-width:0}.direction-grid small{display:block;font-size:.7rem;overflow-wrap:anywhere}.direction-grid b{display:block;margin-top:8px;color:#853549}.couple-result details{border-top:1px solid #eadfd6;padding:14px 0}.couple-result summary{cursor:pointer;font-size:.85rem;font-weight:600}.couple-result details b{font-size:.75rem}.delete-person{background:none;border:0;color:#a47777;font:inherit;font-size:.7rem;padding:12px 0;cursor:pointer}.saved-person{display:flex;justify-content:space-between;gap:12px;width:100%;padding:14px 0;border:0;border-top:1px solid #eee3dc;background:none;color:inherit;text-align:left;font:inherit;cursor:pointer}.saved-person span{min-width:0;overflow-wrap:anywhere}.saved-person small{display:block;font-size:.68rem;color:#a2877a}.saved-person strong{text-align:right;color:#853549;flex-shrink:0}.saved-person[aria-pressed=true]{background:#fbf0f3}.card h3 small{font-size:.75rem;color:#a2877a}.restore{font-size:.8rem;margin:12px 0}.error{color:#a32e42}.couple-preview button:focus-visible{outline:3px solid #b89153;outline-offset:3px}@media(max-width:360px){.couple-body{padding:12px}.card{padding:16px 12px}.podium{gap:6px}.relationship-options label{font-size:.7rem}}
</style>
