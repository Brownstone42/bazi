import { describe, expect, it } from 'vitest'
import { BIRTH_EDIT_INTERVAL, birthProfileChanged, birthEditBlocked } from './profile-policy'
import { reportPayload } from '../../netlify/functions/line-session.mjs'

const profile = { birthDate: '26/08/1989', birthTime: '11:30', gender: 'male', timezoneId: 'Asia/Bangkok' }
describe('birth profile edit policy', () => {
  it('does not count onboarding, identical data or display-name edits', () => {
    expect(birthProfileChanged(null, profile)).toBe(false)
    expect(birthProfileChanged(profile, { ...profile })).toBe(false)
    expect(birthProfileChanged(profile, { ...profile, name: 'new name' })).toBe(false)
  })
  it.each(['birthDate', 'birthTime', 'gender', 'timezoneId'])('counts changes to %s', key => {
    expect(birthProfileChanged(profile, { ...profile, [key]: 'changed' })).toBe(true)
  })
  it('unlocks at exactly 30 elapsed days, not at a new calendar month', () => {
    const edited = Date.parse('2026-09-28T12:00:00Z')
    const next = new Date(edited + BIRTH_EDIT_INTERVAL).toISOString()
    expect(birthEditBlocked(next, Date.parse('2026-10-01T00:00:00Z'))).toBe(true)
    expect(birthEditBlocked(next, edited + BIRTH_EDIT_INTERVAL - 1)).toBe(true)
    expect(birthEditBlocked(next, edited + BIRTH_EDIT_INTERVAL)).toBe(false)
    expect(birthEditBlocked(null, edited)).toBe(false)
  })
  it('keeps old reports and snapshots, including after returning to original birth data', () => {
    const report = { id: 'one', owner_profile_version: 1, owner_birth_snapshot: { birth_date: '1989-08-26' }, result_json: { summary: 'saved' }, quota_source: 'purchased' }
    expect(reportPayload(report, 1).isStale).toBe(false)
    expect(reportPayload(report, 2)).toMatchObject({ isStale: true, result: report.result_json, ownerBirthSnapshot: report.owner_birth_snapshot, quotaSource: 'purchased' })
    expect(reportPayload(report, 3).isStale).toBe(true)
    expect(reportPayload({ id: 'legacy' }, 1).isStale).toBe(true)
  })
})
