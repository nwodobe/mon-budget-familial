import { useMemo, useState } from 'react'
import { dateLabel, monthLabel, startOfWeek, todayIso } from '../domain/dates'
import { PAYMENT_METHODS } from '../domain/types'
import { useApp } from '../state/AppContext'
import { Card, Empty, Field, Money } from './common'

type Period = 'jour' | 'semaine' | 'mois' | 'precedent' | 'annee'

const PERIODS: { value: Period; label: string }[] = [
  { value: 'jour', label: "Aujourd hui" },
  { value: 'semaine', label: 'Cette semaine' },
  { value: 'mois', label: 'Ce mois' },
  { value: 'precedent', label: 'Mois precedent' },
  { value: 'annee', label: 'Annee' },
]

export default function Historique() {
  const { ledger, snapshot, month, remove } = useApp()
  const [period, setPeriod] = useState<Period>('mois')
  const [envelopeId, setEnvelopeId] = useState('')
  const [method, setMethod] = useState('')
  const [member, setMember] = useState('')
  const [search, setSearch] = useState('')

  const today = todayIso()

  const range = useMemo<{ from: string; to: string; label: string }>(() => {
    switch (period) {
      case 'jour':
        return { from: today, to: today, label: dateLabel(today) }
      case 'semaine':
        return { from: startOfWeek(today), to: today, label: `depuis le ${dateLabel(startOfWeek(today))}` }
      case 'mois':
        return { from: `${month}-01`, to: `${month}-31`, label: monthLabel(month) }
      case 'precedent': {
        const [y, m] = month.split('-').map(Number)
        const d = new Date(y, m - 2, 1)
        const prev = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        return { from: `${prev}-01`, to: `${prev}-31`, label: monthLabel(prev) }
      }
      case 'annee': {
        const y = month.slice(0, 4)
        return { from: `${y}-01-01`, to: `${y}-12-31`, label: `annee ${y}` }
      }
    }
  }, [period, month, today])

  const rows = ledger.expenses
    .filter((e) => e.deleted_at === null)
    .filter((e) => e.date >= range.from && e.date <= range.to)
    .filter((e) => (envelopeId ? e.envelope_id === envelopeId : true))
    .filter((e) => (method ? e.method === method : true))
    .filter((e) => (member ? e.member === member : true))
    .filter((e) =>
      search.trim() === ''
        ? true
        : (e.description + ' ' + e.override_reason).toLowerCase().includes(search.trim().toLowerCase()),
    )
    .sort((a, b) => (b.date === a.date ? b.updated_at.localeCompare(a.updated_at) : b.date.localeCompare(a.date)))

  const total = rows.reduce((s, e) => s + e.amount, 0)
  const envelopeName = (id: string | null) =>
    id ? (snapshot.envelopes.find((e) => e.id === id)?.name ?? 'Enveloppe supprimee') : 'Hors enveloppe'

  return (
    <>
      <Card title="Periode">
        <div className="chips">
          {PERIODS.map((p) => (
            <button key={p.value} className={`chip ${period === p.value ? 'on' : ''}`} onClick={() => setPeriod(p.value)}>
              {p.label}
            </button>
          ))}
        </div>
        <div className="rows mt">
          <div className="row">
            <div className="k">{rows.length} depense(s) - {range.label}</div>
            <div className="v">
              <Money value={total} />
            </div>
          </div>
        </div>
      </Card>

      <Card title="Filtres">
        <div className="field-2">
          <Field label="Enveloppe">
            <select value={envelopeId} onChange={(e) => setEnvelopeId(e.target.value)}>
              <option value="">Toutes</option>
              {snapshot.envelopes.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Moyen">
            <select value={method} onChange={(e) => setMethod(e.target.value)}>
              <option value="">Tous</option>
              {PAYMENT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        {ledger.settings.members.length > 1 && (
          <Field label="Personne">
            <select value={member} onChange={(e) => setMember(e.target.value)}>
              <option value="">Toutes</option>
              {ledger.settings.members.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field label="Recherche">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Description ou justification" />
        </Field>
      </Card>

      <Card title="Depenses">
        {rows.length === 0 ? (
          <Empty text="Aucune depense sur cette periode." />
        ) : (
          <div className="list">
            {rows.map((e) => (
              <div className="item" key={e.id}>
                <div className="main">
                  <div className="title">{e.description || envelopeName(e.envelope_id)}</div>
                  <div className="meta">
                    {dateLabel(e.date)} - {envelopeName(e.envelope_id)} -{' '}
                    {PAYMENT_METHODS.find((m) => m.value === e.method)?.label}
                    {e.charge_id ? ' - charge' : ''}
                    {e.override_reason ? ` - justification : ${e.override_reason}` : ''}
                  </div>
                </div>
                <div className="amt">
                  <Money value={e.amount} />
                </div>
                <button className="btn small ghost" onClick={() => remove('expenses', e.id)}>
                  Retirer
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  )
}
