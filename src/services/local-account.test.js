import { beforeEach, describe, expect, it } from 'vitest'
import { defaultBirthProfile, loadLocalBirthProfile, saveLocalBirthProfile, LOCAL_PROFILE_KEY } from './local-account'

describe('localhost mock profile', () => {
  beforeEach(() => localStorage.clear())
  it('starts with the requested existing birth profile', () => {
    expect(loadLocalBirthProfile(localStorage)).toEqual(defaultBirthProfile)
    expect(JSON.parse(localStorage.getItem(LOCAL_PROFILE_KEY))).toEqual(defaultBirthProfile)
  })
  it('keeps edits after a new session loads', () => {
    const edited = { ...defaultBirthProfile, birthDate: '01/02/1990', birthTime: '23:15' }
    saveLocalBirthProfile(localStorage, edited)
    expect(loadLocalBirthProfile(localStorage)).toEqual(edited)
  })
  it('does not substitute sample birth data for an explicitly empty profile', () => {
    saveLocalBirthProfile(localStorage, null)
    expect(loadLocalBirthProfile(localStorage)).toBeNull()
  })
})
