<script setup>
import { computed } from 'vue'
const props = defineProps({ planId: { type: String, default: 'free' }, billingCycle: { type: String, default: 'monthly' }, paymentMethod: { type: String, default: 'card' }, expiresAt: { type: String, default: null }, nextMembership: { type: Object, default: null } })
defineEmits(['select'])
const active = computed(() => props.planId === 'premium' && Boolean(props.expiresAt && new Date(props.expiresAt) > new Date()))
const packages = [
  { id: 'monthly', title: 'Premium รายเดือน', price: '149', period: 'เดือน', horizon: 30, quota: 5 },
  { id: 'yearly', title: 'Premium รายปี', price: '999', period: 'ปี', horizon: 90, quota: 10 }
]
const current = id => active.value && props.billingCycle === id
const groups = computed(() => [
  { id: 'current', packages: packages.filter(pack => current(pack.id)), free: !active.value },
  { id: 'choices', packages: packages.filter(pack => !current(pack.id)), free: active.value }
])
const advance = id => active.value && props.billingCycle === 'monthly' && id === 'yearly' && !props.nextMembership
const blocked = id => Boolean(props.nextMembership) || (active.value && !advance(id) && !(current(id) && props.paymentMethod === 'promptpay'))
const date = value => new Intl.DateTimeFormat('th-TH', { timeZone: 'Asia/Bangkok', dateStyle: 'long' }).format(new Date(value))
</script>

<template>
  <div class="package-selection">
    <template v-for="group in groups" :key="group.id">
      <slot v-if="group.id === 'choices'" name="heading" />
      <div class="packages" :class="{ 'current-package': group.id === 'current' }">
    <article v-for="pack in group.packages" :key="pack.id" class="package" :class="{ current: current(pack.id) }">
      <div class="topline"><span>{{ pack.title }}</span><b v-if="current(pack.id)">แพ็กเกจปัจจุบัน</b><b v-else-if="pack.id === 'yearly'">ประหยัด 789 บาท/ปี</b></div>
      <h3>{{ pack.price }} <small>บาท / {{ pack.period }}</small></h3>
      <p>{{ pack.id === 'monthly' ? 'วางแผนเรื่องสำคัญในแต่ละเดือน' : 'วางแผนไกลขึ้น พร้อมโควตาเปรียบเทียบมากขึ้น' }}</p>
      <ul><li>ปฏิทินวันนี้ + ล่วงหน้า {{ pack.horizon }} วัน</li><li>เปรียบเทียบ {{ pack.quota }} คน / เดือน</li><li>พื้นดวงและถนนชีวิต 10 ปีทุกช่วง</li></ul>
      <p v-if="current(pack.id)" class="state">{{ paymentMethod === 'promptpay' ? 'PromptPay · จ่ายครั้งเดียว ไม่ต่ออายุอัตโนมัติ' : 'สมาชิกแบบชำระผ่านบัตร' }}</p>
      <p v-if="advance(pack.id)" class="state">เริ่มรายปี {{ date(expiresAt) }} หลังรายเดือนสิ้นสุด</p>
      <p v-if="nextMembership && pack.id === 'yearly'" class="state">ซื้อไว้ล่วงหน้าแล้ว · เริ่ม {{ date(nextMembership.startsAt) }}</p>
      <button type="button" :disabled="blocked(pack.id)" @click="$emit('select', pack.id)">{{ nextMembership ? pack.id === 'yearly' ? 'ซื้อรายปีล่วงหน้าแล้ว' : 'ใช้รายเดือนจนถึงวันเริ่มรายปี' : advance(pack.id) ? 'ซื้อรายปีล่วงหน้า' : current(pack.id) ? paymentMethod === 'promptpay' ? 'ซื้อเพิ่มเพื่อขยายวันหมดอายุ' : 'กำลังใช้แพ็กเกจนี้' : active ? 'เปลี่ยนได้เมื่อสมาชิกเดิมหมดอายุ' : `เลือก${pack.title}` }}</button>
    </article>
    <article v-if="group.id === 'choices'" class="package credits"><div class="topline"><span>เครดิตเปรียบเทียบเพิ่ม</span><b>ซื้อแยกได้</b></div><h3>59 <small>บาท / 5 คน</small></h3><p>เครดิตไม่หมดอายุ ใช้โควตาสมาชิกที่เหลือก่อน</p><button type="button" @click="$emit('select', 'comparison')">ซื้อเครดิต 5 คน</button></article>
    <article v-if="group.free" class="package free"><div class="topline"><span>Free</span><b v-if="!active">แพ็กเกจปัจจุบัน</b></div><h3>ใช้ฟรี</h3><p>พื้นดวง · ถนนชีวิต 10 ปีทุกช่วง · ภาพรวมวันนี้ · เปรียบเทียบฟรีครั้งแรก 1 คน</p></article>
      </div>
    </template>
  </div>
</template>

<style scoped>
.packages { display: grid; gap: 18px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
.current-package { grid-template-columns: 1fr; margin-bottom: 24px; }
.package { display: flex; flex-direction: column; padding: 24px; background: #fffcf7; border: 1px solid #e2d9ca; border-radius: 20px; color: #493f35; }
.package.current { border: 2px solid #365640; background: #f3f5ed; }
.topline { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px; font-weight: 600; }
.topline b { padding: 4px 8px; font-size: .72rem; border-radius: 8px; background: #e5ebdf; color: #365640; }
h3 { margin: 20px 0 10px; font-size: 2rem; }
h3 small { font-size: .85rem; font-weight: 400; }
p, li { font-size: .9rem; line-height: 1.8; }
ul { padding-left: 20px; margin: 8px 0 18px; }
.state { color: #365640; }
button { margin-top: auto; width: 100%; min-height: 48px; padding: 12px; border: 0; border-radius: 12px; background: #365640; color: white; font: inherit; cursor: pointer; }
button:disabled { color: #776f63; background: #e9e4db; cursor: default; }
button:focus-visible { outline: 3px solid #8ba184; outline-offset: 3px; }
.free { background: #f5f1e9; }
@media(max-width: 640px) { .packages { grid-template-columns: 1fr; } .package { padding: 22px; } }
</style>
