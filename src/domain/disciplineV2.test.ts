import { describe, expect, it } from 'vitest'
import { computeMonthV2, simulateExpenseV2 } from './disciplineV2'
import { emptyLedger, type Ledger } from './types'

const M = '2026-08'
const REF = '2026-08-16'
const meta = (id: string) => ({ id, updated_at: '2026-08-01T00:00:00.000Z', deleted_at: null })

function ledger(): Ledger {
  return emptyLedger()
}

function income(l: Ledger, id: string, amount: number, date: string) {
  l.incomes.push({ ...meta(id), date, amount, source: 'Salaire', method: 'banque', recurring: true, note: '' })
}

function envelope(l: Ledger, id: string, name: string, planned: number) {
  l.envelopes.push({ ...meta(id), name, planned, position: l.envelopes.length })
}

function charge(l: Ledger, id: string, label: string, amount: number, dueDay = 5) {
  l.charges.push({ ...meta(id), label, amount, due_day: dueDay, frequency: 'mensuelle', start_month: '2026-01', active: true })
}

function expense(l: Ledger, id: string, amount: number, date: string, envelopeId: string | null = null) {
  l.expenses.push({ ...meta(id), date, amount, envelope_id: envelopeId, method: 'especes', description: '', member: 'Moi', charge_id: null, override_reason: '', discipline_flags: [] })
}

describe('revenus encaisses et revenus futurs', () => {
  it('exclut un revenu futur du Disponible a depenser', () => {
    const l = ledger()
    l.settings.savings_rate_pct = 0
    income(l, 'now', 500000, '2026-08-01')
    income(l, 'future', 1000000, '2026-08-30')
    const s = computeMonthV2(l, M, REF)
    expect(s.income).toBe(500000)
    expect(s.incomeExpected).toBe(1000000)
    expect(s.incomePlanned).toBe(1500000)
    expect(s.available).toBe(500000)
  })

  it('integre le revenu le jour de son encaissement', () => {
    const l = ledger()
    l.settings.savings_rate_pct = 0
    income(l, 'salary', 1500000, '2026-08-30')
    expect(computeMonthV2(l, M, '2026-08-29').income).toBe(0)
    expect(computeMonthV2(l, M, '2026-08-30').income).toBe(1500000)
  })
})

describe('simulation avant depense', () => {
  it('detecte un danger global meme si l enveloppe autorise la depense', () => {
    const l = ledger()
    l.settings.savings_rate_pct = 0
    income(l, 'i1', 500000, '2026-08-01')
    charge(l, 'c1', 'Loyer', 420000)
    envelope(l, 'e1', 'Restaurant', 300000)
    const sim = simulateExpenseV2(l, M, REF, { amount: 100000, envelopeId: 'e1', date: REF })
    expect(sim.envelope).toBeNull()
    expect(sim.globalRisk).toBe('danger')
    expect(sim.availableBefore).toBe(80000)
    expect(sim.availableAfter).toBe(-20000)
    expect(sim.flags).toContain('global-danger')
  })

  it('ne modifie jamais le ledger pendant la simulation', () => {
    const l = ledger()
    income(l, 'i1', 500000, '2026-08-01')
    const before = JSON.stringify(l)
    simulateExpenseV2(l, M, REF, { amount: 10000, envelopeId: null, date: REF })
    expect(JSON.stringify(l)).toBe(before)
  })
})

describe('budget quotidien', () => {
  it('inclut le jour courant dans la moyenne quand une depense du jour existe', () => {
    const l = ledger()
    l.settings.savings_rate_pct = 0
    income(l, 'i1', 1000000, '2026-08-01')
    expense(l, 'e1', 160000, REF)
    const s = computeMonthV2(l, M, REF)
    expect(s.daysElapsed).toBe(16)
    expect(s.averageDailySpend).toBe(10000)
  })

  it('affiche un reste du jour jamais negatif', () => {
    const l = ledger()
    l.settings.savings_rate_pct = 0
    income(l, 'i1', 160000, '2026-08-01')
    expense(l, 'e1', 20000, REF)
    const s = computeMonthV2(l, M, REF)
    expect(s.todayRemaining).toBeGreaterThanOrEqual(0)
    if (s.todaySpent > s.todayBudget) expect(s.todayOverBy).toBe(s.todaySpent - s.todayBudget)
  })
})

describe('sur-allocation des enveloppes', () => {
  it('detecte un budget impossible', () => {
    const l = ledger()
    l.settings.savings_rate_pct = 15
    income(l, 'i1', 1500000, '2026-08-01')
    charge(l, 'c1', 'Loyer', 700000)
    envelope(l, 'e1', 'Alimentation', 400000)
    envelope(l, 'e2', 'Transport', 350000)
    const s = computeMonthV2(l, M, REF)
    expect(s.envelopeCapacity).toBe(575000)
    expect(s.envelopeAllocated).toBe(750000)
    expect(s.envelopeAllocationGap).toBe(-175000)
    expect(s.envelopeAllocationStatus).toBe('impossible')
  })
})

describe('provisions', () => {
  it('calcule une provision mensuelle pour une grosse depense future', () => {
    const l = ledger()
    l.settings.savings_rate_pct = 0
    income(l, 'i1', 1000000, '2026-08-01')
    l.provisions.push({ ...meta('p1'), name: 'Assurance', target_amount: 360000, target_date: '2026-11-30', pocket_id: null, initial_amount: 60000, active: true })
    const s = computeMonthV2(l, M, REF)
    expect(s.provisions[0].remaining).toBe(300000)
    expect(s.provisions[0].monthsLeft).toBe(4)
    expect(s.provisions[0].monthlyNeeded).toBe(75000)
    expect(s.provisionsReserveRemaining).toBe(75000)
  })

  it('ne double compte pas une provision deja alimentee dans sa poche', () => {
    const l = ledger()
    l.settings.savings_rate_pct = 0
    income(l, 'i1', 1000000, '2026-08-01')
    l.pockets.push({ ...meta('po1'), name: 'Assurance', position: 0 })
    l.provisions.push({ ...meta('p1'), name: 'Assurance', target_amount: 400000, target_date: '2026-11-30', pocket_id: 'po1', initial_amount: 0, active: true })
    const before = computeMonthV2(l, M, REF)
    const need = before.provisions[0].monthlyNeeded
    l.savings.push({ ...meta('s1'), date: '2026-08-10', amount: need, pocket_id: 'po1', kind: 'depot', note: '' })
    const after = computeMonthV2(l, M, REF)
    expect(after.provisions[0].reserveRemainingThisMonth).toBe(0)
    expect(after.available).toBe(1000000 - need)
  })
})

describe('deficit et score', () => {
  it('conserve le deficit brut mais expose un spendable a zero', () => {
    const l = ledger()
    l.settings.savings_rate_pct = 0
    income(l, 'i1', 400000, '2026-08-01')
    charge(l, 'c1', 'Loyer', 500000)
    const s = computeMonthV2(l, M, REF)
    expect(s.available).toBe(-100000)
    expect(s.spendable).toBe(0)
    expect(s.deficit).toBe(100000)
  })

  it('retire les criteres non applicables du score', () => {
    const s = computeMonthV2(ledger(), M, REF)
    expect(s.score.measurable).toBe(false)
    expect(s.score.components.every((c) => !c.applicable)).toBe(true)
  })
})
