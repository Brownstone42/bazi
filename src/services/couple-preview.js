import { buildComparisonReading } from './comparison-reading.js'
import { calculateChart } from './bazi.js'
export const COUPLE_PREVIEW_KEY='identity60-preview:couple-people-v1'
export const relationshipChoices=[{value:'partner',label:'คู่รัก',focus:'love'},{value:'interest',label:'คนที่สนใจ',focus:'love'},{value:'parent',label:'ครอบครัว / ญาติ',focus:'family'},{value:'friend',label:'เพื่อน',focus:'friendship'},{value:'boss',label:'หัวหน้า',focus:'work'},{value:'subordinate',label:'ลูกน้อง',focus:'work'},{value:'colleague',label:'เพื่อนร่วมงาน',focus:'work'}]
export function readCouplePeople(storage,key=COUPLE_PREVIEW_KEY){const raw=storage.getItem(key);if(!raw)return [];const items=JSON.parse(raw);if(!Array.isArray(items)||items.some(p=>!p||typeof p.id!=='string'||typeof p.name!=='string'||typeof p.birthDate!=='string'))throw new Error('อ่านรายชื่อเดิมไม่ได้ จึงยังไม่เขียนทับข้อมูล');return items}
export function validateCouplePerson(person){if(!person.name?.trim())throw new Error('กรุณากรอกชื่อเรียก');if(!person.birthDate)throw new Error('กรุณาเลือกวันเกิด');if(!['male','female','unspecified'].includes(person.gender))throw new Error('กรุณาเลือกเพศ');calculateChart({...person,birthTime:person.birthTime||'12:00',gender:person.gender==='unspecified'?'male':person.gender});return {...person,name:person.name.trim()}}
export function coupleReading(owner,person){
 if(!owner?.birthTime||!['male','female'].includes(owner.gender)||!person.birthTime||!['male','female'].includes(person.gender))return {person,result:null,notice:'เพิ่มเวลาเกิดและเพศของทั้งสองคนเพื่ออ่านปาจื้อดวงคู่'}
 const focus=relationshipChoices.find(r=>r.value===person.relationship)?.focus||'love'
 const reading=buildComparisonReading(owner,{...person,focus})
 return {person,result:{...reading,score:reading.topicResults.overview.score},notice:''}
}
export function rankCouples(owner,people){return people.map(person=>{try{return coupleReading(owner,person)}catch{return {person,result:null,notice:'กรุณาตรวจข้อมูลเกิดของคนนี้อีกครั้ง'}}}).sort((a,b)=>(b.result?.score?.value??-1)-(a.result?.score?.value??-1))}
