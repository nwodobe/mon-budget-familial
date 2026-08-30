import { useState } from 'react'
import { dateLabel } from '../domain/dates'
import { useApp } from '../state/AppContext'
import { AmountInput, Bar, Card, Empty, Field, Money, Row, Sheet } from './common'

export default function Objectifs() {
  const { goals, pockets, create, remove } = useApp()
  const [adding, setAdding] = useState(false)

  return (
    <>
      <Card
        title="Objectifs financiers"
        action={
          <button className="btn small ghost" onClick={() => setAdding(true)}>
            Ajouter
          </button>
        }
      >
        {goals.length === 0 ? (
          <Empty text="Un objectif transforme une envie en effort mensuel chiffre." />
        ) : (
          goals.map((g) => (
            <div className="env" key={g.id}>
              <div className="env-head">
                <div className="env-name">{g.name}</div>
                <button className="btn small ghost" onClick={() => remove('goals', g.id)}>
                  Retirer
                </button>
              </div>
              <Bar pct={g.progressPct} state={g.reachable ? 'sain' : 'depasse'} />
              <div className="rows mt">
                <Row k="Montant cible" v={<Money value={g.target} />} />
                <Row k="Deja disponible" v={<Money value={g.saved} />} tone="pos" />
                <Row k="Reste a reunir" v={<Money value={g.remaining} />} />
                <Row
                  k="Effort mensuel necessaire"
                  v={<Money value={g.monthlyNeeded} />}
                  note={
                    g.monthsLeft > 0
                      ? `${g.monthsLeft} mois jusqu au ${dateLabel(g.targetDate)}`
                      : `Echeance du ${dateLabel(g.targetDate)} atteinte`
                  }
                  tone={g.reachable ? undefined : 'neg'}
                />
                <Row k="Progression" v={`${g.progressPct} %`} />
              </div>
              {!g.reachable && (
                <div className="banner warn mt">
                  <span className="dot danger" />
                  La date cible est passee et le montant n est pas reuni. Repoussez l echeance ou revoyez le montant.
                </div>
              )}
            </div>
          ))
        )}
      </Card>

      {pockets.length === 0 && (
        <div className="banner warn">
          <span className="dot warn" />
          Sans poche d epargne, un objectif ne peut pas se remplir automatiquement. Creez-en une dans Epargne.
        </div>
      )}

      {adding && (
        <GoalSheet
          onClose={() => setAdding(false)}
          onSave={(row) => {
            create('goals', row)
            setAdding(false)
          }}
        />
      )}
    </>
  )
}

function GoalSheet({
  onClose,
  onSave,
}: {
  onClose: () => void
  onSave: (row: {
    name: string
    target_amount: number
    target_date: string
    pocket_id: string | null
    initial_amount: number
  }) => void
}) {
  const { pockets, today } = useApp()
  const [name, setName] = useState('')
  const [target, setTarget] = useState(0)
  const [targetDate, setTargetDate] = useState(`${Number(today.slice(0, 4)) + 1}-12-31`)
  const [pocketId, setPocketId] = useState(pockets[0]?.id ?? '')
  const [initial, setInitial] = useState(0)

  return (
    <Sheet title="Nouvel objectif" onClose={onClose}>
      <Field label="Intitule">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Vacances Thailande" autoFocus />
      </Field>
      <Field label="Montant cible en FCFA">
        <AmountInput value={target} onChange={setTarget} />
      </Field>
      <Field label="Date cible">
        <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
      </Field>
      <Field label="Poche d epargne qui alimente l objectif" hint="Le solde de cette poche compte automatiquement dans la progression.">
        <select value={pocketId} onChange={(e) => setPocketId(e.target.value)}>
          <option value="">Aucune - suivi manuel</option>
          {pockets.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Montant deja acquis hors poche">
        <AmountInput value={initial} onChange={setInitial} />
      </Field>
      <button
        className="btn primary"
        disabled={name.trim() === '' || target <= 0}
        onClick={() =>
          onSave({
            name: name.trim(),
            target_amount: target,
            target_date: targetDate,
            pocket_id: pocketId || null,
            initial_amount: initial,
          })
        }
      >
        Creer l objectif
      </button>
    </Sheet>
  )
}
