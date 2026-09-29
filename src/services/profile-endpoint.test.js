import { afterEach, describe, expect, it, vi } from 'vitest'
import handler from '../../netlify/functions/line-session.mjs'

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })
function setup(rpcResult) {
  vi.stubEnv('LINE_CHANNEL_ID', 'test-channel')
  vi.stubEnv('SUPABASE_URL', 'https://example.invalid')
  vi.stubEnv('SUPABASE_SECRET_KEY', 'test-secret')
  const fetchMock = vi.fn(async (url, init) => {
    if (url.includes('/oauth2/')) return Response.json({ sub: 'line-user', aud: 'test-channel' })
    if (url.includes('app_users?')) return Response.json([{ id: 'user-1', display_name: 'Test' }])
    if (url.includes('user_entitlements?') && init.method === 'POST') return new Response(null, { status: 204 })
    if (url.includes('rpc/save_birth_profile')) return Response.json(rpcResult)
    throw new Error(`Unexpected request: ${url}`)
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}
describe('profile endpoint enforcement', () => {
  it('uses the verified account and atomic RPC, returning next allowed date on rejection', async () => {
    const nextEditAt = '2026-10-28T00:00:00Z'
    const fetchMock = setup({ allowed: false, nextEditAt })
    const response = await handler(new Request('https://example.invalid/api/line-session', {
      method: 'POST', body: JSON.stringify({ action: 'sync', idToken: 'token', userId: 'someone-else',
        birthProfile: { birthDate: '26/08/1989', birthTime: '11:30', gender: 'male', timezoneId: 'Asia/Bangkok' } })
    }))
    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({ nextEditAt })
    const [, call] = fetchMock.mock.calls.find(([url]) => url.includes('rpc/save_birth_profile'))
    expect(JSON.parse(call.body)).toMatchObject({ p_user_id: 'user-1', p_birth_date: '1989-08-26' })
    expect(fetchMock.mock.calls.some(([url]) => url.includes('birth_profiles?'))).toBe(false)
  })
})
