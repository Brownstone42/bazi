async function callLineSession({ idToken, payload = {}, fetchImpl = fetch }) {
  if (!idToken) throw new Error('ไม่พบข้อมูลยืนยันตัวตนจาก LINE')
  const response = await fetchImpl('/api/line-session', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ idToken, ...payload })
  })
  const responsePayload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(responsePayload.error || 'ไม่สามารถเชื่อมบัญชีผู้ใช้ได้')
  return responsePayload
}

export function syncLineAccount({ idToken, birthProfile, fetchImpl = fetch }) {
  return callLineSession({ idToken, payload: { action: 'sync', ...(birthProfile ? { birthProfile } : {}) }, fetchImpl })
}

export function reserveComparison({ idToken, comparisonProfile, fetchImpl = fetch }) {
  return callLineSession({
    idToken,
    payload: { action: 'reserveComparison', comparisonProfile },
    fetchImpl
  })
}

export function saveComparisonResult({ idToken, reportId, result, fetchImpl = fetch }) {
  return callLineSession({
    idToken,
    payload: { action: 'saveComparisonResult', reportId, result },
    fetchImpl
  })
}

export function birthProfileToForm(profile) {
  if (!profile?.birth_date) return null
  const [year, month, day] = profile.birth_date.split('-')
  return {
    birthDate: `${day}/${month}/${year}`,
    birthTime: String(profile.birth_time ?? '').slice(0, 5),
    gender: profile.gender,
    timezoneId: profile.timezone_id
  }
}
