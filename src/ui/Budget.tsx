import { useState } from 'react'
import { monthLabel } from '../domain/dates'
import { formatInt } from '../domain/engine'
import { useApp } from '../state/AppContext'
import { AmountInput, Bar, Card, Empty, Field, Money, Sheet } from './common'

const SUGGESTIONS = [
  'Alimentation', 'Transport', 'Carburant', 'Maison', 'Sante', 'Telephone / Internet',
  'Electricite', 'Eau', 'Aide familiale', 'Loisirs', 'Restaurant', 'Imprevus',
]

export default function Budget() {
  const { snapshot, ledger, month, create, update, remove } = useApp()
  const [editing, setEditing] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)

  const totalPlanned = snapshot.envelopes.reduce((s, e) => s + e.planned, 0)
  const totalSpent = snapshot.envelopes.reduce((s, e) => s + e.spent, 0)

  const used = new Set(snapshot.envelopes.map((e) => e.name.toLowerCase()))
  const missing = SUGGESTIONS.filter((s) => !used.has(s.toLowerCase()))

  return (
    <>
      <Card title={`Enveloppes de ${monthLabel(month)}`}>
        <div className="rows">
          <div className="row">
            <div className="k">Total prevu</div>
            <div className="v">
              <Money value={totalPlanned} />
            </div>
          </div>
          <div className="row">
            <div className="k">Total depense</div>
            <div className="v">
              <Money value={totalSpent} />
            </div>
          </div>
          <div className="row">
            <div className="k">Reste</div>
            <div className={`v ${totalPlanned - totalSpent < 0 ? 'neg' : 'pos'}`}>
              <Money value={totalPlanned - totalSpent} />
            </div>
          </div>
        </div>
      </Card>

      <Card title="Detail" action={<button className="btn small ghost" onClick={() => setAdding(true)}>Ajouter</button>}>
        {snapshot.envelopes.length === 0 ? (
          <Empty text="Creez vos enveloppes : c est ce qui permet a l application de vous alerter avant un depassement." />
        ) : (
          snapshot.envelopes.map((e) => (
            <div className="env" key={e.id}>
              <div className="env-head">
                <div className="env-name">
                  <span className={`dot ${e.state === 'depasse' ? 'danger' : e.state === 'attention' ? 'warn' : 'ok'}`} />
                  {e.name}
                </div>
                <button className="btn small ghost" onClick={() => setEditing(e.id)}>
                  Modifier
                </button>
              </div>
              <Bar pct={e.usedPct} state={e.state} />
              <div className="env-sub">
                <span>
                  <Money value={e.spent} currency={false} /> / <Money value={e.planned} /> ({e.usedPct} %)
                </span>
                <span>
                  {e.remaining >= 0 ? 'Reste ' : 'Depassement '}
                  <Money value={Math.abs(e.remaining)} />
                </span>
              </div>
            </div>
          ))
        )}
      </Card>

      {missing.length > 0 && (
        <Card title="Categories courantes">
          <div className="chips">
            {missing.map((s) => (
              <button
                key={s}
                className="chip"
                onClick={() => create('envelopes', { name: s, planned: 0, position: snapshot.envelopes.length })}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="tiny mt">Ajoutez une categorie puis fixez son montant.</div>
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
          title="Modifier l enveloppe"
          initialName={snapshot.envelopes.find((e) => e.id === editing)?.name ?? ''}
          initialPlanned={snapshot.envelopes.find((e) => e.id === editing)?.planned ?? 0}
          monthNote={`Le montant s applique a ${monthLabel(month)} et aux mois suivants.`}
          onDelete={() => {
            remove('envelopes', editing)
            setEditing(null)
          }}
          onClose={() => setEditing(null)}
          onSave={(name, planned) => {
            const base = ledger.envelopes.find((e) => e.id === editing)
            update('envelopes', editing, { name, planned })
            // Une redefinition existante pour ce mois primerait sur la nouvelle
            // valeur : on l'aligne pour que l'ecran dise la verite.
            const override = ledger.budget_overrides.find(
              (o) => o.envelope_id === editing && o.month === month && o.deleted_at === null,
            )
            if (override) update('budget_overrides', override.id, { planned })
            void base
            setEditing(null)
          }}
        />
      )}
    </>
  )
}

function EnvelopeSheet({
  title,
  initialName,
  initialPlanned,
  monthNote,
  onClose,
  onSave,
  onDelete,
}: {
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
      <Field label="Nom de l enveloppe">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Alimentation" autoFocus />
      </Field>
      <Field label="Budget mensuel en FCFA" hint={monthNote}>
        <AmountInput value={planned} onChange={setPlanned} />
      </Field>
      <div className="tiny mt">
        {planned > 0 ? `Soit ${formatInt(Math.floor(planned / 30))} FCFA par jour en moyenne.` : ''}
      </div>
      <div className="btn-row mt">
        {onDelete && (
          <button className="btn danger" onClick={onDelete}>
            Supprimer
          </button>
        )}
        <button className="btn primary" disabled={name.trim() === ''} onClick={() => onSave(name.trim(), planned)}>
          Enregistrer
        </button>
      </div>
    </Sheet>
  )
}
