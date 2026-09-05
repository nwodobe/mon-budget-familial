import { getActiveLocale } from '../i18n'
import type { IsoDate, IsoMonth } from './types'

/** Nombre de jours du mois "YYYY-MM". */
export function daysInMonth(month: IsoMonth): number {
  const [y, m] = month.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}

export function monthOf(date: IsoDate): IsoMonth {
  return date.slice(0, 7)
}

export function toIsoDate(d: Date): IsoDate {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayIso(): IsoDate {
  return toIsoDate(new Date())
}

export function currentMonth(): IsoMonth {
  return todayIso().slice(0, 7)
}

/** Decale un mois de `delta` mois (delta peut etre negatif). */
export function shiftMonth(month: IsoMonth, delta: number): IsoMonth {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** Nombre entier de mois separant deux mois (b - a). */
export function monthsBetween(a: IsoMonth, b: IsoMonth): number {
  const [ya, ma] = a.split('-').map(Number)
  const [yb, mb] = b.split('-').map(Number)
  return (yb - ya) * 12 + (mb - ma)
}

/** Date d'echeance reelle dans le mois, rabatue sur le dernier jour. */
export function dueDateOf(month: IsoMonth, dueDay: number): IsoDate {
  const last = daysInMonth(month)
  const day = Math.min(Math.max(1, Math.trunc(dueDay)), last)
  return `${month}-${String(day).padStart(2, '0')}`
}

/** Jours restants, jour de reference inclus. */
export function remainingDays(month: IsoMonth, reference: IsoDate): number {
  const total = daysInMonth(month)
  const refMonth = reference.slice(0, 7)
  if (refMonth < month) return total
  if (refMonth > month) return 0
  const day = Number(reference.slice(8, 10))
  return total - day + 1
}

/**
 * Jours civils ecoules en incluant le jour courant. Utile quand des depenses
 * du jour sont deja incluses dans la moyenne observee.
 */
export function elapsedDays(month: IsoMonth, reference: IsoDate): number {
  const total = daysInMonth(month)
  const refMonth = reference.slice(0, 7)
  if (refMonth < month) return 0
  if (refMonth > month) return total
  return Math.min(total, Math.max(1, Number(reference.slice(8, 10))))
}

export function monthLabel(month: IsoMonth, locale = getActiveLocale()): string {
  const [y, m] = month.split('-').map(Number)
  return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(new Date(y, m - 1, 1))
}

export function dateLabel(date: IsoDate, locale = getActiveLocale()): string {
  const [y, m, d] = date.split('-').map(Number)
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(y, m - 1, d))
}

/** Debut (lundi) de la semaine contenant `date`, en ISO. */
export function startOfWeek(date: IsoDate): IsoDate {
  const [y, m, d] = date.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  const dow = (dt.getDay() + 6) % 7
  dt.setDate(dt.getDate() - dow)
  return toIsoDate(dt)
}
