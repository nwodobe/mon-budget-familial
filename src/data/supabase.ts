import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Client Supabase.
 *
 * Deux regles de securite tenues ici :
 *  - l'application n'accepte QUE la cle publique (anon / publishable). Une cle
 *    `service_role` arrivant cote navigateur contourne toutes les politiques
 *    RLS : on refuse de demarrer plutot que de l'utiliser.
 *  - sans configuration, l'application fonctionne en local seul. Elle ne se
 *    bloque pas et n'invente pas de compte.
 */

const url = (import.meta.env.VITE_SUPABASE_URL ?? '').trim()
const key = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim()

export function assertPublicKey(k: string): void {
  if (!k) return
  if (k.includes('service_role')) {
    throw new Error("Cle service_role detectee cote navigateur : demarrage refuse.")
  }
  // Les cles JWT heritees portent leur role dans la charge utile.
  const parts = k.split('.')
  if (parts.length === 3) {
    try {
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))) as { role?: string }
      if (payload.role && payload.role !== 'anon') {
        throw new Error(`Cle Supabase de role "${payload.role}" refusee : seule la cle anon est admise.`)
      }
    } catch (e) {
      if (e instanceof Error && e.message.startsWith('Cle Supabase')) throw e
      // Charge utile illisible : on laisse le serveur trancher.
    }
  }
}

assertPublicKey(key)

export const isCloudConfigured = Boolean(url && key)

export const supabase: SupabaseClient | null = isCloudConfigured
  ? createClient(url, key, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    })
  : null

export function cloudStatusLabel(): string {
  return isCloudConfigured ? 'Sauvegarde cloud configuree' : 'Mode local seul (aucun serveur configure)'
}
