// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import handler, { reserveComparison } from '../../netlify/functions/line-session.mjs'
import { buildComparisonReading } from './comparison-reading.js'

const owner = { birth_date: '1989-08-26', birth_time: '11:30:00', gender: 'male', timezone_id: 'Asia/Bangkok', profile_version: 1 }
const person = { name: 'Test', birthDate: '02/04/1992', birthTime: '18:55', gender: 'female', timezoneId: 'Asia/Bangkok', relationship: 'unspecified', focus: 'overview' }
const record = () => ({ id: 'report-1', user_id: 'owner-1', owner_profile_version: 1, person_name: 'Test', birth_date: '1992-04-02', birth_time: '18:55:00', gender: 'female', timezone_id: 'Asia/Bangkok', relationship: 'unspecified', focus: 'overview', result_json: null })
function fixture({ allowed = true, report = record(), profile = owner, failSave = false } = {}) {
  let reserved = false
  let deductions = 0
  const rest = vi.fn(async (path, options) => {
    if (path.startsWith('birth_profiles?')) return [profile]
    if (path.startsWith('user_entitlements?')) return [{ next_membership: null }]
    if (path === 'rpc/reserve_comparison_report_v2') {
      const existing = reserved
      if (allowed && !reserved) { deductions++; reserved = true }
      return [{ report_id: allowed ? report.id : null, is_existing: existing, current_plan: 'free', included_used: deductions, purchased_remaining: 0 }]
    }
    if (path.startsWith('comparison_reports?')) {
      if (options?.method === 'PATCH') {
        if (failSave) { failSave = false; throw new Error('temporary save failure') }
        report = { ...report, ...options.body }
      }
      return [report]
    }
    throw new Error('unexpected path')
  })
  return { rest, deductions: () => deductions }
}

describe('server-owned comparison results', () => {
  it('reserves via existing RPC and saves all five topics from the stored owner', async () => {
    const { rest } = fixture()
    const response = await reserveComparison(rest, 'owner-1', { ...person, result: { score: 100 }, ownerProfile: { birthDate: 'fake' } }, 1)
    expect(response.allowed).toBe(true)
    expect(Object.keys(response.report.result.topicResults)).toEqual(['overview', 'love', 'family', 'work', 'friendship'])
    const expected = buildComparisonReading({ birthDate: owner.birth_date, birthTime: '11:30', gender: owner.gender, timezoneId: owner.timezone_id }, person)
    expect(response.report.result).toEqual(expected)
    const patch = rest.mock.calls.find(([, opts]) => opts?.method === 'PATCH')
    expect(patch[0]).toContain('user_id=eq.owner-1&owner_profile_version=eq.1')
    expect(rest.mock.calls.find(([path]) => path.startsWith('birth_profiles'))[0]).toContain('user_id=eq.owner-1')
  })
  it('returns no reading and performs no result write when quota is denied', async () => {
    const { rest } = fixture({ allowed: false })
    expect(await reserveComparison(rest, 'owner-1', person, 1)).toMatchObject({ allowed: false, report: null })
    expect(rest.mock.calls.some(([path]) => path.startsWith('comparison_reports'))).toBe(false)
  })
  it('reuses the saved reading without another result write or deduction', async () => {
    const f = fixture()
    const first = await reserveComparison(f.rest, 'owner-1', person, 1)
    const second = await reserveComparison(f.rest, 'owner-1', person, 1)
    expect(second.existing).toBe(true)
    expect(second.report.result).toEqual(first.report.result)
    expect(f.deductions()).toBe(1)
    expect(f.rest.mock.calls.filter(([, opts]) => opts?.method === 'PATCH')).toHaveLength(1)
  })
  it('retries an incomplete reservation without consuming another credit', async () => {
    const f = fixture({ failSave: true })
    await expect(reserveComparison(f.rest, 'owner-1', person, 1)).rejects.toThrow('temporary save failure')
    const response = await reserveComparison(f.rest, 'owner-1', person, 1)
    expect(response.report.result.readingVersion).toBe('server-v1')
    expect(f.deductions()).toBe(1)
  })
  it('upgrades legacy stored results rather than trusting the old client score', async () => {
    const f = fixture({ report: { ...record(), result_json: { score: { value: 999 } } } })
    const response = await reserveComparison(f.rest, 'owner-1', person, 1)
    expect(response.report.result.score.value).toBeLessThanOrEqual(100)
    expect(response.report.result.topicResults).toBeDefined()
  })
  it('supports unknown time on all topics', async () => {
    const f = fixture({ report: { ...record(), birth_time: null } })
    const response = await reserveComparison(f.rest, 'owner-1', { ...person, birthTime: '' }, 1)
    expect(Object.values(response.report.result.topicResults).every(topic => topic.timeWarning)).toBe(true)
  })
  it('rejects an old owner version before reservation', async () => {
    const f = fixture({ profile: { ...owner, profile_version: 2 } })
    await expect(reserveComparison(f.rest, 'owner-1', person, 1)).rejects.toThrow('profile_version_changed')
    expect(f.deductions()).toBe(0)
  })
  it('rejects stale returned reports before overwriting historical readings', async () => {
    const f = fixture({ report: { ...record(), owner_profile_version: 0 } })
    await expect(reserveComparison(f.rest, 'owner-1', person, 1)).rejects.toThrow('profile_version_changed')
    expect(f.rest.mock.calls.some(([, opts]) => opts?.method === 'PATCH')).toBe(false)
  })
  it('validates impossible birth dates before reserving', async () => {
    const f = fixture()
    await expect(reserveComparison(f.rest, 'owner-1', { ...person, birthDate: '31/02/1992' }, 1)).rejects.toThrow()
    expect(f.deductions()).toBe(0)
  })
})

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks() })
describe('public comparison endpoint', () => {
  it.each([
    [{ action: 'saveComparisonResult', reportId: 'another-report', result: { score: 100 } }, 410],
    [{ action: 'reserveComparison', comparisonProfile: person, profileVersion: 1, planId: 'premium' }, 400]
  ])('rejects client result/privilege writes before any database call', async (body, expected) => {
    vi.stubEnv('LINE_CHANNEL_ID', 'test-channel')
    vi.stubEnv('SUPABASE_URL', 'https://db.example')
    vi.stubEnv('SUPABASE_SECRET_KEY', 'test-only')
    const network = vi.fn(async () => Response.json({ aud: 'test-channel', sub: 'verified-owner' }))
    vi.stubGlobal('fetch', network)
    const response = await handler(new Request('https://example.com/api/line-session', { method: 'POST', body: JSON.stringify({ idToken: 'test', ...body }) }))
    expect(response.status).toBe(expected)
    expect(response.headers.get('cache-control')).toContain('no-store')
    expect(network).toHaveBeenCalledTimes(1)
    expect(network.mock.calls[0][0]).toContain('api.line.me')
  })
})
