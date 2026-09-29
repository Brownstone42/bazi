export const LOCAL_PROFILE_KEY = 'bazi-local-birth-profile-v1'
export const mockUser = { userId: 'localhost-demo', displayName: 'คุณอนวัช', pictureUrl: '' }
export const defaultBirthProfile = {
  birthDate: '26/08/1989', birthTime: '11:30', gender: 'male', timezoneId: 'Asia/Bangkok'
}

export function loadLocalBirthProfile(storage) {
  const saved = storage.getItem(LOCAL_PROFILE_KEY)
  if (saved === null) {
    storage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(defaultBirthProfile))
    return { ...defaultBirthProfile }
  }
  return JSON.parse(saved)
}

export function saveLocalBirthProfile(storage, profile) {
  storage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(profile))
}
