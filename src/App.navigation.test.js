import { flushPromises, shallowMount } from '@vue/test-utils'
import { readFileSync } from 'node:fs'
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
  it('uses the shared navigation styling without the old right-aligned profile button style', () => {
    const identity = readFileSync('src/styles/identity.css', 'utf8')
    expect(identity).not.toMatch(/\.account-profile-button\s*\{/)
    const styles = readFileSync('src/styles/main.css', 'utf8')
    expect(styles).toMatch(/\.view-navigation button\s*\{[^}]*width: 100%;[^}]*margin: 0;/)
  })
  it('shows the introduction only for accounts without a birth profile and starts the form without saving', async () => {
    syncLineAccount.mockResolvedValue({ ...account(), birthProfile: null })
    wrapper = shallowMount(App)
    await flushPromises()
    const welcome = wrapper.getComponent({ name: 'WelcomeOverview' })
    const form = wrapper.get('.form-card')
    expect(wrapper.find('.hero-copy').exists()).toBe(false)
    expect(form.find('button-stub[type="submit"]').attributes('label')).toBe('บันทึกโปรไฟล์')
    expect(wrapper.findComponent({ name: 'ProfileAccount' }).exists()).toBe(false)
    const focus = vi.spyOn(form.element, 'focus')
    welcome.vm.$emit('start')
    await flushPromises()
    expect(focus).toHaveBeenCalledWith({ preventScroll: true })
    expect(wrapper.find('.form-card .step').exists()).toBe(false)
    expect(syncLineAccount).toHaveBeenCalledTimes(1)
    expect(reserveComparison).not.toHaveBeenCalled()
    expect(fetchPersonalCalendar).not.toHaveBeenCalled()
  })

  it('opens the birth profile without saving anything and exposes support links', async () => {
    wrapper = shallowMount(App)
    await flushPromises()
    expect(wrapper.findComponent({ name: 'WelcomeOverview' }).exists()).toBe(false)
    expect(wrapper.findComponent({ name: 'ProfileAccount' }).exists()).toBe(false)
    await wrapper.get('.account-profile-button').trigger('click')
    expect(wrapper.findAll('.view-navigation button').at(-2).text()).toContain('แพ็กเกจ')
    expect(wrapper.findAll('.view-navigation button').at(-1).text()).toContain('โปรไฟล์')
    expect(wrapper.find('.hero .account-profile-button').exists()).toBe(false)
    expect(wrapper.findAll('.view-navigation .active')).toHaveLength(1)
    expect(wrapper.get('.view-navigation .active').text()).toContain('โปรไฟล์')
    expect(wrapper.find('.identity-back').exists()).toBe(false)
    expect(wrapper.findComponent({ name: 'ProfileAccount' }).exists()).toBe(true)
    expect(wrapper.get('.form-card').text()).toContain('โปรไฟล์ของฉัน')
    expect(wrapper.text()).toContain('1 ครั้งต่อ 30 วัน')
    expect(syncLineAccount).toHaveBeenCalledTimes(1)
    expect(wrapper.get('a[href="/service.html#refund-title"]').text()).toContain('คืนเงิน')
    expect(wrapper.get('a[href="/service.html#contact-title"]').text()).toContain('แจ้งปัญหา')
    expect(wrapper.get('.service-links a[href="/terms.html"]').exists()).toBe(true)
    expect(wrapper.get('.service-links a[href="/privacy.html"]').exists()).toBe(true)
    expect(wrapper.get('.service-links a[href="/help.html"]').exists()).toBe(true)
    await openView('พื้นดวง')
    expect(wrapper.find('.form-card').exists()).toBe(false)
    expect(wrapper.get('.view-navigation .active').text()).toContain('พื้นดวง')
    expect(wrapper.findAll('.view-navigation .active')).toHaveLength(1)
    expect(syncLineAccount).toHaveBeenCalledTimes(1)
  })

  it('loads an incomplete saved profile without making up time, showing onboarding again or requesting a calendar', async () => {
    syncLineAccount.mockResolvedValue({ ...account(), birthProfile: { ...profile, birth_time: null, gender: 'unspecified' } })
    wrapper = shallowMount(App)
    await flushPromises()
    expect(wrapper.findComponent({ name: 'WelcomeOverview' }).exists()).toBe(false)
    expect(wrapper.findComponent({ name: 'IdentityReading' }).exists()).toBe(false)
    expect(wrapper.find('.view-navigation').exists()).toBe(false)
    expect(wrapper.get('.profile-saved-notice').text()).toContain('กรุณาระบุเวลาเกิดและเพศ')
    expect(wrapper.get('.form-card').text()).toContain('โปรไฟล์ของฉัน')
    expect(fetchPersonalCalendar).not.toHaveBeenCalled()
  })

  it('saves an incomplete first profile without a chart or comparison quota usage', async () => {
    syncLineAccount.mockResolvedValue({ ...account(), birthProfile: null })
    wrapper = shallowMount(App)
    await flushPromises()
    wrapper.getComponent({ name: 'MobileDateTimePicker' }).vm.$emit('update:modelValue', '26/08/1989')
    await wrapper.get('.form-card').trigger('submit')
    await flushPromises()
    expect(syncLineAccount).toHaveBeenLastCalledWith(expect.objectContaining({ birthProfile: expect.objectContaining({ birthDate: '26/08/1989', birthTime: '', gender: 'unspecified' }) }))
    expect(wrapper.findComponent({ name: 'IdentityReading' }).exists()).toBe(false)
    expect(wrapper.findComponent({ name: 'WelcomeOverview' }).exists()).toBe(false)
    expect(wrapper.get('.profile-saved-notice').text()).toContain('บันทึกโปรไฟล์แล้ว')
    expect(reserveComparison).not.toHaveBeenCalled()
    expect(fetchPersonalCalendar).not.toHaveBeenCalled()
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
