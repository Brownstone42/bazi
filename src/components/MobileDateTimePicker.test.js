import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import MobileDateTimePicker from './MobileDateTimePicker.vue'
import { nextTick } from 'vue'

let wrapper

afterEach(() => {
  wrapper?.unmount()
  document.body.innerHTML = ''
  document.body.style.overflow = ''
})

describe('MobileDateTimePicker', () => {
  it('shows a Thai readable date and confirms a new date in calculation format', async () => {
    wrapper = mount(MobileDateTimePicker, {
      attachTo: document.body,
      props: { modelValue: '26/08/1989', type: 'date' }
    })
    expect(wrapper.text()).toContain('26 สิงหาคม 2532')
    await wrapper.get('.mobile-picker-trigger').trigger('click')

    const wheels = document.querySelectorAll('[role="spinbutton"]')
    wheels[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    wheels[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    wheels[2].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }))
    await nextTick()
    document.querySelector('.mobile-picker-confirm').click()

    expect(wrapper.emitted('update:modelValue')[0]).toEqual(['27/09/1990'])
  })

  it('lets an optional comparison time be marked as unknown', async () => {
    wrapper = mount(MobileDateTimePicker, {
      attachTo: document.body,
      props: { modelValue: '11:30', type: 'time', allowEmpty: true }
    })
    await wrapper.get('.mobile-picker-trigger').trigger('click')
    document.querySelector('.mobile-picker-clear').click()
    expect(wrapper.emitted('update:modelValue')[0]).toEqual([''])
  })

  it('opens with focus inside the dialog, traps Tab, and restores focus on Escape without saving', async () => {
    wrapper = mount(MobileDateTimePicker, { attachTo: document.body, props: { modelValue: '26/08/1989', type: 'date' } })
    const trigger = wrapper.get('.mobile-picker-trigger')
    await trigger.trigger('click')
    await nextTick()
    const dialog = document.querySelector('[role="dialog"]')
    expect(trigger.attributes('aria-expanded')).toBe('true')
    expect(trigger.attributes('aria-controls')).toBe(dialog.id)
    expect(document.activeElement).toBe(dialog.querySelector('[role="spinbutton"]'))
    const controls = dialog.querySelectorAll('button, [role="spinbutton"]')
    controls[controls.length - 1].focus()
    const tab = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })
    controls[controls.length - 1].dispatchEvent(tab)
    expect(tab.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(controls[0])
    controls[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true }))
    expect(document.activeElement).toBe(controls[controls.length - 1])
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await nextTick()
    await nextTick()
    expect(trigger.attributes('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(trigger.element)
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    expect(document.body.style.overflow).toBe('')
  })

  it('clamps the day when changing from a leap year and confirms a valid date', async () => {
    wrapper = mount(MobileDateTimePicker, { attachTo: document.body, props: { modelValue: '29/02/2000', type: 'date' } })
    await wrapper.get('.mobile-picker-trigger').trigger('click')
    const years = document.querySelector('[role="spinbutton"][aria-label="ปี พ.ศ."]')
    years.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }))
    await nextTick()
    document.querySelector('.mobile-picker-confirm').click()
    expect(wrapper.emitted('update:modelValue')[0]).toEqual(['28/02/2001'])
  })

  it('restores the previous scroll setting when unmounted with a picker open', async () => {
    document.body.style.overflow = 'auto'
    wrapper = mount(MobileDateTimePicker, { attachTo: document.body, props: { type: 'time' } })
    await wrapper.get('.mobile-picker-trigger').trigger('click')
    expect(document.body.style.overflow).toBe('hidden')
    wrapper.unmount()
    wrapper = null
    expect(document.body.style.overflow).toBe('auto')
  })

  it('updates the weekday and animal while scrolling, but cancellation does not save', async () => {
    wrapper = mount(MobileDateTimePicker, { attachTo: document.body, props: { modelValue: '26/08/1989', type: 'date' } })
    await wrapper.get('.mobile-picker-trigger').trigger('click')
    expect(document.querySelector('.picker-date-description').textContent).toContain('วันเสาร์')
    expect(document.querySelector('.picker-date-description').textContent).toContain('มะเส็ง')
    const days = document.querySelector('[role="spinbutton"][aria-label="วัน"]')
    days.scrollTop = 26 * 48
    days.dispatchEvent(new Event('scroll'))
    await nextTick()
    expect(document.querySelector('.picker-date-description').textContent).toContain('วันอาทิตย์')
    document.querySelector('.mobile-picker-cancel').click()
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })
})
