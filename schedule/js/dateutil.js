export const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
export const DOW_SHORT = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

export function isoDate(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
export function mondayIndex(d) { return (d.getDay() + 6) % 7 }
export function isWeekend(d) { const i = mondayIndex(d); return i === 5 || i === 6 }
export function isoWeek(d) {
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const dayNr = (target.getDay() + 6) % 7
  target.setDate(target.getDate() - dayNr + 3)
  const firstThursday = new Date(target.getFullYear(), 0, 4)
  return 1 + Math.round((target - firstThursday) / (7 * 24 * 3600 * 1000))
}
export function daysInMonth(year, monthIdx) { return new Date(year, monthIdx + 1, 0).getDate() }
export function monthMatrix(year, monthIdx) {
  const first = new Date(year, monthIdx, 1)
  const offset = mondayIndex(first)
  const start = new Date(year, monthIdx, 1 - offset)
  const last = new Date(year, monthIdx, daysInMonth(year, monthIdx))
  const lastOffset = 6 - mondayIndex(last)
  const end = new Date(year, monthIdx, last.getDate() + lastOffset)
  const days = []
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) days.push(new Date(d))
  return days
}
export function isSameDay(a, b) {
  return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate()
}
