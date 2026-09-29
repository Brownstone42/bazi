export const COMPARISON_PEOPLE_KEY = 'bazi-local-comparison-people-v1'
export const testComparisonPerson = {
  id: 'test-nupavee', name: 'ณุภาวี', birthDate: '02/04/1992', birthTime: '18:55',
  gender: 'female', timezoneId: 'Asia/Bangkok'
}

export function loadComparisonPeople(storage) {
  const saved = storage.getItem(COMPARISON_PEOPLE_KEY)
  if (saved !== null) return JSON.parse(saved)
  const people = [{ ...testComparisonPerson }]
  storage.setItem(COMPARISON_PEOPLE_KEY, JSON.stringify(people))
  return people
}

export function saveComparisonPerson(storage, profile, id) {
  const people = loadComparisonPeople(storage)
  const existing = people.find(person => person.id === id) ?? people.find(person => person.name === profile.name.trim() && person.birthDate === profile.birthDate)
  const person = {
    id: existing?.id ?? crypto.randomUUID(), name: profile.name.trim(),
    birthDate: profile.birthDate, birthTime: profile.birthTime || '',
    gender: profile.gender, timezoneId: profile.timezoneId
  }
  const result = existing ? people.map(item => item.id === existing.id ? person : item) : [...people, person]
  storage.setItem(COMPARISON_PEOPLE_KEY, JSON.stringify(result))
  return { people: result, person }
}
