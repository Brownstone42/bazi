import {it,expect,vi} from 'vitest'
import {mount,flushPromises} from '@vue/test-utils'
import CouplePreview from './CouplePreview.vue'
import {coupleReading,rankCouples,readCouplePeople,COUPLE_PREVIEW_KEY} from '../services/couple-preview.js'
const owner={birthDate:'26/08/1989',birthTime:'11:30',gender:'male',timezoneId:'Asia/Bangkok'}
const person={id:'sample',name:'ตัวอย่างทดสอบ',birthDate:'15/05/1990',birthTime:'09:00',gender:'female',timezoneId:'Asia/Bangkok',relationship:'partner'}
it('uses one ranking rubric across relationship labels and withholds incomplete scores',()=>{
 const love=coupleReading(owner,person),work=coupleReading(owner,{...person,relationship:'colleague'})
 expect(love.result.score.value).toBe(work.result.score.value)
 expect(love.result.shouldDo).not.toBe(work.result.shouldDo)
 expect(coupleReading(owner,{...person,birthTime:''}).result).toBeNull()
 expect(coupleReading({...owner,gender:'unspecified'},person).result).toBeNull()
 expect(rankCouples(owner,[{...person,id:'unknown',birthTime:''},person])[0].person.id).toBe('sample')
})
it('starts empty, saves locally, opens a saved result without a form, and supports undo',async()=>{
 window.localStorage.clear()
 const wrapper=mount(CouplePreview,{props:{input:owner},global:{stubs:{MobileDateTimePicker:true}}})
 expect(wrapper.findAll('.podium button')).toHaveLength(3)
 await wrapper.get('.add-person').trigger('click')
 await wrapper.get('input[maxlength]').setValue(person.name)
 const pickers=wrapper.findAllComponents({name:'MobileDateTimePicker'})
 pickers[0].vm.$emit('update:modelValue',person.birthDate)
 pickers[1].vm.$emit('update:modelValue',person.birthTime)
 await wrapper.findAll('select')[0].setValue('female')
 await wrapper.get('form').trigger('submit')
 expect(wrapper.find('form').exists()).toBe(false)
 expect(wrapper.find('.score-circle').exists()).toBe(true)
 expect(readCouplePeople(window.localStorage)).toHaveLength(1)
 await wrapper.get('.saved-person').trigger('click')
 expect(wrapper.find('form').exists()).toBe(false)
 await wrapper.get('.delete-person').trigger('click')
 expect(readCouplePeople(window.localStorage)).toHaveLength(0)
 await wrapper.get('.restore button').trigger('click')
 expect(readCouplePeople(window.localStorage)).toHaveLength(1)
 wrapper.unmount();window.localStorage.removeItem(COUPLE_PREVIEW_KEY)
})

it('requires the server result online and never falls back to a free local score',async()=>{
 const key='diti-couples:test-user'
 window.localStorage.setItem(key,JSON.stringify([person]))
 const remoteReader=vi.fn().mockRejectedValue(new Error('ใช้สิทธิ์ครบแล้ว'))
 const wrapper=mount(CouplePreview,{props:{input:owner,storageKey:key,remoteReader,savedReader:()=>null}})
 expect(wrapper.find('.score-circle').exists()).toBe(false)
 await wrapper.get('.saved-person').trigger('click')
 await flushPromises()
 expect(remoteReader).toHaveBeenCalledTimes(1)
 expect(wrapper.find('.score-circle').exists()).toBe(false)
 expect(wrapper.text()).toContain('ใช้สิทธิ์ครบแล้ว')
 wrapper.unmount();window.localStorage.removeItem(key)
})
