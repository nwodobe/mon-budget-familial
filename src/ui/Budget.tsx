import { useState } from 'react'
import { monthLabel } from '../domain/dates'
import { formatInt } from '../domain/disciplineV2'
import { useApp } from '../state/AppContext'
import { AmountInput, Bar, Card, Empty, Field, Money, Row, Sheet } from './common'

const SUGGESTIONS = [
  'Alimentation', 'Transport', 'Carburant', 'Maison', 'Santé', 'Téléphone / Internet',
  'Électricité', 'Eau', 'Aide familiale', 'Loisirs', 'Restaurant', 'Imprévus',
]

export default function Budget() {
  const { snapshot, ledger, month, create, update, remove } = useApp()
  const [editing, setEditing] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const totalSpent = snapshot.envelopes.reduce((s, e) => s + e.spent, 0)
  const used = new Set(snapshot.envelopes.map((e) => e.name.toLowerCase()))
  const missing = SUGGESTIONS.filter((s) => !used.has(s.toLowerCase()))

  return (
    <>
      <Card title={`Plan du mois - ${monthLabel(month)}`}>
        <div className="rows">
          <Row k="Revenus encaissés" v={<Money value={snapshot.income} />} tone="pos" />
          {snapshot.incomeExpected > 0 && (
            <Row k="Revenus encore attendus" v={<Money value={snapshot.incomeExpected} />} note="Non inclus dans votre Disponible à dépenser" />
          )}
          <Row k="Charges obligatoires" v={<Money value={snapshot.chargesDue} />} />
          <Row k="Épargne / provisions protégées" v={<Money value={Math.max(snapshot.savingsTarget, snapshot.provisions.reduce((s, p) => s + p.monthlyNeeded, 0))} />} />
          <Row k="Disponible pour enveloppes" v={<Money value={snapshot.envelopeCapacity} />} />
          <Row k="Enveloppes affectées" v={<Money value={snapshot.envelopeAllocated} />} />
          <Row
            k={snapshot.envelopeAllocationGap >= 0 ? 'Reste à affecter' : 'Sur-allocation'}
            v={<Money value={Math.abs(snapshot.envelopeAllocationGap)} />}
            tone={snapshot.envelopeAllocationGap >= 0 ? 'pos' : 'neg'}
          />
        </div>
        <div className={`banner mt ${snapshot.envelopeAllocationStatus === 'impossible' ? 'over' : ''}`}>
          <span className={`dot ${snapshot.envelopeAllocationStatus === 'impossible' ? 'danger' : 'ok'}`} />
          {snapshot.envelopeAllocationStatus === 'impossible'
            ? `Budget impossible : vous avez affecté ${formatInt(Math.abs(snapshot.envelopeAllocationGap))} FCFA de plus que votre capacité actuelle.`
            : `Budget équilibré. Il reste ${formatInt(snapshot.envelopeAllocationGap)} FCFA à affecter ou à conserver comme marge.`}
        </div>
      </Card>

      <Card title="Enveloppes" action={<button className="btn small ghost" onClick={() => setAdding(true)}>Ajouter</button>}>
        {snapshot.envelopes.length === 0 ? (
          <Empty text="Créez vos enveloppes : elles vous aident à décider où va votre argent avant de le dépenser." />
        ) : (
          snapshot.envelopes.map((e) => (
            <div className="env" key={e.id}>
              <div className="env-head">
                <div className="env-name">
                  <span className={`dot ${e.state === 'depasse' ? 'danger' : e.state === 'attention' ? 'warn' : 'ok'}`} />
                  {e.name}
                </div>
                <button className="btn small ghost" onClick={() => setEditing(e.id)}>Modifier</button>
              </div>
              <Bar pct={e.usedPct} state={e.state} />
              <div className="env-sub">
                <span><Money value={e.spent} currency={false} /> / <Money value={e.planned} /> ({e.usedPct} %)</span>
                <span>{e.remaining >= 0 ? 'Reste ' : 'Dépassement '}<Money value={Math.abs(e.remaining)} /></span>
              </div>
            </div>
          ))
        )}
        {snapshot.envelopes.length > 0 && (
          <div className="tiny mt">Total dépensé dans les enveloppes : {formatInt(totalSpent)} FCFA.</div>
        )}
      </Card>

      {missing.length > 0 && (
        <Card title="Catégories courantes">
          <div className="chips">
            {missing.map((s) => (
              <button key={s} className="chip" onClick={() => create('envelopes', { name: s, planned: 0, position: snapshot.envelopes.length })}>{s}</button>
            ))}
          </div>
        </Card>
      )}

      {adding && (
        <EnvelopeSheet
          title="Nouvelle enveloppe"
          initialName=""
          initialPlanned={0}
          onClose={() => setAdding(false)}
          onSave={(name, planned) => {
            create('envelopes', { name, planned, position: snapshot.envelopes.length })
            setAdding(false)
          }}
        />
      )}

      {editing && (
        <EnvelopeSheet
          title="Modifier l'enveloppe"
          initialName={snapshot.envelopes.find((e) => e.id === editing)?.name ?? ''}
          initialPlanned={snapshot.envelopes.find((e) => e.id === editing)?.planned ?? 0}
          monthNote={`Le montant s'applique à ${monthLabel(month)} et aux mois suivants.`}
          onDelete={() => { remove('envelopes', editing); setEditing(null) }}
          onClose={() => setEditing(null)}
          onSave={(name, planned) => {
            update('envelopes', editing, { name, planned })
            const override = ledger.budget_overrides.find((o) => o.envelope_id === editing && o.month === month && o.deleted_at === null)
            if (override) update('budget_overrides', override.id, { planned })
            setEditing(null)
          }}
        />
      )}
    </>
  )
}

function EnvelopeSheet({ title, initialName, initialPlanned, monthNote, onClose, onSave, onDelete }: {
  title: string
  initialName: string
  initialPlanned: number
  monthNote?: string
  onClose: () => void
  onSave: (name: string, planned: number) => void
  onDelete?: () => void
}) {
  const [name, setName] = useState(initialName)
  const [planned, setPlanned] = useState(initialPlanned)
  return (
    <Sheet title={title} onClose={onClose}>
      <Field label="Nom de l'enveloppe"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Alimentation" autoFocus /></Field>
      <Field label="Budget mensuel en FCFA" hint={monthNote}><AmountInput value={planned} onChange={setPlanned} /></Field>
      <div className="tiny mt">{planned > 0 ? `Soit environ ${formatInt(Math.floor(planned / 30))} FCFA par jour.` : ''}</div>
      <div className="btn-row mt">
        {onDelete && <button className="btn danger" onClick={onDelete}>Supprimer</button>}
        <button className="btn primary" disabled={name.trim() === ''} onClick={() => onSave(name.trim(), planned)}>Enregistrer</button>
      </div>
    </Sheet>
  )
}
