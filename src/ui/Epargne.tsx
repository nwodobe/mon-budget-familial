import { useState } from 'react'
import { dateLabel, monthLabel } from '../domain/dates'
import { useApp } from '../state/AppContext'
import { AmountInput, Bar, Card, Empty, Field, Money, Row, Sheet } from './common'

const POCKET_SUGGESTIONS = [
  'Epargne de securite', 'Vacances', 'Projet immobilier', 'Voiture',
  'Investissement', 'Ecole des enfants', 'Urgence',
]

export default function Epargne() {
  const { ledger, pockets, snapshot, month, create, remove, updateSettings } = useApp()
  const [moving, setMoving] = useState<'depot' | 'retrait' | null>(null)

  const total = pockets.reduce((s, p) => s + p.balance, 0)
  const progress = snapshot.savingsTarget > 0 ? Math.round((snapshot.savingsDone / snapshot.savingsTarget) * 100) : 0

  const movements = ledger.savings
    .filter((s) => s.deleted_at === null && s.date.slice(0, 7) === month)
    .sort((a, b) => b.date.localeCompare(a.date))

  return (
    <>
      <Card title={`Epargne de ${monthLabel(month)}`}>
        <div className="rows">
          <Row
            k="Objectif du mois"
            v={<Money value={snapshot.savingsTarget} />}
            note={`${ledger.settings.savings_rate_pct} % des revenus du mois`}
          />
          <Row k="Deja epargne" v={<Money value={snapshot.savingsDone} />} tone="pos" />
          <Row
            k="Reste a mettre de cote"
            v={<Money value={snapshot.savingsRemaining} />}
            tone={snapshot.savingsRemaining > 0 ? 'neg' : 'pos'}
          />
        </div>
        <div className="mt">
          <Bar pct={Math.min(100, progress)} state={progress >= 100 ? 'sain' : progress >= 50 ? 'attention' : 'depasse'} />
          <div className="tiny mt">{progress} % de votre objectif d epargne du mois.</div>
        </div>
        <div className="btn-row mt">
          <button className="btn primary" onClick={() => setMoving('depot')} disabled={pockets.length === 0}>
            Epargner
          </button>
          <button className="btn" onClick={() => setMoving('retrait')} disabled={pockets.length === 0}>
            Retirer
          </button>
        </div>
      </Card>

      <Card title="Taux d epargne">
        <Field label={`${ledger.settings.savings_rate_pct} % de chaque revenu sont reserves`}>
          <input
            type="range"
            min={0}
            max={50}
            step={1}
            value={ledger.settings.savings_rate_pct}
            onChange={(e) => updateSettings({ savings_rate_pct: Number(e.target.value) })}
          />
        </Field>
        <div className="tiny">
          Cette somme est retiree du disponible a depenser des qu un revenu est enregistre. C est le principe
          "epargner avant de depenser".
        </div>
      </Card>

      <Card title="Poches d epargne">
        {pockets.length === 0 ? (
          <>
            <Empty text="Creez au moins une poche pour ranger votre epargne." />
            <div className="chips">
              {POCKET_SUGGESTIONS.map((p, i) => (
                <button key={p} className="chip" onClick={() => create('pockets', { name: p, position: i })}>
                  {p}
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="list">
              {pockets.map((p) => (
                <div className="item" key={p.id}>
                  <div className="main">
                    <div className="title">{p.name}</div>
                  </div>
                  <div className="amt">
                    <Money value={p.balance} />
                  </div>
                  <button className="btn small ghost" onClick={() => remove('pockets', p.id)}>
                    Retirer
                  </button>
                </div>
              ))}
              <div className="item">
                <div className="main">
                  <div className="title">Total epargne</div>
                </div>
                <div className="amt">
                  <Money value={total} />
                </div>
              </div>
            </div>
            <div className="chips mt">
              {POCKET_SUGGESTIONS.filter((s) => !pockets.some((p) => p.name === s)).map((p) => (
                <button key={p} className="chip" onClick={() => create('pockets', { name: p, position: pockets.length })}>
                  {p}
                </button>
              ))}
            </div>
          </>
        )}
      </Card>

      <Card title={`Mouvements de ${monthLabel(month)}`}>
        {movements.length === 0 ? (
          <Empty text="Aucun mouvement ce mois." />
        ) : (
          <div className="list">
            {movements.map((m) => (
              <div className="item" key={m.id}>
                <div className="main">
                  <div className="title">{pockets.find((p) => p.id === m.pocket_id)?.name ?? 'Poche supprimee'}</div>
                  <div className="meta">
                    {dateLabel(m.date)} - {m.kind === 'depot' ? 'Depot' : 'Retrait'}
                    {m.note ? ` - ${m.note}` : ''}
                  </div>
                </div>
                <div className={`amt ${m.kind === 'depot' ? '' : 'strike'}`}>
                  {m.kind === 'depot' ? '+' : '-'}
                  <Money value={m.amount} />
                </div>
                <button className="btn small ghost" onClick={() => remove('savings', m.id)}>
                  Retirer
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {moving && (
        <SavingsSheet
          kind={moving}
          onClose={() => setMoving(null)}
          onSave={(row) => {
            create('savings', row)
            setMoving(null)
          }}
        />
      )}
    </>
  )
}

function SavingsSheet({
  kind,
  onClose,
  onSave,
}: {
  kind: 'depot' | 'retrait'
  onClose: () => void
  onSave: (row: { date: string; amount: number; pocket_id: string; kind: 'depot' | 'retrait'; note: string }) => void
}) {
  const { pockets, today, snapshot } = useApp()
  const [amount, setAmount] = useState(kind === 'depot' ? snapshot.savingsRemaining : 0)
  const [pocketId, setPocketId] = useState(pockets[0]?.id ?? '')
  const [date, setDate] = useState(today)
  const [note, setNote] = useState('')

  return (
    <Sheet title={kind === 'depot' ? 'Mettre de cote' : 'Retirer de l epargne'} onClose={onClose}>
      <Field label="Montant en FCFA">
        <AmountInput value={amount} onChange={setAmount} autoFocus />
      </Field>
      <Field label="Poche">
        <select value={pocketId} onChange={(e) => setPocketId(e.target.value)}>
          {pockets.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Date">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>
      <Field label="Commentaire">
        <input value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <button
        className="btn primary"
        disabled={amount <= 0 || pocketId === ''}
        onClick={() => onSave({ date, amount, pocket_id: pocketId, kind, note: note.trim() })}
      >
        Enregistrer
      </button>
    </Sheet>
  )
}
