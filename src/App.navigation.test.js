import { flushPromises, shallowMount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App.vue'
import { initializeLineSession } from './services/liff-auth'
import { syncLineAccount, reserveComparison } from './services/account-api'
import { fetchPersonalCalendar } from './services/calendar-api'
import { buildAuthorizedCalendar } from '../netlify/lib/calendar.mjs'
import { buildComparisonReading } from './services/comparison-reading'

vi.mock('./services/liff-auth', () => ({ initializeLineSession: vi.fn() }))
vi.mock('./services/account-api', async importOriginal => ({ ...await importOriginal(), syncLineAccount: vi.fn(), reserveComparison: vi.fn() }))
vi.mock('./services/calendar-api', () => ({ fetchPersonalCalendar: vi.fn() }))

const now = new Date('2026-10-02T05:00:00Z')
const profile = { birth_date: '1989-08-26', birth_time: '11:30:00', gender: 'male', timezone_id: 'Asia/Bangkok', profile_version: 1 }
const account = () => ({ birthProfile: profile, entitlement: { planId: 'free' }, comparisonReports: [] })
let wrapper
async function openView(name) {
  await wrapper.findAll('.view-navigation button').find(button => button.text().includes(name)).trigger('click')
  await flushPromises()
}
beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(now)
  window.history.replaceState(null, '', '/')
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  vi.stubGlobal('fetch', vi.fn(() => { throw new Error('Unexpected network call in UI test') }))
  initializeLineSession.mockResolvedValue({ status: 'authenticated', idToken: 'mock-token', profile: { displayName: 'ผู้ทดสอบ' } })
  syncLineAccount.mockResolvedValue(account())
  fetchPersonalCalendar.mockResolvedValue({ ...buildAuthorizedCalendar({ profile, entitlement: null, request: { year: 2026, month: 10, focus: 'all' }, now }), profileVersion: 1 })
})
afterEach(() => {
  wrapper?.unmount()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('main navigation with an isolated mock account', () => {
  it('opens the birth profile without saving anything and exposes support links', async () => {
    wrapper = shallowMount(App)
    await flushPromises()
    await wrapper.get('.account-profile-button').trigger('click')
    expect(wrapper.get('.form-card').text()).toContain('โปรไฟล์ของฉัน')
    expect(wrapper.text()).toContain('1 ครั้งต่อ 30 วัน')
    expect(syncLineAccount).toHaveBeenCalledTimes(1)
    expect(wrapper.get('a[href="/service.html#refund-title"]').text()).toContain('คืนเงิน')
    expect(wrapper.get('a[href="/service.html#contact-title"]').text()).toContain('แจ้งปัญหา')
    expect(wrapper.get('.service-links a[href="/terms.html"]').exists()).toBe(true)
    expect(wrapper.get('.service-links a[href="/privacy.html"]').exists()).toBe(true)
  })

  it('opens an existing comparison with its total score, highlights selection and hides all entry controls', async () => {
    const result = buildComparisonReading({ birthDate: '26/08/1989', birthTime: '11:30', gender: 'male', timezoneId: 'Asia/Bangkok' }, { birthDate: '02/04/1992', birthTime: '18:55', gender: 'female', timezoneId: 'Asia/Bangkok' })
    syncLineAccount.mockResolvedValue({ ...account(), comparisonReports: [{ id: 'mock-report', name: 'คนทดสอบ', birthDate: '1992-04-02', birthTime: '18:55', gender: 'female', timezoneId: 'Asia/Bangkok', relationship: 'unspecified', focus: 'overview', ownerProfileVersion: 1, isStale: false, result }] })
    wrapper = shallowMount(App)
    await flushPromises()
    await openView('เปรียบเทียบบุคคล')
    const saved = wrapper.get('.saved-person-option')
    expect(saved.get('.saved-person-score').text()).toContain(String(result.score.value))
    expect(wrapper.find('.comparison-form').exists()).toBe(true)
    await saved.trigger('click')
    await flushPromises()
    expect(saved.attributes('aria-pressed')).toBe('true')
    expect(wrapper.find('.comparison-form').exists()).toBe(false)
    expect(wrapper.find('.comparison-result').exists()).toBe(true)
    expect(reserveComparison).not.toHaveBeenCalled()
  })

  it('does not reload account or calendar when selecting topics/days, and reuses the month after navigation', async () => {
    wrapper = shallowMount(App)
    await flushPromises()
    await openView('ปฏิทินของฉัน')
    expect(fetchPersonalCalendar).toHaveBeenCalledTimes(1)
    expect(wrapper.findAll('.calendar-day')).toHaveLength(31)
    expect(wrapper.findAll('.calendar-day')[0].element.disabled).toBe(true)
    await wrapper.findAll('.calendar-day')[1].trigger('click')
    wrapper.getComponent('.calendar-focus-field select-stub').vm.$emit('update:modelValue', 'work')
    await flushPromises()
    expect(fetchPersonalCalendar).toHaveBeenCalledTimes(1)
    expect(syncLineAccount).toHaveBeenCalledTimes(1)
    await openView('พื้นดวง')
    await openView('ปฏิทินของฉัน')
    expect(fetchPersonalCalendar).toHaveBeenCalledTimes(1)
    expect(fetch).not.toHaveBeenCalled()
  })
})
