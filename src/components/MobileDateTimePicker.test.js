import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import MobileDateTimePicker from './MobileDateTimePicker.vue'

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
})
