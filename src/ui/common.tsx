import type { ReactNode } from 'react'
import { formatInt } from '../domain/engine'
import { currencyMeta, formatMoney } from '../domain/currency'
import { useApp } from '../state/AppContext'

export type IconName =
  | 'home' | 'wallet' | 'plus' | 'activity' | 'menu' | 'eye' | 'eyeOff'
  | 'income' | 'charges' | 'savings' | 'target' | 'prepare' | 'report'
  | 'settings' | 'cloud' | 'shield' | 'backup' | 'chevronLeft' | 'chevronRight'
  | 'search' | 'receipt' | 'user' | 'alert' | 'check'

const PATHS: Record<IconName, ReactNode> = {
  home: <><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></>,
  wallet: <><path d="M4 6h14a2 2 0 0 1 2 2v10H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h13"/><path d="M16 11h6v4h-6a2 2 0 0 1 0-4Z"/></>,
  plus: <><path d="M12 5v14"/><path d="M5 12h14"/></>,
  activity: <><path d="M4 4h16v16H4z"/><path d="M8 9h8M8 13h5M8 17h7"/></>,
  menu: <><path d="M5 7h14M5 12h14M5 17h14"/></>,
  eye: <><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/></>,
  eyeOff: <><path d="m3 3 18 18"/><path d="M10.6 6.2A10 10 0 0 1 12 6c6.5 0 10 6 10 6a17 17 0 0 1-2.1 3"/><path d="M6.7 6.7C3.6 8.6 2 12 2 12s3.5 6 10 6a10.5 10.5 0 0 0 4-.8"/></>,
  income: <><path d="M12 3v14"/><path d="m7 12 5 5 5-5"/><path d="M5 21h14"/></>,
  charges: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/><path d="M8 14h3M8 17h6"/></>,
  savings: <><path d="M5 12a7 7 0 1 1 14 0v5H5z"/><path d="M8 12h8M9 8h6M8 17v3M16 17v3"/></>,
  target: <><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></>,
  prepare: <><path d="M4 20V8l8-5 8 5v12"/><path d="M8 20v-6h8v6"/><path d="M12 7v4M10 9h4"/></>,
  report: <><path d="M5 20V10M12 20V4M19 20v-7"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M19 13.5v-3l-2-.7-.8-1.8.9-1.9-2.2-2.2-1.9.9-1.8-.8-.7-2h-3l-.7 2-1.8.8-1.9-.9L3 6.1l.9 1.9-.8 1.8-2 .7v3l2 .7.8 1.8-.9 1.9 2.2 2.2 1.9-.9 1.8.8.7 2h3l.7-2 1.8-.8 1.9.9 2.2-2.2-.9-1.9.8-1.8z"/></>,
  cloud: <><path d="M6 18h11a4 4 0 0 0 .7-7.9A6 6 0 0 0 6.2 8.4 4.5 4.5 0 0 0 6 18Z"/><path d="m9 14 3 3 3-3"/><path d="M12 10v7"/></>,
  shield: <><path d="M12 3 5 6v5c0 5 3 8 7 10 4-2 7-5 7-10V6z"/><path d="m9 12 2 2 4-4"/></>,
  backup: <><path d="M4 7h16v13H4z"/><path d="M8 3h8v4H8z"/><path d="M9 12h6M12 9v6"/></>,
  chevronLeft: <path d="m15 18-6-6 6-6"/>,
  chevronRight: <path d="m9 18 6-6-6-6"/>,
  search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
  receipt: <><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6M9 16h4"/></>,
  user: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
  alert: <><path d="M12 3 2.5 20h19z"/><path d="M12 9v5M12 17h.01"/></>,
  check: <path d="m5 12 4 4L19 6"/>,
}

export function Icon({ name, size = 22, className = '' }: { name: IconName; size?: number; className?: string }) {
  return <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{PATHS[name]}</svg>
}

export function Money({ value, currency = true }: { value: number; currency?: boolean }) {
  const { hideAmounts, ledger } = useApp()
  const code = ledger.settings.currency
  if (hideAmounts) return <span>{currency ? `••• ${currencyMeta(code).symbol}` : '•••'}</span>
  return <span>{currency ? formatMoney(value, code) : formatInt(value)}</span>
}

export function useMoneyText(): (value: number, currency?: boolean) => string {
  const { hideAmounts, ledger } = useApp()
  const code = ledger.settings.currency
  return (value, currency = true) => hideAmounts ? (currency ? `••• ${currencyMeta(code).symbol}` : '•••') : currency ? formatMoney(value, code) : formatInt(value)
}

export function Card({ title, children, action, className = '' }: { title?: string; children: ReactNode; action?: ReactNode; className?: string }) {
  return <section className={`card ${className}`}>{title && <div className="section-head"><h2>{title}</h2>{action}</div>}{children}</section>
}

export function StatCard({ label, value, tone = 'neutral' }: { label: string; value: ReactNode; tone?: 'neutral' | 'positive' | 'warning' | 'danger' }) {
  return <div className={`stat-card ${tone}`}><div className="stat-label">{label}</div><div className="stat-value">{value}</div></div>
}

export function Row({ k, v, note, tone }: { k: string; v: ReactNode; note?: string; tone?: 'neg' | 'pos' }) {
  return <div className="row"><div><div className="k">{k}</div>{note && <div className="row-note">{note}</div>}</div><div className={`v ${tone ?? ''}`}>{v}</div></div>
}

export function Bar({ pct, state }: { pct: number; state?: 'sain' | 'attention' | 'depasse' }) {
  const cls = state === 'depasse' ? 'danger' : state === 'attention' ? 'warn' : ''
  return <div className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.max(0, Math.min(100, pct))}><span className={cls} style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} /></div>
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <div className="field"><label>{label}</label>{children}{hint && <div className="hint">{hint}</div>}</div>
}

export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return <div className="sheet-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}><div className="sheet" role="dialog" aria-modal="true" aria-label={title}><div className="sheet-handle"/><div className="sheet-head"><h2>{title}</h2><button className="icon-button" aria-label="Fermer" onClick={onClose}>×</button></div>{children}</div></div>
}

export function Empty({ text, action }: { text: string; action?: ReactNode }) {
  return <div className="empty"><div className="empty-icon"><Icon name="receipt" /></div><div>{text}</div>{action && <div className="empty-action">{action}</div>}</div>
}

export function MenuItem({ icon, title, subtitle, onClick, danger = false }: { icon: IconName; title: string; subtitle?: string; onClick: () => void; danger?: boolean }) {
  return <button className={`menu-item ${danger ? 'danger' : ''}`} onClick={onClick}><span className="menu-icon"><Icon name={icon} size={21}/></span><span className="menu-copy"><strong>{title}</strong>{subtitle && <small>{subtitle}</small>}</span><Icon name="chevronRight" size={19} className="menu-chevron"/></button>
}

export function AmountInput({ value, onChange, autoFocus }: { value: number; onChange: (v: number) => void; autoFocus?: boolean }) {
  return <input className="amount-input" inputMode="numeric" autoFocus={autoFocus} value={value === 0 ? '' : formatInt(value)} placeholder="0" onChange={(e) => { const digits = e.target.value.replace(/[^\d]/g, ''); onChange(digits === '' ? 0 : Math.min(Number(digits), 999999999999)) }} />
}
