export function canReadBazi(profile) {
  return Boolean(profile && profile.birthDate && /^([01]\d|2[0-3]):[0-5]\d$/.test(profile.birthTime || '') && ['male', 'female'].includes(profile.gender))
}
