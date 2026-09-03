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
  purchase(options: { productId: string; offerToken?: string }): Promise<PurchaseResult>
  restore(): Promise<RestoreResult>
  acknowledge(options: { purchaseToken: string }): Promise<void>
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
  const purchase = await PlayBilling.purchase({ productId: product.productId, offerToken: product.offerToken })
  await verifyAndAcknowledge(purchase)
  return purchase
}

export async function restorePlayPurchases(): Promise<number> {
  if (!billingAvailable()) return 0
  const { purchases } = await PlayBilling.restore()
  let restored = 0
  for (const purchase of purchases) {
    await verifyAndAcknowledge(purchase)
    restored += 1
  }
  return restored
}

async function verifyAndAcknowledge(purchase: PurchaseResult): Promise<void> {
  if (!supabase) throw new Error('La sauvegarde cloud doit être configurée pour activer Premium.')
  const { data: sessionData } = await supabase.auth.getSession()
  if (!sessionData.session) throw new Error('Connectez-vous à votre compte avant d’activer Premium.')

  const { data, error } = await supabase.functions.invoke('verify-play-purchase', {
    body: { productId: purchase.productId, purchaseToken: purchase.purchaseToken },
  })
  if (error) throw new Error(error.message || 'Impossible de vérifier l’achat Google Play.')
  if (!data?.entitled) throw new Error('L’achat n’a pas encore été validé par Google Play.')

  if (!purchase.acknowledged) await PlayBilling.acknowledge({ purchaseToken: purchase.purchaseToken })
}
