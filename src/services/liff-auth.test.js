import { describe, expect, it, vi } from 'vitest'
import { initializeLineSession, isLocalDevelopment } from './liff-auth'

const productionLocation = {
  hostname: 'bz-bazi.netlify.app',
  origin: 'https://bz-bazi.netlify.app',
  pathname: '/',
  search: '?preview=premium',
  hash: '#calendar'
}

describe('LIFF authentication', () => {
  it('keeps localhost usable without LINE login', async () => {
    expect(isLocalDevelopment('localhost')).toBe(true)
    expect(await initializeLineSession({
      liffId: 'test-liff-id',
      location: { ...productionLocation, hostname: '127.0.0.1' }
    })).toEqual({ status: 'local', inClient: false, profile: null })
  })

  it('loads the LINE profile after LIFF login', async () => {
    const liffClient = {
      init: vi.fn(),
      isInClient: vi.fn(() => true),
      isLoggedIn: vi.fn(() => true),
      getProfile: vi.fn(async () => ({
        userId: 'U123', displayName: 'คุณเอ', pictureUrl: 'https://example.com/avatar.jpg'
      }))
    }

    const session = await initializeLineSession({
      liffId: 'test-liff-id', location: productionLocation, liffClient
    })

    expect(liffClient.init).toHaveBeenCalledWith({ liffId: 'test-liff-id' })
    expect(session.status).toBe('authenticated')
    expect(session.profile.displayName).toBe('คุณเอ')
  })

  it('starts LINE Login when opened in an external browser', async () => {
    const liffClient = {
      init: vi.fn(),
      isInClient: vi.fn(() => false),
      isLoggedIn: vi.fn(() => false),
      login: vi.fn()
    }

    const session = await initializeLineSession({
      liffId: 'test-liff-id', location: productionLocation, liffClient
    })

    expect(liffClient.login).toHaveBeenCalledWith({
      redirectUri: 'https://bz-bazi.netlify.app/?preview=premium#calendar'
    })
    expect(session.status).toBe('redirecting')
  })
})
