export async function syncLineAccount({ idToken, birthProfile, fetchImpl = fetch }) {
  if (!idToken) throw new Error('ไม่พบข้อมูลยืนยันตัวตนจาก LINE')
  const response = await fetchImpl('/api/line-session', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ idToken, ...(birthProfile ? { birthProfile } : {}) })
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.error || 'ไม่สามารถเชื่อมบัญชีผู้ใช้ได้')
  return payload
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
