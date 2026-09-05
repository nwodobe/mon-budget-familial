import { shiftMonth } from './dates'
import type { Ledger } from './types'

export interface DailySpendPoint {
  day: number
  actual: number
  advised: number
}

export interface CategorySpendPoint {
  name: string
  spent: number
  planned: number
  remaining: number
  pct: number
}

export interface MonthlyTrendPoint {
  month: string
  income: number
  expenses: number
  savings: number
}

function active<T extends { deleted_at: string | null }>(row: T): boolean {
  return row.deleted_at === null
}

export function cumulativeDailySpend(ledger: Ledger, month: string, advisedDaily: number): DailySpendPoint[] {
  const [year, monthNumber] = month.split('-').map(Number)
  const days = new Date(year, monthNumber, 0).getDate()
  const daily = new Map<number, number>()
  for (const e of ledger.expenses) {
    if (!active(e) || !e.date.startsWith(month)) continue
    const day = Number(e.date.slice(8, 10))
    daily.set(day, (daily.get(day) ?? 0) + e.amount)
  }
  let cumulative = 0
  return Array.from({ length: days }, (_, i) => {
    const day = i + 1
    cumulative += daily.get(day) ?? 0
    return { day, actual: cumulative, advised: Math.max(0, advisedDaily) * day }
  })
}

export function spendByEnvelope(ledger: Ledger, month: string): CategorySpendPoint[] {
  const expenses = ledger.expenses.filter((e) => active(e) && e.date.startsWith(month))
  const overrides = new Map(
    ledger.budget_overrides
      .filter((o) => active(o) && o.month === month)
      .map((o) => [o.envelope_id, o.planned]),
  )
  const rows = ledger.envelopes
    .filter(active)
    .map((env) => {
      const spent = expenses.filter((e) => e.envelope_id === env.id).reduce((sum, e) => sum + e.amount, 0)
      const planned = overrides.get(env.id) ?? env.planned
      return {
        name: env.name,
        spent,
        planned,
        remaining: planned - spent,
        pct: planned > 0 ? Math.round((spent / planned) * 100) : spent > 0 ? 100 : 0,
      }
    })
    .filter((r) => r.spent > 0 || r.planned > 0)
    .sort((a, b) => b.spent - a.spent)

  const uncategorized = expenses.filter((e) => !e.envelope_id).reduce((sum, e) => sum + e.amount, 0)
  if (uncategorized > 0) rows.push({ name: 'Autres', spent: uncategorized, planned: 0, remaining: -uncategorized, pct: 100 })
  return rows
}

export function monthlyTrends(ledger: Ledger, month: string, count = 6): MonthlyTrendPoint[] {
  const months = Array.from({ length: count }, (_, i) => shiftMonth(month, i - count + 1))
  return months.map((m) => {
    const income = ledger.incomes.filter((r) => active(r) && r.date.startsWith(m)).reduce((s, r) => s + r.amount, 0)
    const expenses = ledger.expenses.filter((r) => active(r) && r.date.startsWith(m)).reduce((s, r) => s + r.amount, 0)
    const savings = ledger.savings
      .filter((r) => active(r) && r.date.startsWith(m))
      .reduce((s, r) => s + (r.kind === 'depot' ? r.amount : -r.amount), 0)
    return { month: m, income, expenses, savings }
  })
}
