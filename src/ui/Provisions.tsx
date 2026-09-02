import { useState } from 'react'
import { dateLabel } from '../domain/dates'
import { useApp } from '../state/AppContext'
import { AmountInput, Bar, Card, Empty, Field, Money, Row, Sheet } from './common'

const SUGGESTIONS = ['Scolarité', 'Assurance voiture', 'Entretien voiture', 'Voyage', 'Fêtes', 'Impôts', 'Réparation maison']

export default function Provisions() {
  const { ledger, snapshot, create, update, remove, today } = useApp()
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [suggestedName, setSuggestedName] = useState('')

  const activeRows = ledger.provisions.filter((p) => p.deleted_at === null)

  return (
    <>
      <Card title="À préparer">
        <p className="tiny" style={{ marginTop: 0 }}>
          Anticipez les grosses dépenses avant leur échéance. L'épargne générale et les provisions sont protégées séparément, mais un versement déjà fait dans la poche dédiée d'une provision n'est jamais retenu une seconde fois.
        </p>
        <div className="rows">
          <Row k="Épargne générale encore à protéger" v={<Money value={snapshot.savingsRemaining} />} />
          <Row k="Provisions encore à constituer ce mois" v={<Money value={snapshot.provisionsReserveRemaining} />} />
          <Row k="Réserve protégée totale restante" v={<Money value={snapshot.protectedReserveRemaining} />} />
        </div>
      </Card>

      <Card title="Préparations actives" action={<button className="btn small ghost" onClick={() => { setSuggestedName(''); setAdding(true) }}>Ajouter</button>}>
        {snapshot.provisions.length === 0 ? (
          <Empty text="Aucune grosse dépense préparée. Commencez par une dépense prévisible : assurance, scolarité, voyage ou entretien." />
        ) : snapshot.provisions.map((p) => (
          <div className="env" key={p.id}>
            <div className="env-head">
              <div className="env-name">{p.name}</div>
              <button className="btn small ghost" onClick={() => setEditing(p.id)}>Modifier</button>
            </div>
            <Bar pct={p.progressPct} />
            <div className="env-sub">
              <span><Money value={p.funded} currency={false} /> / <Money value={p.target} /></span>
              <span>{p.progressPct} %</span>
            </div>
            <div className="rows mt">
              <Row k="Échéance" v={dateLabel(p.targetDate)} />
              <Row k="Reste à constituer" v={<Money value={p.remaining} />} />
              <Row k="Provision recommandée" v={<><Money value={p.monthlyNeeded} />/mois</>} />
              <Row k="Encore à protéger ce mois" v={<Money value={p.reserveRemainingThisMonth} />} tone={p.reserveRemainingThisMonth > 0 ? undefined : 'pos'} />
            </div>
          </div>
        ))}
      </Card>

      {activeRows.length === 0 && (
        <Card title="Exemples">
          <div className="chips">
            {SUGGESTIONS.map((s) => (
              <button key={s} className="chip" onClick={() => { setSuggestedName(s); setAdding(true) }}>{s}</button>
            ))}
          </div>
        </Card>
      )}

      {adding && (
        <ProvisionSheet
          title="Nouvelle préparation"
          initial={{ name: suggestedName, target_amount: 0, target_date: today, pocket_id: null, initial_amount: 0, active: true }}
          onClose={() => { setAdding(false); setSuggestedName('') }}
          onSave={(row) => { create('provisions', row); setAdding(false); setSuggestedName('') }}
        />
      )}

      {editing && (
        <ProvisionSheet
          title="Modifier la préparation"
          initial={ledger.provisions.find((p) => p.id === editing)!}
          onClose={() => setEditing(null)}
          onDelete={() => { remove('provisions', editing); setEditing(null) }}
          onSave={(row) => { update('provisions', editing, row); setEditing(null) }}
        />
      )}
    </>
  )
}

interface ProvisionForm {
  name: string
  target_amount: number
  target_date: string
  pocket_id: string | null
  initial_amount: number
  active: boolean
}

function ProvisionSheet({ title, initial, onClose, onSave, onDelete }: {
  title: string
  initial: ProvisionForm
  onClose: () => void
  onSave: (row: ProvisionForm) => void
  onDelete?: () => void
}) {
  const { ledger, today } = useApp()
  const [form, setForm] = useState<ProvisionForm>({
    name: initial.name,
    target_amount: initial.target_amount,
    target_date: initial.target_date,
    pocket_id: initial.pocket_id,
    initial_amount: initial.initial_amount,
    active: initial.active,
  })
  const set = <K extends keyof ProvisionForm>(key: K, value: ProvisionForm[K]) => setForm((f) => ({ ...f, [key]: value }))

  return (
    <Sheet title={title} onClose={onClose}>
      <Field label="Dépense à préparer"><input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Assurance voiture" autoFocus /></Field>
      <Field label="Montant cible"><AmountInput value={form.target_amount} onChange={(v) => set('target_amount', v)} /></Field>
      <Field label="Échéance"><input type="date" min={today} value={form.target_date} onChange={(e) => set('target_date', e.target.value)} /></Field>
      <Field label="Déjà acquis hors poche"><AmountInput value={form.initial_amount} onChange={(v) => set('initial_amount', v)} /></Field>
      <Field label="Poche d'épargne dédiée" hint="Les versements dans cette poche financent la provision et ne sont pas retenus une deuxième fois.">
        <select value={form.pocket_id ?? ''} onChange={(e) => set('pocket_id', e.target.value || null)}>
          <option value="">Aucune poche liée</option>
          {ledger.pockets.filter((p) => p.deleted_at === null).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </Field>
      <div className="chips" style={{ marginBottom: 14 }}>
        <button className={`chip ${form.active ? 'on' : ''}`} onClick={() => set('active', true)}>Active</button>
        <button className={`chip ${!form.active ? 'on' : ''}`} onClick={() => set('active', false)}>Suspendue</button>
      </div>
      <div className="btn-row">
        {onDelete && <button className="btn danger" onClick={onDelete}>Supprimer</button>}
        <button className="btn primary" disabled={!form.name.trim() || form.target_amount <= 0 || form.target_date < today} onClick={() => onSave({ ...form, name: form.name.trim() })}>Enregistrer</button>
      </div>
    </Sheet>
  )
}
