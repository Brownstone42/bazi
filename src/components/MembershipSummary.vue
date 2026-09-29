<script setup>
import { computed } from 'vue'
import { calendarHorizon, comparisonBalance } from '../services/access-control'

const props = defineProps({
  planId: { type: String, default: 'free' },
  billingCycle: { type: String, default: 'monthly' },
  expiresAt: { type: String, default: null },
  includedUsed: { type: Number, default: 0 },
  purchasedCredits: { type: Number, default: 0 },
  local: Boolean,
  renewalCanceled: Boolean,
  now: { type: Date, default: () => new Date() }
})
defineEmits(['packages'])
const expired = computed(() => props.planId === 'premium' && props.expiresAt && !(new Date(props.expiresAt) > props.now))
const premium = computed(() => props.planId === 'premium' && !expired.value)
const label = computed(() => expired.value ? 'Premium หมดอายุแล้ว' : premium.value ? `Premium ${props.billingCycle === 'yearly' ? 'รายปี' : 'รายเดือน'}` : 'Free')
const quota = computed(() => comparisonBalance({ planId: props.planId, billingCycle: props.billingCycle, includedUsed: props.includedUsed, purchasedCredits: props.purchasedCredits }))
const horizon = computed(() => calendarHorizon({ planId: props.planId, billingCycle: props.billingCycle, premiumExpiresAt: props.expiresAt }, props.now))
const expiryLabel = computed(() => {
  if (!props.expiresAt) return 'ยังไม่มีข้อมูลวันหมดอายุ'
  const date = new Date(props.expiresAt)
  if (!Number.isFinite(date.getTime())) return 'ไม่สามารถอ่านวันหมดอายุได้'
  return new Intl.DateTimeFormat('th-TH', { timeZone: 'Asia/Bangkok', dateStyle: 'long', timeStyle: 'short' }).format(date)
})
</script>

<template>
  <section class="membership-summary" aria-labelledby="membership-title">
    <div class="membership-heading">
      <div><h2 id="membership-title">สมาชิกของฉัน</h2><p>{{ label }}</p></div>
      <button type="button" @click="$emit('packages')">ดูแพ็กเกจ</button>
    </div>
    <p v-if="local" class="membership-note">บัญชีทดสอบบนเครื่องนี้ · ปฏิทินเปิดทดลอง 90 วันและเปรียบเทียบได้โดยไม่หักสิทธิ์ ไม่ใช่สมาชิกที่ชำระเงินจริง</p>
    <p v-if="planId === 'premium'">{{ expired ? 'หมดอายุเมื่อ' : 'ใช้สิทธิ์ได้ถึง' }} {{ expiryLabel }} (เวลาไทย)</p>
    <div v-if="premium && renewalCanceled" class="renewal-canceled" role="status">
      <strong>ยกเลิกต่ออายุแล้ว</strong>
      <p>ยังใช้ Premium ได้ถึง {{ expiryLabel }} (เวลาไทย) หลังจากนั้นกลับเป็น Free โดยไม่ต่ออายุอัตโนมัติ</p>
    </div>
    <div class="membership-grid">
      <article><span>ปฏิทินตามแพ็กเกจ</span><strong>{{ horizon ? `วันนี้ + ล่วงหน้า ${horizon} วัน` : 'เฉพาะวันนี้' }}</strong></article>
      <article><span>โควตาเปรียบเทียบคงเหลือ</span><strong>{{ expired ? 'รออัปเดตสิทธิ์ Free' : `${quota.includedRemaining} / ${quota.includedLimit} คน` }}</strong><small v-if="premium">เริ่มโควตาใหม่วันที่ 1 ของทุกเดือน · ไม่สะสมข้ามเดือน</small><small v-else-if="!expired">สิทธิ์ฟรีครั้งแรก ไม่รีเซ็ตรายเดือน</small></article>
      <article><span>เครดิตซื้อเพิ่มคงเหลือ</span><strong>{{ quota.purchasedRemaining }} คน</strong><small>ไม่หมดอายุ · ใช้โควตาแพ็กเกจก่อน</small></article>
    </div>
    <p class="membership-note">ดูประวัติการซื้อและจัดการต่ออายุได้ที่หน้าแพ็กเกจ · ระบบชำระเงินยังเป็นโหมดทดสอบ</p>
  </section>
</template>

<style scoped>
.membership-summary { padding: 22px; margin: 20px 0; background: #fffcf7; border: 1px solid #e5ddd0; border-radius: 20px; color: #493f35; }
.membership-heading { display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap; }
h2 { margin: 0; font-size: 1.2rem; }
p { margin: 8px 0; line-height: 1.7; }
button { padding: 10px 16px; background: #365640; color: white; border: 0; border-radius: 10px; font: inherit; cursor: pointer; }
button:focus-visible { outline: 3px solid #8ba184; outline-offset: 3px; }
.membership-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr)); gap: 12px; margin-top: 16px; }
.renewal-canceled { padding: 16px; margin: 14px 0; border: 2px solid #b8842e; border-radius: 12px; background: #fff3db; color: #624510; }
.renewal-canceled strong { font-size: 1.05rem; }
.renewal-canceled p { font-size: .9rem; }
article { padding: 16px; background: #f3f2ea; border-radius: 12px; }
article span, article strong, article small { display: block; }
article span, article small, .membership-note { font-size: .8rem; color: #736657; line-height: 1.7; }
article strong { margin: 8px 0; }
</style>
