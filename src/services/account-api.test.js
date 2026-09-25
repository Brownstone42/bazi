import { describe, expect, it, vi } from 'vitest'
import { birthProfileToForm, reserveComparison, saveComparisonResult, syncLineAccount } from './account-api'

describe('account API', () => {
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

  it('saves a generated result against its reserved report', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true, json: async () => ({ report: { id: 'report-1' } }) }))
    await saveComparisonResult({ idToken: 'line-token', reportId: 'report-1', result: { headline: 'เข้ากันได้ดี' }, fetchImpl })
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toEqual({
      idToken: 'line-token', action: 'saveComparisonResult', reportId: 'report-1', result: { headline: 'เข้ากันได้ดี' }
    })
  })

  it('converts the stored ISO birth profile back to the Thai date input format', () => {
    expect(birthProfileToForm({
      birth_date: '1989-08-26', birth_time: '11:30:00', gender: 'male', timezone_id: 'Asia/Bangkok'
    })).toEqual({
      birthDate: '26/08/1989', birthTime: '11:30', gender: 'male', timezoneId: 'Asia/Bangkok'
    })
  })
})
