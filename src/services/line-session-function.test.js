import { describe, expect, it, vi } from 'vitest'
import {
  comparisonFingerprint,
  normalizeBirthProfile,
  normalizeComparisonProfile,
  verifyLineIdToken
} from '../../netlify/functions/line-session.mjs'

describe('LINE account function', () => {
  it('verifies the ID token with LINE and checks the channel audience', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({ sub: 'U123', aud: '2011727178', name: 'คุณเอ' })
    }))
    const profile = await verifyLineIdToken('id-token', '2011727178', fetchImpl)
    expect(profile.sub).toBe('U123')
    const [, options] = fetchImpl.mock.calls[0]
    expect(options.body.get('id_token')).toBe('id-token')
    expect(options.body.get('client_id')).toBe('2011727178')
  })

  it('rejects a token issued for another LINE channel', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({ sub: 'U123', aud: 'another-channel' })
    }))
    await expect(verifyLineIdToken('id-token', '2011727178', fetchImpl)).rejects.toThrow()
  })

  it('validates and normalizes birth details before saving', () => {
    expect(normalizeBirthProfile({
      birthDate: '26/08/1989', birthTime: '11:30', gender: 'male', timezoneId: 'Asia/Bangkok'
    })).toEqual({
      birth_date: '1989-08-26', birth_time: '11:30', gender: 'male', timezone_id: 'Asia/Bangkok'
    })
  })

  it('normalizes an optional comparison birth time and creates a stable identity', () => {
    const profile = normalizeComparisonProfile({
      name: 'คุณบี', birthDate: '02/01/1990', birthTime: '', gender: 'female',
      timezoneId: 'Asia/Bangkok', relationship: 'partner', focus: 'love'
    })
    expect(profile.birth_time).toBeNull()
    expect(comparisonFingerprint(profile)).toBe(comparisonFingerprint({ ...profile, person_name: 'ชื่อใหม่' }))
    expect(comparisonFingerprint(profile)).not.toBe(comparisonFingerprint({ ...profile, focus: 'overview' }))
  })
})
