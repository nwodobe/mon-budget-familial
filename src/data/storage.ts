import { COLLECTIONS, DEFAULT_SETTINGS, emptyLedger, type CollectionName, type Ledger } from '../domain/types'

/**
 * Persistance locale. L'application est "local d'abord" : tout est ecrit ici
 * immediatement, sans reseau, et la synchronisation Supabase n'est qu'une
 * copie differee. Une coupure Internet ne fait donc jamais perdre une saisie.
 */

const LEDGER_KEY = 'mbf.ledger.v1'
const META_KEY = 'mbf.meta.v1'

export interface SyncMeta {
  /** Horodatage du dernier import reussi depuis le serveur. */
  last_pull: string | null
  last_push: string | null
  /** Compte auquel appartiennent les donnees locales. */
  owner_id: string | null
  last_error: string | null
}

const DEFAULT_META: SyncMeta = { last_pull: null, last_push: null, owner_id: null, last_error: null }

export function nowIso(): string {
  return new Date().toISOString()
}

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  // Repli deterministe pour les environnements sans WebCrypto.
  return 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export function loadLedger(): Ledger {
  try {
    const raw = localStorage.getItem(LEDGER_KEY)
    if (!raw) return emptyLedger()
    const parsed = JSON.parse(raw) as Partial<Ledger>
    const base = emptyLedger()
    return {
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) },
      incomes: parsed.incomes ?? base.incomes,
      envelopes: parsed.envelopes ?? base.envelopes,
      budget_overrides: parsed.budget_overrides ?? base.budget_overrides,
      expenses: parsed.expenses ?? base.expenses,
      charges: parsed.charges ?? base.charges,
      charge_payments: parsed.charge_payments ?? base.charge_payments,
      pockets: parsed.pockets ?? base.pockets,
      savings: parsed.savings ?? base.savings,
      goals: parsed.goals ?? base.goals,
    }
  } catch {
    return emptyLedger()
  }
}

export function saveLedger(ledger: Ledger): void {
  localStorage.setItem(LEDGER_KEY, JSON.stringify(ledger))
}

export function loadMeta(): SyncMeta {
  try {
    const raw = localStorage.getItem(META_KEY)
    return raw ? { ...DEFAULT_META, ...(JSON.parse(raw) as Partial<SyncMeta>) } : { ...DEFAULT_META }
  } catch {
    return { ...DEFAULT_META }
  }
}

export function saveMeta(meta: SyncMeta): void {
  localStorage.setItem(META_KEY, JSON.stringify(meta))
}

export function clearLocal(): void {
  localStorage.removeItem(LEDGER_KEY)
  localStorage.removeItem(META_KEY)
}

/**
 * Fusionne une ligne entrante dans une collection.
 *
 * Cle de deduplication : l'identifiant, genere par le client. Rejouer deux
 * fois la meme synchronisation ne peut donc pas creer de doublon. En cas de
 * conflit, la version dont `updated_at` est la plus recente l'emporte.
 */
export function mergeRow<T extends { id: string; updated_at: string }>(rows: T[], incoming: T): T[] {
  const index = rows.findIndex((r) => r.id === incoming.id)
  if (index === -1) return [...rows, incoming]
  const existing = rows[index]
  if (incoming.updated_at > existing.updated_at) {
    const copy = rows.slice()
    copy[index] = incoming
    return copy
  }
  return rows
}

export function mergeCollection<T extends { id: string; updated_at: string }>(rows: T[], incoming: T[]): T[] {
  let out = rows
  for (const row of incoming) out = mergeRow(out, row)
  return out
}

/** Lignes modifiees depuis un horodatage donne, a pousser vers le serveur. */
export function changesSince(ledger: Ledger, since: string | null): Record<CollectionName, unknown[]> {
  const out = {} as Record<CollectionName, unknown[]>
  for (const name of COLLECTIONS) {
    const rows = ledger[name] as { updated_at: string }[]
    out[name] = since === null ? rows.slice() : rows.filter((r) => r.updated_at > since)
  }
  return out
}
