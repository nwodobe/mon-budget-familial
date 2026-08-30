import { describe, expect, it } from 'vitest'
import { changesSince, mergeCollection, mergeRow } from './storage'
import { emptyLedger } from '../domain/types'

interface TestRow {
  id: string
  updated_at: string
  deleted_at: string | null
  amount: number
}

const row = (id: string, updated_at: string, amount = 1000): TestRow => ({
  id,
  updated_at,
  deleted_at: null,
  amount,
})

describe('fusion anti-doublon', () => {
  it('ajoute une ligne inconnue', () => {
    const out = mergeRow([], row('a', '2026-08-01T00:00:00Z'))
    expect(out).toHaveLength(1)
  })

  it('ne cree jamais de doublon en rejouant la meme synchronisation', () => {
    const incoming = [row('a', '2026-08-01T00:00:00Z'), row('b', '2026-08-02T00:00:00Z')]
    let rows = mergeCollection([], incoming)
    rows = mergeCollection(rows, incoming)
    rows = mergeCollection(rows, incoming)
    expect(rows).toHaveLength(2)
    expect(rows.map((r) => r.id)).toEqual(['a', 'b'])
  })

  it('retient la version la plus recente en cas de conflit', () => {
    const rows = mergeCollection([row('a', '2026-08-01T00:00:00Z', 1000)], [row('a', '2026-08-05T00:00:00Z', 5000)])
    expect(rows[0].amount).toBe(5000)
  })

  it('ne laisse pas une version ancienne ecraser une saisie plus recente', () => {
    const rows = mergeCollection([row('a', '2026-08-05T00:00:00Z', 5000)], [row('a', '2026-08-01T00:00:00Z', 1000)])
    expect(rows[0].amount).toBe(5000)
  })

  it('propage un effacement logique comme une modification ordinaire', () => {
    const deleted = { ...row('a', '2026-08-09T00:00:00Z'), deleted_at: '2026-08-09T00:00:00Z' }
    const rows = mergeCollection([row('a', '2026-08-01T00:00:00Z')], [deleted])
    expect(rows[0].deleted_at).toBe('2026-08-09T00:00:00Z')
  })
})

describe('selection des changements a pousser', () => {
  it('envoie tout au premier envoi', () => {
    const l = emptyLedger()
    l.expenses.push({
      id: 'e1',
      updated_at: '2026-08-01T00:00:00Z',
      deleted_at: null,
      date: '2026-08-01',
      amount: 1000,
      envelope_id: null,
      method: 'especes',
      description: '',
      member: 'Moi',
      charge_id: null,
      override_reason: '',
    })
    expect(changesSince(l, null).expenses).toHaveLength(1)
  })

  it("n'envoie que les lignes posterieures au dernier envoi", () => {
    const l = emptyLedger()
    l.envelopes.push({ id: 'a', updated_at: '2026-08-01T00:00:00Z', deleted_at: null, name: 'A', planned: 1, position: 0 })
    l.envelopes.push({ id: 'b', updated_at: '2026-08-10T00:00:00Z', deleted_at: null, name: 'B', planned: 1, position: 1 })
    const changes = changesSince(l, '2026-08-05T00:00:00Z')
    expect(changes.envelopes).toHaveLength(1)
    expect((changes.envelopes[0] as { id: string }).id).toBe('b')
  })
})
