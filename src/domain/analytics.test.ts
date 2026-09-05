import { describe, expect, it } from 'vitest'
import { cumulativeDailySpend, monthlyTrends, spendByEnvelope } from './analytics'
import { emptyLedger } from './types'

const stamp = '2026-09-01T00:00:00.000Z'

describe('financial analytics', () => {
  it('builds cumulative daily spending', () => {
    const ledger = emptyLedger()
    ledger.expenses = [
      { id: 'e1', updated_at: stamp, deleted_at: null, date: '2026-09-01', amount: 1000, envelope_id: null, method: 'especes', description: '', member: 'Moi', charge_id: null, override_reason: '' },
      { id: 'e2', updated_at: stamp, deleted_at: null, date: '2026-09-03', amount: 2000, envelope_id: null, method: 'especes', description: '', member: 'Moi', charge_id: null, override_reason: '' },
    ]
    const rows = cumulativeDailySpend(ledger, '2026-09', 500)
    expect(rows[0].actual).toBe(1000)
    expect(rows[1].actual).toBe(1000)
    expect(rows[2].actual).toBe(3000)
    expect(rows[2].advised).toBe(1500)
  })

  it('aggregates spending by envelope', () => {
    const ledger = emptyLedger()
    ledger.envelopes = [{ id: 'food', updated_at: stamp, deleted_at: null, name: 'Alimentation', planned: 10000, position: 1 }]
    ledger.expenses = [{ id: 'e1', updated_at: stamp, deleted_at: null, date: '2026-09-03', amount: 2500, envelope_id: 'food', method: 'especes', description: '', member: 'Moi', charge_id: null, override_reason: '' }]
    const rows = spendByEnvelope(ledger, '2026-09')
    expect(rows[0]).toMatchObject({ name: 'Alimentation', spent: 2500, planned: 10000, remaining: 7500, pct: 25 })
  })

  it('builds six-month income expense savings trends', () => {
    const ledger = emptyLedger()
    ledger.incomes = [{ id: 'i1', updated_at: stamp, deleted_at: null, date: '2026-09-01', amount: 50000, source: 'Salaire', method: 'banque', recurring: false, note: '' }]
    ledger.expenses = [{ id: 'e1', updated_at: stamp, deleted_at: null, date: '2026-09-02', amount: 12000, envelope_id: null, method: 'especes', description: '', member: 'Moi', charge_id: null, override_reason: '' }]
    ledger.savings = [{ id: 's1', updated_at: stamp, deleted_at: null, date: '2026-09-03', amount: 5000, pocket_id: 'p', kind: 'depot', note: '' }]
    const rows = monthlyTrends(ledger, '2026-09', 6)
    expect(rows).toHaveLength(6)
    expect(rows[5]).toMatchObject({ month: '2026-09', income: 50000, expenses: 12000, savings: 5000 })
  })
})
