export const scoreLevels = [
  { max: 45, key: 'caution', label: 'ควรระวัง', color: '#f1a29b', background: '#fde7e4', ink: '#8a2828' },
  { max: 60, key: 'neutral', label: 'กลาง ๆ', color: '#efd68f', background: '#fff1c9', ink: '#735416' },
  { max: 75, key: 'good', label: 'ดี', color: '#b7dd9b', background: '#e4f2d7', ink: '#41602b' },
  { max: 100, key: 'excellent', label: 'ดีมาก', color: '#59c795', background: '#c9eedb', ink: '#15563a' }
]
export const scoreLevel = score => scoreLevels.find(level => score <= level.max) ?? scoreLevels[3]
