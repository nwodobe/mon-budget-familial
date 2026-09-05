import { Capacitor, registerPlugin } from '@capacitor/core'
import { supabase } from './supabase'

export const PLAY_PRODUCTS = {
  monthly: 'premium_monthly',
  annual: 'premium_annual',
} as const

export type PlayPlanKey = keyof typeof PLAY_PRODUCTS

export type PlayProduct = {
  productId: string
  title: string
  description: string
  formattedPrice: string
  offerToken: string
  basePlanId?: string
  offerId?: string | null
  offerTags?: string[]
}

type PurchaseResult = {
  productId: string
  purchaseToken: string
  orderId?: string
  acknowledged: boolean
}

type RestoreResult = { purchases: PurchaseResult[] }

interface PlayBillingPlugin {
  getProducts(options: { productIds: string[] }): Promise<{ products: PlayProduct[] }>
  purchase(options: { productId: string; offerToken?: string; obfuscatedAccountId: string }): Promise<PurchaseResult>
  restore(): Promise<RestoreResult>
}

const PlayBilling = registerPlugin<PlayBillingPlugin>('PlayBilling')

export function billingAvailable(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'
}

export async function loadPlayProducts(): Promise<PlayProduct[]> {
  if (!billingAvailable()) return []
  const { products } = await PlayBilling.getProducts({ productIds: Object.values(PLAY_PRODUCTS) })
  return products
}

export async function buyPlayProduct(product: PlayProduct): Promise<PurchaseResult> {
  if (!billingAvailable()) throw new Error('Google Play Billing est disponible uniquement dans l’application Android.')
  const userId = await requireUserId()
  const purchase = await PlayBilling.purchase({
    productId: product.productId,
    offerToken: product.offerToken,
    obfuscatedAccountId: await sha256(userId),
  })
  await verifyPurchase(purchase)
  return purchase
}

export async function restorePlayPurchases(): Promise<number> {
  if (!billingAvailable()) return 0
  await requireUserId()
  const { purchases } = await PlayBilling.restore()
  let restored = 0
  for (const purchase of purchases) {
    await verifyPurchase(purchase)
    restored += 1
  }
  return restored
}

async function requireUserId(): Promise<string> {
  if (!supabase) throw new Error('La sauvegarde cloud doit être configurée pour activer Premium.')
  const { data } = await supabase.auth.getSession()
  const id = data.session?.user.id
  if (!id) throw new Error('Connectez-vous à votre compte avant d’activer Premium.')
  return id
}

async function verifyPurchase(purchase: PurchaseResult): Promise<void> {
  if (!supabase) throw new Error('La sauvegarde cloud doit être configurée pour activer Premium.')
  const { data, error } = await supabase.functions.invoke('verify-play-purchase', {
    body: { productId: purchase.productId, purchaseToken: purchase.purchaseToken },
  })
  if (error) throw new Error(error.message || 'Impossible de vérifier l’achat Google Play.')
  if (!data?.entitled) throw new Error('L’achat n’a pas encore été validé par Google Play.')
}

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}
