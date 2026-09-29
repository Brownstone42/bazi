import { beforeEach, describe, expect, it } from 'vitest'
import { COMPARISON_PEOPLE_KEY, loadComparisonPeople, saveComparisonPerson } from './comparison-people'

describe('local saved comparison people', () => {
  beforeEach(() => localStorage.clear())
  it('seeds the requested person once and persists across reloads', () => {
    const people = loadComparisonPeople(localStorage)
    expect(people[0]).toMatchObject({ name: 'ณุภาวี', birthDate: '02/04/1992', birthTime: '18:55', timezoneId: 'Asia/Bangkok' })
    expect(loadComparisonPeople(localStorage)).toEqual(people)
    expect(JSON.parse(localStorage.getItem(COMPARISON_PEOPLE_KEY))).toEqual(people)
  })
  it('updates an existing person without duplicates and preserves edits', () => {
    const [person] = loadComparisonPeople(localStorage)
    saveComparisonPerson(localStorage, { ...person, birthTime: '19:00' }, person.id)
    const saved = loadComparisonPeople(localStorage)
    expect(saved).toHaveLength(1)
    expect(saved[0].birthTime).toBe('19:00')
  })
  it('adds a new person without overwriting the seed and permits unknown time', () => {
    const [person] = loadComparisonPeople(localStorage)
    const saved = saveComparisonPerson(localStorage, { ...person, name: 'คนใหม่', birthTime: '' })
    expect(saved.people).toHaveLength(2)
    expect(saved.person.id).not.toBe(person.id)
    expect(saved.person.birthTime).toBe('')
  })
})
