import { describe, expect, it } from 'vitest'
import { computeMonthV2, simulateExpenseV2 } from './disciplineV2'
import { emptyLedger, type Ledger } from './types'

const MONTH = '2026-08'
const TODAY = '2026-08-16'
const meta = (id: string) => ({ id, updated_at: '2026-08-01T00:00:00.000Z', deleted_at: null })

function addIncome(l: Ledger, id: string, amount: number, date: string) {
  l.incomes.push({ ...meta(id), date, amount, source: 'Salaire', method: 'banque', recurring: true, note: '' })
}

function addCharge(l: Ledger, id: string, label: string, amount: number, dueDay: number) {
  l.charges.push({ ...meta(id), label, amount, due_day: dueDay, frequency: 'mensuelle', start_month: '2026-01', active: true })
}

function addEnvelope(l: Ledger, id: string, name: string, planned: number, position: number) {
  l.envelopes.push({ ...meta(id), name, planned, position })
}

function addExpense(l: Ledger, id: string, amount: number, envelopeId: string | null, date = TODAY) {
  l.expenses.push({
    ...meta(id),
    date,
    amount,
    envelope_id: envelopeId,
    method: 'especes',
    description: 'E2E',
    member: 'Moi',
    charge_id: null,
    override_reason: '',
    discipline_flags: [],
  })
}

describe('E2E discipline financiere - foyer 1 500 000 FCFA', () => {
  it('protege le mois de bout en bout avant toute mauvaise decision', () => {
    const l = emptyLedger()
    l.settings.savings_rate_pct = 15
    l.settings.warn_threshold_pct = 80

    addIncome(l, 'salary', 1_500_000, '2026-08-01')

    addCharge(l, 'rent', 'Loyer', 300_000, 5)
    addCharge(l, 'school', 'École', 150_000, 10)
    addCharge(l, 'internet', 'Internet', 30_000, 20)
    addCharge(l, 'power', 'Électricité', 75_000, 25)

    let s = computeMonthV2(l, MONTH, TODAY)
    expect(s.income).toBe(1_500_000)
    expect(s.chargesDue).toBe(555_000)
    expect(s.savingsTarget).toBe(225_000)
    expect(s.available).toBe(720_000)

    addEnvelope(l, 'food', 'Alimentation', 250_000, 0)
    addEnvelope(l, 'transport', 'Transport', 120_000, 1)
    addEnvelope(l, 'restaurant', 'Restaurant', 100_000, 2)
    s = computeMonthV2(l, MONTH, TODAY)
    expect(s.envelopeCapacity).toBe(720_000)
    expect(s.envelopeAllocated).toBe(470_000)
    expect(s.envelopeAllocationStatus).toBe('equilibre')

    let sim = simulateExpenseV2(l, MONTH, TODAY, { amount: 30_000, envelopeId: 'food', date: TODAY })
    expect(sim.globalRisk).toBe('none')
    expect(sim.envelope).toBeNull()
    addExpense(l, 'expense-normal', 30_000, 'food')
    expect(computeMonthV2(l, MONTH, TODAY).available).toBe(690_000)

    addExpense(l, 'restaurant-before', 60_000, 'restaurant', '2026-08-15')
    sim = simulateExpenseV2(l, MONTH, TODAY, { amount: 20_000, envelopeId: 'restaurant', date: TODAY })
    expect(sim.envelope?.warningOnly).toBe(true)
    expect(sim.envelope?.newTotal).toBe(80_000)

    addEnvelope(l, 'project', 'Projet familial', 700_000, 3)
    addExpense(l, 'other-spend', 80_000, 'food', '2026-08-14')
    s = computeMonthV2(l, MONTH, TODAY)
    expect(s.available).toBe(550_000)
    sim = simulateExpenseV2(l, MONTH, TODAY, { amount: 560_000, envelopeId: 'project', date: TODAY })
    // 560 000 reste sous le plafond de 700 000 : pas de dépassement d'enveloppe.
    // Il atteint exactement le seuil orange de 80 %, ce qui est normal, mais
    // l'alerte globale rouge doit rester prioritaire car le mois devient déficitaire.
    expect(sim.envelope?.warningOnly).toBe(true)
    expect(sim.envelope?.overBy).toBe(0)
    expect(sim.globalRisk).toBe('danger')
    expect(sim.availableAfter).toBe(-10_000)

    addIncome(l, 'future-bonus', 500_000, '2026-08-30')
    s = computeMonthV2(l, MONTH, TODAY)
    expect(s.incomeExpected).toBe(500_000)
    expect(s.income).toBe(1_500_000)
    expect(s.available).toBe(550_000)

    l.provisions.push({
      ...meta('insurance'),
      name: 'Assurance voiture',
      target_amount: 360_000,
      target_date: '2026-11-30',
      pocket_id: null,
      initial_amount: 60_000,
      active: true,
    })
    s = computeMonthV2(l, MONTH, TODAY)
    expect(s.provisions[0].monthlyNeeded).toBe(75_000)
    expect(s.provisionsReserveRemaining).toBe(75_000)
    expect(s.protectedReserveRemaining).toBe(300_000)
    expect(s.available).toBe(475_000)
  })
})
