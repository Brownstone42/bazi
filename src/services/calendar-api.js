export async function fetchPersonalCalendar({ idToken, year, month, focus, signal, fetchImpl = fetch }) {
  if (!idToken) throw new Error('กรุณาเข้าสู่ระบบ LINE ก่อนดูปฏิทิน')
  const response = await fetchImpl('/api/calendar', { method: 'POST', signal, cache: 'no-store', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ idToken, year, month, focus }) })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.error || 'โหลดปฏิทินไม่ได้ กรุณาลองใหม่')
  if (!payload.month?.days || !payload.plan || !payload.serverNow) throw new Error('ข้อมูลปฏิทินไม่ครบ กรุณาลองใหม่')
  return payload
}
