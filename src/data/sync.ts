import { COLLECTIONS, type CollectionName, type Ledger } from '../domain/types'
import { changesSince, mergeCollection, nowIso, type SyncMeta } from './storage'
import { supabase } from './supabase'

export interface SyncResult {
  ok: boolean
  pushed: number
  pulled: number
  message: string
}

const TABLE: Record<CollectionName, string> = {
  envelopes: 'mbf_envelopes',
  pockets: 'mbf_pockets',
  charges: 'mbf_charges',
  incomes: 'mbf_incomes',
  budget_overrides: 'mbf_budget_overrides',
  expenses: 'mbf_expenses',
  charge_payments: 'mbf_charge_payments',
  savings: 'mbf_savings',
  goals: 'mbf_goals',
  provisions: 'mbf_provisions',
}

export async function synchronize(
  ledger: Ledger,
  meta: SyncMeta,
): Promise<{ ledger: Ledger; meta: SyncMeta; result: SyncResult }> {
  if (!supabase) {
    return {
      ledger,
      meta,
      result: { ok: false, pushed: 0, pulled: 0, message: 'Aucun serveur configure : les donnees restent sur cet appareil.' },
    }
  }

  const { data: sessionData } = await supabase.auth.getSession()
  const user = sessionData.session?.user
  if (!user) {
    return { ledger, meta, result: { ok: false, pushed: 0, pulled: 0, message: 'Connectez-vous pour sauvegarder dans le cloud.' } }
  }

  if (meta.owner_id && meta.owner_id !== user.id) {
    return {
      ledger,
      meta,
      result: {
        ok: false,
        pushed: 0,
        pulled: 0,
        message: "Les donnees de cet appareil appartiennent a un autre compte. Reinitialisez l'appareil avant de synchroniser.",
      },
    }
  }

  const startedAt = nowIso()
  let pushed = 0
  let pulled = 0

  try {
    const changes = changesSince(ledger, meta.last_push)
    for (const name of COLLECTIONS) {
      const rows = changes[name] as Record<string, unknown>[]
      if (rows.length === 0) continue
      const payload = rows.map((r) => ({ ...r, user_id: user.id }))
      const { error } = await supabase.from(TABLE[name]).upsert(payload, { onConflict: 'id' })
      if (error) throw new Error(`${TABLE[name]} : ${error.message}`)
      pushed += rows.length
    }

    const { error: settingsError } = await supabase.from('mbf_settings').upsert(
      { user_id: user.id, ...ledger.settings },
      { onConflict: 'user_id' },
    )
    if (settingsError) throw new Error(`mbf_settings : ${settingsError.message}`)

    let next: Ledger = { ...ledger }
    for (const name of COLLECTIONS) {
      let query = supabase.from(TABLE[name]).select('*')
      if (meta.last_pull) query = query.gt('updated_at', meta.last_pull)
      const { data, error } = await query
      if (error) throw new Error(`${TABLE[name]} : ${error.message}`)
      const incoming = (data ?? []).map(stripServerColumns)
      if (incoming.length > 0) {
        pulled += incoming.length
        next = {
          ...next,
          [name]: mergeCollection(next[name] as never, incoming as never),
        }
      }
    }

    const { data: remoteSettings } = await supabase
      .from('mbf_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()
    if (remoteSettings && String(remoteSettings.updated_at) > next.settings.updated_at) {
      next = {
        ...next,
        settings: {
          savings_rate_pct: Number(remoteSettings.savings_rate_pct),
          warn_threshold_pct: Number(remoteSettings.warn_threshold_pct),
          household_name: String(remoteSettings.household_name),
          members: (remoteSettings.members as string[]) ?? ['Moi'],
          updated_at: String(remoteSettings.updated_at),
        },
      }
    }

    const newMeta: SyncMeta = {
      last_pull: startedAt,
      last_push: startedAt,
      owner_id: user.id,
      last_error: null,
    }
    return {
      ledger: next,
      meta: newMeta,
      result: {
        ok: true,
        pushed,
        pulled,
        message: `Synchronise. ${pushed} ligne(s) envoyee(s), ${pulled} recue(s).`,
      },
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return {
      ledger,
      meta: { ...meta, last_error: message },
      result: { ok: false, pushed, pulled, message: `Synchronisation incomplete : ${message}` },
    }
  }
}

function stripServerColumns(row: Record<string, unknown>): Record<string, unknown> {
  const { user_id: _user, created_at: _created, ...rest } = row
  void _user
  void _created
  return rest
}
