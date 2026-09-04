import type { CurrencyCode } from './currency'

export type IsoDate = string
export type IsoMonth = string

export type PaymentMethod = 'especes' | 'wave' | 'orange_money' | 'mtn_momo' | 'banque' | 'autre'

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'especes', label: 'Espèces' },
  { value: 'wave', label: 'Wave' },
  { value: 'orange_money', label: 'Orange Money' },
  { value: 'mtn_momo', label: 'MTN MoMo' },
  { value: 'banque', label: 'Banque' },
  { value: 'autre', label: 'Autre' },
]

export type ChargeFrequency = 'mensuelle' | 'trimestrielle' | 'annuelle' | 'ponctuelle'
export type DisciplineFlag = 'envelope-warning' | 'envelope-over' | 'global-warning' | 'global-danger'

export interface SyncedRecord {
  id: string
  updated_at: string
  deleted_at: string | null
}

export interface Income extends SyncedRecord {
  date: IsoDate
  amount: number
  source: string
  method: PaymentMethod
  recurring: boolean
  note: string
}

export interface Envelope extends SyncedRecord {
  name: string
  planned: number
  position: number
}

export interface BudgetOverride extends SyncedRecord {
  month: IsoMonth
  envelope_id: string
  planned: number
}

export interface Expense extends SyncedRecord {
  date: IsoDate
  amount: number
  envelope_id: string | null
  method: PaymentMethod
  description: string
  member: string
  charge_id: string | null
  override_reason: string
  discipline_flags?: DisciplineFlag[]
}

export interface Charge extends SyncedRecord {
  label: string
  amount: number
  due_day: number
  frequency: ChargeFrequency
  start_month: IsoMonth
  active: boolean
}

export interface ChargePayment extends SyncedRecord {
  charge_id: string
  month: IsoMonth
  paid_date: IsoDate
  amount: number
  expense_id: string | null
}

export interface Pocket extends SyncedRecord {
  name: string
  position: number
}

export type SavingsKind = 'depot' | 'retrait'

export interface SavingsMovement extends SyncedRecord {
  date: IsoDate
  amount: number
  pocket_id: string
  kind: SavingsKind
  note: string
}

export interface Goal extends SyncedRecord {
  name: string
  target_amount: number
  target_date: IsoDate
  pocket_id: string | null
  initial_amount: number
}

export interface Provision extends SyncedRecord {
  name: string
  target_amount: number
  target_date: IsoDate
  pocket_id: string | null
  initial_amount: number
  active: boolean
}

export interface Settings {
  savings_rate_pct: number
  warn_threshold_pct: number
  household_name: string
  members: string[]
  currency: CurrencyCode
  updated_at: string
}

export const DEFAULT_SETTINGS: Settings = {
  savings_rate_pct: 15,
  warn_threshold_pct: 80,
  household_name: 'Ma famille',
  members: ['Moi'],
  currency: 'XOF',
  updated_at: '1970-01-01T00:00:00.000Z',
}

export interface Ledger {
  settings: Settings
  incomes: Income[]
  envelopes: Envelope[]
  budget_overrides: BudgetOverride[]
  expenses: Expense[]
  charges: Charge[]
  charge_payments: ChargePayment[]
  pockets: Pocket[]
  savings: SavingsMovement[]
  goals: Goal[]
  provisions: Provision[]
}

export function emptyLedger(): Ledger {
  return {
    settings: { ...DEFAULT_SETTINGS },
    incomes: [],
    envelopes: [],
    budget_overrides: [],
    expenses: [],
    charges: [],
    charge_payments: [],
    pockets: [],
    savings: [],
    goals: [],
    provisions: [],
  }
}

export const COLLECTIONS = [
  'envelopes',
  'pockets',
  'charges',
  'incomes',
  'budget_overrides',
  'expenses',
  'charge_payments',
  'savings',
  'goals',
  'provisions',
] as const

export type CollectionName = (typeof COLLECTIONS)[number]
