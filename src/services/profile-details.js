export const emptyProfileDetails = () => ({ bloodType: '', relationshipStatus: '', bloodConsent: false, timezoneUnknown: false })
export const bloodTypes = ['A', 'B', 'AB', 'O']
export const relationshipStatuses = [
  { label: 'โสด', value: 'single' }, { label: 'มีคนคุย', value: 'talking' },
  { label: 'มีแฟน', value: 'partner' }, { label: 'แต่งงานแล้ว', value: 'married' }, { label: 'อื่น ๆ', value: 'other' },
]

export function normalizeProfileDetails(value, now = new Date()) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('ข้อมูลโปรไฟล์ไม่ถูกต้อง')
  const bloodType = value.bloodType || ''
  const relationshipStatus = value.relationshipStatus || ''
  if (bloodType && !bloodTypes.includes(bloodType)) throw new Error('กรุ๊ปเลือดไม่ถูกต้อง')
  if (relationshipStatus && !relationshipStatuses.some(item => item.value === relationshipStatus)) throw new Error('สถานะไม่ถูกต้อง')
  if (bloodType && value.bloodConsent !== true) throw new Error('กรุณายินยอมให้เก็บกรุ๊ปเลือด หรือเลือกไม่ระบุ')
  return { bloodType, relationshipStatus, bloodConsent: Boolean(bloodType), bloodConsentAt: bloodType ? now.toISOString() : null, consentVersion: bloodType ? '2026-10-05' : null, timezoneUnknown: value.timezoneUnknown === true }
}
