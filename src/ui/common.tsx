import type { ReactNode } from 'react'
import { formatInt } from '../domain/engine'
import { useApp } from '../state/AppContext'

export function Money({ value, currency = true }: { value: number; currency?: boolean }) {
  const { hideAmounts } = useApp()
  if (hideAmounts) return <span>{currency ? '••• FCFA' : '•••'}</span>
  return (
    <span>
      {formatInt(value)}
      {currency ? ' FCFA' : ''}
    </span>
  )
}

/** Meme regle de masquage que <Money>, pour les textes composes. */
export function useMoneyText(): (value: number, currency?: boolean) => string {
  const { hideAmounts } = useApp()
  return (value, currency = true) => {
    if (hideAmounts) return currency ? '••• FCFA' : '•••'
    return formatInt(value) + (currency ? ' FCFA' : '')
  }
}

export function Card({ title, children, action }: { title?: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="card">
      {title && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

export function Row({ k, v, note, tone }: { k: string; v: ReactNode; note?: string; tone?: 'neg' | 'pos' }) {
  return (
    <div className="row">
      <div>
        <div className="k">{k}</div>
        {note && <div className="row-note">{note}</div>}
      </div>
      <div className={`v ${tone ?? ''}`}>{v}</div>
    </div>
  )
}

export function Bar({ pct, state }: { pct: number; state?: 'sain' | 'attention' | 'depasse' }) {
  const cls = state === 'depasse' ? 'danger' : state === 'attention' ? 'warn' : ''
  return (
    <div className="bar">
      <span className={cls} style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
    </div>
  )
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
      {hint && <div className="hint">{hint}</div>}
    </div>
  )
}

export function Sheet({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: ReactNode
}) {
  return (
    <div
      className="sheet-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="sheet-head">
          <h2>{title}</h2>
          <button className="btn small ghost" onClick={onClose}>
            Fermer
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Empty({ text }: { text: string }) {
  return <div className="empty">{text}</div>
}

/** Saisie de montant en entiers de FCFA, avec separateurs de milliers a l'affichage. */
export function AmountInput({
  value,
  onChange,
  autoFocus,
}: {
  value: number
  onChange: (v: number) => void
  autoFocus?: boolean
}) {
  return (
    <input
      className="amount-input"
      inputMode="numeric"
      autoFocus={autoFocus}
      value={value === 0 ? '' : formatInt(value)}
      placeholder="0"
      onChange={(e) => {
        const digits = e.target.value.replace(/[^\d]/g, '')
        onChange(digits === '' ? 0 : Math.min(Number(digits), 999999999999))
      }}
    />
  )
}
