import { Capacitor } from '@capacitor/core'
import { supabase } from './supabase'

export type PremiumEntitlement = {
  active: boolean
  productId?: string
  premiumUntil?: string
}

const CACHE_KEY = 'mbf_premium_entitlement_v1'

export function premiumGateEnabled(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'
}

export async function getPremiumEntitlement(): Promise<PremiumEntitlement> {
  if (!premiumGateEnabled()) return { active: true }
  if (!supabase) return fromCache()

  const { data: sessionData } = await supabase.auth.getSession()
  const user = sessionData.session?.user
  if (!user) return { active: false }

  const { data, error } = await supabase
    .from('mbf_entitlements')
    .select('product_id,premium_until')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error || !data?.premium_until) return fromCache(user.id)

  const entitlement: PremiumEntitlement = {
    active: new Date(data.premium_until).getTime() > Date.now(),
    productId: data.product_id,
    premiumUntil: data.premium_until,
  }
  localStorage.setItem(CACHE_KEY, JSON.stringify({ ...entitlement, userId: user.id }))
  return entitlement
}

function fromCache(userId?: string): PremiumEntitlement {
  try {
    const parsed = JSON.parse(localStorage.getItem(CACHE_KEY) ?? '{}') as PremiumEntitlement & { userId?: string }
    if (userId && parsed.userId !== userId) return { active: false }
    if (!parsed.premiumUntil) return { active: false }
    return {
      active: new Date(parsed.premiumUntil).getTime() > Date.now(),
      productId: parsed.productId,
      premiumUntil: parsed.premiumUntil,
    }
  } catch {
    return { active: false }
  }
}
