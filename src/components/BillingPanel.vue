<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { billingRequest, trustedBillingUrl } from '../services/billing-api'
const props = defineProps({ idToken: { type: String, default: '' }, product: { type: String, default: null }, local: Boolean, promptpayOnly: Boolean, advanceStartsAt: { type: String, default: null } })
const emit = defineEmits(['refresh-account', 'back'])
const paymentMethod = ref('promptpay')
const status = ref(null)
const busy = ref(false)
const error = ref('')
const labels = { monthly: 'Premium รายเดือน · 149 บาท/เดือน', yearly: 'Premium รายปี · 999 บาท/ปี', comparison: 'เครดิตเปรียบเทียบ 5 คน · 59 บาท' }
const subscriptionLabels = { active: 'กำลังเป็นสมาชิก', past_due: 'ชำระรอบล่าสุดไม่สำเร็จ กรุณาตรวจสอบบัตร', unpaid: 'ยังไม่ได้ชำระเงิน', canceled: 'ยกเลิกแล้ว', incomplete: 'ยังสมัครไม่เสร็จ', incomplete_expired: 'รายการสมัครหมดเวลา', trialing: 'ช่วงทดลอง', paused: 'พักสมาชิก' }
function dateLabel(value) { return new Intl.DateTimeFormat('th-TH', { timeZone: 'Asia/Bangkok', dateStyle: 'medium' }).format(new Date(value)) }
function isRenewalCanceled(subscription) { return subscription.renewalCanceled ?? (subscription.cancelAtPeriodEnd || Boolean(subscription.cancelAt)) }
async function refresh() {
  if (!props.idToken || busy.value) return
  busy.value = true
  error.value = ''
  try {
    status.value = await billingRequest({ idToken: props.idToken, action: 'status' })
    emit('refresh-account', status.value)
  } catch (e) { error.value = e.message; status.value = null; emit('refresh-account', null) }
  finally { busy.value = false }
}
async function openStripe(action) {
  if (busy.value) return
  busy.value = true
  error.value = ''
  try {
    const response = await billingRequest({ idToken: props.idToken, action, product: action === 'checkout' ? props.product : undefined, paymentMethod: action === 'checkout' ? paymentMethod.value : undefined })
    window.location.assign(trustedBillingUrl(response.url))
  } catch (e) { error.value = e.message }
  finally { busy.value = false }
}
function refreshWhenVisible() { if (document.visibilityState === 'visible') refresh() }
onMounted(() => {
  refresh()
  window.addEventListener('focus', refresh)
  window.addEventListener('pageshow', refresh)
  document.addEventListener('visibilitychange', refreshWhenVisible)
})
onBeforeUnmount(() => {
  window.removeEventListener('focus', refresh)
  window.removeEventListener('pageshow', refresh)
  document.removeEventListener('visibilitychange', refreshWhenVisible)
})
watch(() => props.idToken, refresh)
watch(() => props.product, () => { paymentMethod.value = 'promptpay'; error.value = '' })
</script>

<template>
  <section class="billing-panel" aria-labelledby="billing-title">
    <button v-if="product" type="button" class="secondary" @click="emit('back')">← กลับไปเลือกแพ็กเกจ</button>
    <h2 id="billing-title">{{ product ? 'ชำระเงิน · ' + labels[product] : 'การชำระเงินและต่ออายุ' }}</h2>
    <p class="test-badge">โหมดทดสอบเท่านั้น · ยังไม่รับเงินจริง</p>
    <p v-if="local">บัญชีจำลองบน localhost ยังจ่ายผ่าน Stripe ไม่ได้ ต้องใช้บัญชี LINE และตั้งค่าระบบทดสอบฝั่งเซิร์ฟเวอร์ก่อน</p>
    <p v-if="error" role="alert">{{ error }}</p>
    <div v-if="product" class="checkout-choice">
      <h3>เลือกวิธีชำระเงิน</h3>
      <div class="payment-methods" role="group" aria-label="วิธีชำระเงิน">
        <button type="button" class="method" :aria-pressed="paymentMethod === 'promptpay'" @click="paymentMethod = 'promptpay'"><i class="pi pi-qrcode" aria-hidden="true" /><strong>PromptPay</strong><small>สแกน QR · ชำระครั้งเดียว</small></button>
        <button type="button" class="method" :disabled="promptpayOnly" :aria-pressed="paymentMethod === 'card'" @click="paymentMethod = 'card'"><i class="pi pi-credit-card" aria-hidden="true" /><strong>บัตรเครดิต / เดบิต</strong><small>{{ promptpayOnly ? 'เปลี่ยนได้เมื่อสมาชิกเดิมหมดอายุ' : product === 'comparison' ? 'ชำระครั้งเดียว' : 'ต่ออายุอัตโนมัติ' }}</small></button>
      </div>
      <p v-if="product === 'comparison'">ชำระครั้งเดียว ได้เครดิต 5 คน ไม่หมดอายุ ใช้โควตาสมาชิกก่อน</p>
      <p v-else-if="paymentMethod === 'promptpay'">ใช้ Premium {{ product === 'monthly' ? '1 เดือน' : '1 ปี' }} ไม่ต่ออายุและไม่ตัดเงินอัตโนมัติ หากซื้อแพ็กเกจเดิมเพิ่มขณะยังมีสิทธิ์ ระบบจะเพิ่มเวลาจากวันหมดอายุเดิม</p>
      <p v-else>ต่ออายุอัตโนมัติและเรียกเก็บตามรอบที่เลือก จนกว่าจะยกเลิก ยกเลิกการต่ออายุได้โดยใช้สิทธิ์ต่อจนจบรอบที่ชำระแล้ว</p>
      <div v-if="advanceStartsAt" class="advance-notice" role="note">
        <strong>ซื้อรายปีล่วงหน้า · จ่าย 999 บาทวันนี้</strong>
        <p>รายปีเริ่ม {{ dateLabel(advanceStartsAt) }} หลังรายเดือนสิ้นสุด โดยยังใช้สิทธิ์รายเดือนจนถึงวันนั้น ระบบจะยกเลิกต่ออายุรายเดือนเมื่อชำระสำเร็จ</p>
        <p v-if="paymentMethod === 'card'">ปีแรกชำระครบแล้ว จะเรียกเก็บรายปีครั้งถัดไปเมื่อสิ้นสุดปีที่ซื้อไว้ ไม่เรียกเก็บซ้ำในวันเริ่มรายปี</p>
      </div>
      <button class="pay-button" type="button" :disabled="busy || local || !status?.enabled" @click="openStripe('checkout')">{{ busy ? 'กำลังทำรายการ…' : paymentMethod === 'promptpay' ? 'ไปสแกน QR PromptPay' : 'ไปชำระด้วยบัตร' }}</button>
    </div>
    <template v-if="status?.enabled && !product">
      <div v-for="(subscription, index) in status.subscriptions" :key="index" class="subscription-status" :class="{ 'renewal-off': isRenewalCanceled(subscription) && subscription.status !== 'canceled' }" role="status">
        <template v-if="isRenewalCanceled(subscription) && subscription.status !== 'canceled'">
          <strong><i class="pi pi-calendar-times" aria-hidden="true" /> ยกเลิกต่ออายุแล้ว</strong>
          <p v-if="subscription.cancelAt && subscription.periodEnd && subscription.cancelAt > subscription.periodEnd">กำหนดยกเลิกวันที่ {{ dateLabel(subscription.cancelAt * 1000) }} ก่อนถึงวันนั้นอาจมีการเรียกเก็บตามรอบเดิม</p>
          <p v-else>ระบบจะไม่ต่ออายุสมาชิกอัตโนมัติในรอบถัดไป</p>
          <p v-if="subscription.periodEnd && ['active', 'trialing'].includes(subscription.status)">ยังใช้ Premium ได้ถึง <b>{{ dateLabel(subscription.periodEnd * 1000) }}</b></p>
          <p v-else>ตรวจวันสิ้นสุดสิทธิ์ที่ชำระแล้วในส่วนสมาชิกของฉันด้านบน</p>
          <small>เครดิตซื้อเพิ่มยังอยู่ ไม่ถูกลบจากการยกเลิกต่ออายุ</small>
        </template>
        <template v-else>
          <template v-if="subscription.annualAdvance && subscription.status === 'trialing'">
            <strong>รายปีที่ชำระล่วงหน้า · เปิดต่ออายุรายปี</strong>
            <p v-if="subscription.nextBillAt">เรียกเก็บรายปีครั้งถัดไป {{ dateLabel(subscription.nextBillAt * 1000) }}</p>
          </template>
          <strong v-else>{{ subscription.status === 'active' ? 'เปิดต่ออายุอัตโนมัติ' : subscriptionLabels[subscription.status] || 'กรุณาตรวจสอบสถานะใน Stripe' }}</strong>
          <p v-if="subscription.periodEnd && !(subscription.annualAdvance && subscription.status === 'trialing')">{{ subscription.status === 'active' ? 'รอบถัดไป' : 'สิ้นสุดรอบ' }} {{ dateLabel(subscription.periodEnd * 1000) }}</p>
        </template>
      </div>
      <button v-if="status.hasCustomer && status.subscriptions.length" type="button" :disabled="busy" @click="openStripe('portal')">จัดการบัตร / ยกเลิกต่ออายุ / ใบเสร็จ</button>
      <h3>ประวัติการชำระที่ยืนยันแล้ว</h3>
      <p v-if="!status.payments.length">ยังไม่มีรายการชำระที่ยืนยันแล้ว</p>
      <ul v-else>
        <li v-for="payment in status.payments" :key="payment.id"><span>{{ labels[payment.product] }}<small>{{ dateLabel(payment.created_at) }} · {{ payment.payment_method === 'promptpay' ? 'PromptPay' : 'บัตร' }} · รายการทดสอบ</small></span><strong>{{ (payment.amount / 100).toLocaleString('th-TH') }} บาท</strong></li>
      </ul>
      <p>หลังกลับจาก Stripe ให้กดตรวจสอบอีกครั้ง สิทธิ์จะเปิดเมื่อระบบได้รับการยืนยันการชำระแล้ว ไม่ใช่เพียงกลับมาที่หน้านี้</p>
    </template>
    <button v-if="idToken" class="secondary" type="button" :disabled="busy" @click="refresh">{{ busy ? 'กำลังตรวจสอบ…' : 'ตรวจสอบการชำระและสิทธิ์อีกครั้ง' }}</button>
  </section>
</template>

<style scoped>
.billing-panel { margin: 20px 0; padding: 22px; background: #fffcf7; border: 1px solid #e5ddd0; border-radius: 20px; color: #493f35; }
h2 { margin: 0; font-size: 1.2rem; }
.secondary + h2 { margin-top: 20px; }
.payment-methods { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
button.method { background: #fffcf7; color: #493f35; border: 2px solid #ded8cb; text-align: left; }
button.method[aria-pressed="true"] { background: #e8efdf; border-color: #365640; }
.method i, .method strong { display: block; margin-bottom: 8px; }
.pay-button { width: 100%; margin-top: 12px; }
.advance-notice { padding: 16px; border: 1px solid #bccbb1; border-radius: 12px; background: #fffcf7; margin-top: 14px; }
@media(max-width: 430px) { .payment-methods { grid-template-columns: 1fr; } }
h3 { font-size: 1rem; }
p { font-size: .9rem; line-height: 1.8; }
.test-badge { color: #8c621d; }
.subscription-status { padding: 18px; margin: 16px 0; border: 1px solid #d4ddce; border-radius: 14px; background: #f0f3eb; }
.subscription-status.renewal-off { background: #fff3db; border: 2px solid #b8842e; color: #624510; }
.subscription-status > strong { display: block; font-size: 1.1rem; }
.subscription-status p { margin: 10px 0; }
.checkout-choice { padding: 16px; border-radius: 14px; background: #f0f3eb; margin: 16px 0; }
button { padding: 12px 16px; border: 0; border-radius: 10px; background: #365640; color: #fff; cursor: pointer; font: inherit; max-width: 100%; }
button:disabled { opacity: .6; cursor: wait; }
button:focus-visible { outline: 3px solid #8ba184; outline-offset: 3px; }
button.secondary { background: #eee7db; color: #493f35; margin-top: 12px; }
ul { list-style: none; padding: 0; }
li { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 10px; padding: 12px 0; border-bottom: 1px solid #e5ddd0; font-size: .85rem; }
small { display: block; margin-top: 5px; color: #786c5d; }
</style>
