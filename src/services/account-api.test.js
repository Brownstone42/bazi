import { describe, expect, it, vi } from 'vitest'
import { birthProfileToForm, reserveComparison, syncLineAccount } from './account-api'

describe('account API', () => {
  it('sends optional details separately from the birth profile and does not send them on routine reads', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true, json: async () => ({}) }))
    await syncLineAccount({ idToken: 'token', profileDetails: { bloodType: '', relationshipStatus: 'single' }, fetchImpl })
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body).profileDetails.relationshipStatus).toBe('single')
    await syncLineAccount({ idToken: 'token', fetchImpl })
    expect(JSON.parse(fetchImpl.mock.calls[1][1].body)).not.toHaveProperty('profileDetails')
  })
  it('sends the LINE ID token rather than trusting client profile data', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({ user: { id: 'user-1' }, entitlement: { planId: 'free' } })
    }))
    await syncLineAccount({ idToken: 'line-token', fetchImpl })
    expect(fetchImpl).toHaveBeenCalledWith('/api/line-session', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ idToken: 'line-token', action: 'sync' })
    }))
  })

  it('reserves a comparison through the authenticated server endpoint', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true, json: async () => ({ allowed: true }) }))
    const comparisonProfile = { birthDate: '01/01/1990', relationship: 'friend', focus: 'overview' }
    await reserveComparison({ idToken: 'line-token', comparisonProfile, fetchImpl })
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toEqual({
      idToken: 'line-token', action: 'reserveComparison', comparisonProfile
    })
  })

  it('never sends client-generated results or membership as part of a comparison request', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true, json: async () => ({ allowed: true }) }))
    await reserveComparison({ idToken: 'token', profileVersion: 1, comparisonProfile: {}, result: { score: 100 }, planId: 'premium', fetchImpl })
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toEqual({ idToken: 'token', action: 'reserveComparison', profileVersion: 1, comparisonProfile: {} })
  })

  it('converts the stored ISO birth profile back to the Thai date input format', () => {
    expect(birthProfileToForm({
      birth_date: '1989-08-26', birth_time: '11:30:00', gender: 'male', timezone_id: 'Asia/Bangkok'
    })).toEqual({
      birthDate: '26/08/1989', birthTime: '11:30', gender: 'male', timezoneId: 'Asia/Bangkok'
    })
  })
})
