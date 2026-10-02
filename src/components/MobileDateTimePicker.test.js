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
    expect(wrapper.text()).toContain('26 สิงหาคม 1989')
    await wrapper.get('.mobile-picker-trigger').trigger('click')

    const selects = document.querySelectorAll('.mobile-picker-columns select')
    selects[0].value = '27'
    selects[0].dispatchEvent(new Event('change'))
    selects[1].value = '9'
    selects[1].dispatchEvent(new Event('change'))
    selects[2].value = '1990'
    selects[2].dispatchEvent(new Event('change'))
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
    expect(document.activeElement).toBe(dialog.querySelector('select'))
    const controls = dialog.querySelectorAll('button, select')
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
    const selects = document.querySelectorAll('.mobile-picker-columns select')
    selects[2].value = '2001'
    selects[2].dispatchEvent(new Event('change'))
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
})
