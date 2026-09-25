import { describe, expect, it, vi } from 'vitest'
import { birthProfileToForm, syncLineAccount } from './account-api'

describe('account API', () => {
  it('sends the LINE ID token rather than trusting client profile data', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({ user: { id: 'user-1' }, entitlement: { planId: 'free' } })
    }))
    await syncLineAccount({ idToken: 'line-token', fetchImpl })
    expect(fetchImpl).toHaveBeenCalledWith('/api/line-session', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ idToken: 'line-token' })
    }))
  })

  it('converts the stored ISO birth profile back to the Thai date input format', () => {
    expect(birthProfileToForm({
      birth_date: '1989-08-26', birth_time: '11:30:00', gender: 'male', timezone_id: 'Asia/Bangkok'
    })).toEqual({
      birthDate: '26/08/1989', birthTime: '11:30', gender: 'male', timezoneId: 'Asia/Bangkok'
    })
  })
})
