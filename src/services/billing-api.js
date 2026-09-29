export async function billingRequest({ idToken, action, product, fetchImpl = fetch }) {
  if (!idToken) throw new Error('กรุณาเข้าสู่ระบบ LINE เพื่อจัดการการชำระเงิน')
  const response = await fetchImpl('/api/billing-session', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ idToken, action, ...(product ? { product } : {}) })
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.error || 'เชื่อมระบบชำระเงินไม่ได้ กรุณาลองใหม่')
  return payload
}
export function trustedBillingUrl(value) {
  const url = new URL(value)
  if (url.protocol !== 'https:' || !['checkout.stripe.com', 'billing.stripe.com'].includes(url.hostname)) throw new Error('ลิงก์ชำระเงินไม่ถูกต้อง')
  return url.href
}

