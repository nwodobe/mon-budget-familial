import { useMemo, useState } from 'react'
import { dateLabel, monthLabel, startOfWeek, todayIso } from '../domain/dates'
import { PAYMENT_METHODS } from '../domain/types'
import { useApp } from '../state/AppContext'
import { Card, Empty, Field, Icon, Money } from './common'

type Period = 'jour' | 'semaine' | 'mois' | 'precedent' | 'annee'

const PERIODS: { value: Period; label: string }[] = [
  { value: 'jour', label: "Aujourd'hui" },
  { value: 'semaine', label: 'Cette semaine' },
  { value: 'mois', label: 'Ce mois' },
  { value: 'precedent', label: 'Mois précédent' },
  { value: 'annee', label: 'Année' },
]

export default function Historique() {
  const { ledger, snapshot, month, remove } = useApp()
  const [period, setPeriod] = useState<Period>('mois')
  const [envelopeId, setEnvelopeId] = useState('')
  const [method, setMethod] = useState('')
  const [member, setMember] = useState('')
  const [search, setSearch] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const today = todayIso()

  const range = useMemo<{ from: string; to: string; label: string }>(() => {
    switch (period) {
      case 'jour': return { from: today, to: today, label: dateLabel(today) }
      case 'semaine': return { from: startOfWeek(today), to: today, label: `depuis le ${dateLabel(startOfWeek(today))}` }
      case 'mois': return { from: `${month}-01`, to: `${month}-31`, label: monthLabel(month) }
      case 'precedent': {
        const [y, m] = month.split('-').map(Number)
        const d = new Date(y, m - 2, 1)
        const prev = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        return { from: `${prev}-01`, to: `${prev}-31`, label: monthLabel(prev) }
      }
      case 'annee': {
        const y = month.slice(0, 4)
        return { from: `${y}-01-01`, to: `${y}-12-31`, label: `année ${y}` }
      }
    }
  }, [period, month, today])

  const rows = ledger.expenses
    .filter((e) => e.deleted_at === null)
    .filter((e) => e.date >= range.from && e.date <= range.to)
    .filter((e) => envelopeId ? e.envelope_id === envelopeId : true)
    .filter((e) => method ? e.method === method : true)
    .filter((e) => member ? e.member === member : true)
    .filter((e) => search.trim() === '' ? true : (e.description + ' ' + e.override_reason).toLowerCase().includes(search.trim().toLowerCase()))
    .sort((a, b) => b.date === a.date ? b.updated_at.localeCompare(a.updated_at) : b.date.localeCompare(a.date))

  const total = rows.reduce((s, e) => s + e.amount, 0)
  const envelopeName = (id: string | null) => id ? (snapshot.envelopes.find((e) => e.id === id)?.name ?? 'Enveloppe supprimée') : 'Hors enveloppe'

  const grouped = rows.reduce<Record<string, typeof rows>>((acc, item) => {
    const label = item.date === today ? "Aujourd'hui" : item.date === previousDay(today) ? 'Hier' : dateLabel(item.date)
    ;(acc[label] ??= []).push(item)
    return acc
  }, {})

  const filterCount = [envelopeId, method, member].filter(Boolean).length

  return <>
    <section className="activity-summary">
      <div><span>Sorties · {range.label}</span><strong><Money value={total}/></strong><small>{rows.length} dépense{rows.length > 1 ? 's' : ''}</small></div>
    </section>

    <div className="period-scroll" aria-label="Période">
      {PERIODS.map((p) => <button key={p.value} className={`period-pill ${period === p.value ? 'on' : ''}`} onClick={() => setPeriod(p.value)}>{p.label}</button>)}
    </div>

    <div className="activity-tools">
      <label className="search-box"><Icon name="search" size={19}/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher une dépense" aria-label="Rechercher une dépense" /></label>
      <button className={`filter-button ${filterCount ? 'active' : ''}`} onClick={() => setFiltersOpen(!filtersOpen)}>Filtres{filterCount ? ` (${filterCount})` : ''}</button>
    </div>

    {filtersOpen && <Card className="filters-card">
      <div className="field-2">
        <Field label="Enveloppe"><select value={envelopeId} onChange={(e) => setEnvelopeId(e.target.value)}><option value="">Toutes</option>{snapshot.envelopes.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</select></Field>
        <Field label="Moyen"><select value={method} onChange={(e) => setMethod(e.target.value)}><option value="">Tous</option>{PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}</select></Field>
      </div>
      {ledger.settings.members.length > 1 && <Field label="Personne"><select value={member} onChange={(e) => setMember(e.target.value)}><option value="">Toutes</option>{ledger.settings.members.map((m) => <option key={m} value={m}>{m}</option>)}</select></Field>}
      {filterCount > 0 && <button className="text-action" onClick={() => { setEnvelopeId(''); setMethod(''); setMember('') }}>Réinitialiser les filtres</button>}
    </Card>}

    {rows.length === 0 ? <Card><Empty text="Aucune dépense sur cette période." /></Card> : <div className="transaction-groups">
      {Object.entries(grouped).map(([label, items]) => <section className="transaction-group" key={label}><h2>{label}</h2><div className="transaction-list">{items.map((e) => <div className="transaction-row" key={e.id}><span className="transaction-icon"><Icon name="receipt" size={20}/></span><div className="transaction-main"><strong>{e.description || envelopeName(e.envelope_id)}</strong><small>{envelopeName(e.envelope_id)} · {PAYMENT_METHODS.find((m) => m.value === e.method)?.label}{e.member ? ` · ${e.member}` : ''}</small></div><div className="transaction-end"><strong>-<Money value={e.amount}/></strong><button onClick={() => remove('expenses', e.id)} aria-label={`Retirer ${e.description || envelopeName(e.envelope_id)}`}>Retirer</button></div></div>)}</div></section>)}
    </div>}
  </>
}

function previousDay(iso: string): string {
  const d = new Date(`${iso}T12:00:00`)
  d.setDate(d.getDate() - 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
