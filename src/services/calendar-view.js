import { calendarFocusOptions } from './calendar-options.js'

export const CALENDAR_CACHE_MS = 5 * 60 * 1000
export function bangkokDay(now) {
  return new Date(new Date(now).getTime() + 7 * 3600000).toISOString().slice(0, 10)
}

// This selects server-authorized readings only; no predictions are calculated here.
export function calendarForFocus(month, focus) {
  if (!month || focus === 'all') return month
  return { ...month, focus, focusLabel: calendarFocusOptions.find(item => item.value === focus)?.label,
    days: month.days.map(day => {
      const topic = day.topicReadings?.find(item => item.focus === focus)
      return topic ? { ...topic, ...(day.access ? { access: day.access } : {}) } : day
    }) }
}

export function createCalendarCache() {
  let ownerContext
  const months = new Map()
  return {
    useContext(context) {
      if (context !== ownerContext) { months.clear(); ownerContext = context }
    },
    get(key, now = Date.now()) {
      const entry = months.get(key)
      if (!entry || now >= entry.until) { months.delete(key); return null }
      return entry.payload
    },
    set(key, payload, now = Date.now()) {
      const serverTime = Date.parse(payload.serverNow)
      const midnight = Date.parse(bangkokDay(serverTime) + 'T00:00:00+07:00') + 86400000
      const expiry = payload.plan.planId === 'premium' ? Date.parse(payload.plan.premiumExpiresAt) : Infinity
      const ttl = Math.max(0, Math.min(CALENDAR_CACHE_MS, midnight - serverTime, expiry - serverTime))
      if (!Number.isFinite(ttl) || ttl <= 0) return
      months.set(key, { payload, until: now + ttl })
      if (months.size > 4) months.delete(months.keys().next().value)
    }
  }
}
