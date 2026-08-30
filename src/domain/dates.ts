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

/**
 * Date d'echeance reelle d'une charge dans un mois : le jour demande, rabattu
 * sur le dernier jour du mois quand il n'existe pas (31 en fevrier).
 */
export function dueDateOf(month: IsoMonth, dueDay: number): IsoDate {
  const last = daysInMonth(month)
  const day = Math.min(Math.max(1, Math.trunc(dueDay)), last)
  return `${month}-${String(day).padStart(2, '0')}`
}

/**
 * Jours restants dans le mois, jour de reference INCLUS.
 * Vaut le mois entier si la reference est anterieure au mois, et 0 si elle
 * lui est posterieure (le mois est clos, il n'y a plus rien a etaler).
 */
export function remainingDays(month: IsoMonth, reference: IsoDate): number {
  const total = daysInMonth(month)
  const refMonth = reference.slice(0, 7)
  if (refMonth < month) return total
  if (refMonth > month) return 0
  const day = Number(reference.slice(8, 10))
  return total - day + 1
}

const MONTH_LABELS = [
  'janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre',
]

export function monthLabel(month: IsoMonth): string {
  const [y, m] = month.split('-').map(Number)
  return `${MONTH_LABELS[m - 1]} ${y}`
}

export function dateLabel(date: IsoDate): string {
  const [y, m, d] = date.split('-').map(Number)
  return `${d} ${MONTH_LABELS[m - 1]} ${y}`
}

/** Debut (lundi) de la semaine contenant `date`, en ISO. */
export function startOfWeek(date: IsoDate): IsoDate {
  const [y, m, d] = date.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  const dow = (dt.getDay() + 6) % 7
  dt.setDate(dt.getDate() - dow)
  return toIsoDate(dt)
}
