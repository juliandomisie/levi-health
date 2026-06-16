import { subDays, format } from 'date-fns'

export const userName = 'Julian'

export function getLast7Days() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = subDays(new Date(), 6 - i)
    return format(d, 'dd.MM')
  })
}

export const mockSleepData = Array.from({ length: 7 }, (_, i) => ({
  date: format(subDays(new Date(), 6 - i), 'dd.MM'),
  hours: +(6.5 + Math.random() * 2).toFixed(1),
  hrv: Math.floor(55 + Math.random() * 30),
  quality: Math.floor(6 + Math.random() * 4),
}))

export const mockFitnessData = Array.from({ length: 7 }, (_, i) => ({
  date: format(subDays(new Date(), 6 - i), 'dd.MM'),
  steps: Math.floor(6000 + Math.random() * 8000),
  calories: Math.floor(400 + Math.random() * 600),
  activeMin: Math.floor(20 + Math.random() * 60),
}))

export const mockHRVTrend = Array.from({ length: 30 }, (_, i) => ({
  date: format(subDays(new Date(), 29 - i), 'dd.MM'),
  hrv: Math.floor(58 + Math.random() * 25),
}))

export const mockBiomarkers = [
  { name: 'Nüchternglukose', value: 88, unit: 'mg/dL', optimal: '<90', status: 'good' },
  { name: 'HbA1c', value: 5.1, unit: '%', optimal: '<5.4', status: 'good' },
  { name: 'CRP', value: 0.4, unit: 'mg/L', optimal: '<1.0', status: 'good' },
  { name: 'Vitamin D', value: 42, unit: 'ng/mL', optimal: '50-80', status: 'warn' },
  { name: 'Testosteron', value: 620, unit: 'ng/dL', optimal: '>600', status: 'good' },
  { name: 'Ferritin', value: 85, unit: 'ng/mL', optimal: '80-120', status: 'good' },
  { name: 'LDL', value: 98, unit: 'mg/dL', optimal: '<100', status: 'good' },
  { name: 'HDL', value: 62, unit: 'mg/dL', optimal: '>60', status: 'good' },
]

export const mockTodayStats = {
  sleep: { hours: 7.5, hrv: 68, quality: 8 },
  steps: 8432,
  calories: { consumed: 1840, burned: 520 },
  water: 1800,
  energy: 7,
  bioAge: 22,
}

export const mockLeviGreeting = `Guten Morgen, Julian! Deine HRV von 68ms liegt 12% über deinem Wochenschnitt — ein starkes Zeichen für gute Erholung. Dein Schlaf war solide mit 7,5 Stunden. Heute wäre ein idealer Tag für ein intensiveres Training.`
