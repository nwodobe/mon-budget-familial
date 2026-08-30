/**
 * Modele de donnees de Mon Budget Familial.
 *
 * Regle transversale : tous les montants sont des ENTIERS de FCFA (XOF).
 * Le franc CFA n'a pas de subdivision utilisee au quotidien ; travailler en
 * entiers supprime toute erreur de virgule flottante dans les cumuls.
 *
 * Toutes les dates sont des chaines ISO "YYYY-MM-DD" (date civile locale,
 * jamais un instant UTC) et tous les mois des chaines "YYYY-MM".
 */

export type IsoDate = string
export type IsoMonth = string

export type PaymentMethod = 'especes' | 'wave' | 'orange_money' | 'mtn_momo' | 'banque' | 'autre'

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'especes', label: 'Especes' },
  { value: 'wave', label: 'Wave' },
  { value: 'orange_money', label: 'Orange Money' },
  { value: 'mtn_momo', label: 'MTN MoMo' },
  { value: 'banque', label: 'Banque' },
  { value: 'autre', label: 'Autre' },
]

export type ChargeFrequency = 'mensuelle' | 'trimestrielle' | 'annuelle' | 'ponctuelle'

/** Enregistrement synchronisable : identifiant client, horodatage, effacement logique. */
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
  /** Ordre d'affichage. */
  position: number
}

/** Enveloppe redefinie pour un mois donne (sinon on retient Envelope.planned). */
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
  /** Renseigne quand la depense est le reglement d'une charge obligatoire. */
  charge_id: string | null
  /** Justification saisie quand l'utilisateur a force un depassement d'enveloppe. */
  override_reason: string
}

export interface Charge extends SyncedRecord {
  label: string
  amount: number
  /** Jour d'echeance dans le mois, 1 a 31 (rabattu sur le dernier jour si besoin). */
  due_day: number
  frequency: ChargeFrequency
  /** Premier mois ou la charge est due. Pour "ponctuelle", le seul mois du. */
  start_month: IsoMonth
  active: boolean
}

/** Reglement d'une charge pour un mois donne. */
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
  /** Poche d'epargne qui alimente l'objectif ; null = suivi manuel. */
  pocket_id: string | null
  /** Montant deja acquis hors poche (apport initial declare). */
  initial_amount: number
}

export interface Settings {
  /** Taux d'epargne minimum, en pourcentage du revenu du mois. */
  savings_rate_pct: number
  /** Seuil d'alerte precoce sur une enveloppe, en pourcentage. */
  warn_threshold_pct: number
  household_name: string
  members: string[]
  updated_at: string
}

export const DEFAULT_SETTINGS: Settings = {
  savings_rate_pct: 15,
  warn_threshold_pct: 80,
  household_name: 'Ma famille',
  members: ['Moi'],
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
  }
}

/** Les collections synchronisables, dans l'ordre d'application des dependances. */
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
] as const

export type CollectionName = (typeof COLLECTIONS)[number]
