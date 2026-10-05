import { describe, expect, it } from 'vitest'
import { normalizeProfileDetails } from './profile-details'
import { canReadBazi } from './profile-readiness'
import { birthDateDescription } from './birth-display'

describe('optional profile details and readiness', () => {
  it('requires explicit consent before storing blood type and excludes extra client fields', () => {
    expect(() => normalizeProfileDetails({ bloodType: 'A' })).toThrow()
    const details = normalizeProfileDetails({ bloodType: 'A', bloodConsent: true, relationshipStatus: 'single', planId: 'premium' }, new Date('2026-10-05T00:00:00Z'))
    expect(details.bloodConsentAt).toBe('2026-10-05T00:00:00.000Z')
    expect(details).not.toHaveProperty('planId')
    expect(() => normalizeProfileDetails({ bloodType: 'X', bloodConsent: true })).toThrow()
    expect(() => normalizeProfileDetails({ relationshipStatus: 'invalid' })).toThrow()
  })
  it('clears blood type and consent when unspecified', () => {
    const cleared = normalizeProfileDetails({ bloodType: '', bloodConsent: false })
    expect(cleared.bloodType).toBe('')
    expect(cleared.bloodConsentAt).toBeNull()
    expect(cleared.consentVersion).toBeNull()
  })
  it('blocks all Bazi readings for unknown time or unspecified sex', () => {
    const profile = { birthDate: '26/08/1989', birthTime: '11:30', gender: 'male' }
    expect(canReadBazi(profile)).toBe(true)
    expect(canReadBazi({ ...profile, birthTime: '' })).toBe(false)
    expect(canReadBazi({ ...profile, gender: 'unspecified' })).toBe(false)
  })
  it('shows Buddhist years and distinguishes Bazi years at Li Chun', () => {
    expect(birthDateDescription('26/08/1989')).toMatchObject({ label: '26 สิงหาคม 2532', weekday: 'วันเสาร์', animal: 'มะเส็ง' })
    expect(birthDateDescription('01/01/1992').animal).toBe('มะแม')
    expect(birthDateDescription('02/04/1992').animal).toBe('วอก')
    expect(birthDateDescription('31/02/2000')).toBeNull()
  })
})
