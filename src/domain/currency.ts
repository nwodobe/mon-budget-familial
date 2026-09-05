import { getActiveLocale } from '../i18n'

export const SUPPORTED_CURRENCIES = [
  { code: 'XOF', label: 'FCFA', name: 'Franc CFA BCEAO', region: 'Afrique de l’Ouest', symbol: 'FCFA' },
  { code: 'EUR', label: 'Euro', name: 'Euro', region: 'Zone euro', symbol: '€' },
  { code: 'USD', label: 'Dollar américain', name: 'Dollar américain', region: 'États-Unis', symbol: '$' },
  { code: 'GBP', label: 'Livre sterling', name: 'Livre sterling', region: 'Royaume-Uni', symbol: '£' },
  { code: 'CAD', label: 'Dollar canadien', name: 'Dollar canadien', region: 'Canada', symbol: 'CA$' },
  { code: 'CHF', label: 'Franc suisse', name: 'Franc suisse', region: 'Suisse', symbol: 'CHF' },
  { code: 'NGN', label: 'Naira', name: 'Naira nigérian', region: 'Nigeria', symbol: '₦' },
  { code: 'GHS', label: 'Cedi', name: 'Cedi ghanéen', region: 'Ghana', symbol: 'GH₵' },
  { code: 'MAD', label: 'Dirham marocain', name: 'Dirham marocain', region: 'Maroc', symbol: 'MAD' },
] as const

export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number]['code']

export function isCurrencyCode(value: string | undefined): value is CurrencyCode {
  return SUPPORTED_CURRENCIES.some((c) => c.code === value)
}

export function currencyMeta(code: CurrencyCode) {
  return SUPPORTED_CURRENCIES.find((c) => c.code === code) ?? SUPPORTED_CURRENCIES[0]
}

export function formatMoney(value: number, currency: CurrencyCode, locale = getActiveLocale()): string {
  try {
    if (currency === 'XOF') {
      const amount = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(value)
      return `${amount} ${locale.startsWith('fr') ? 'FCFA' : 'XOF'}`
    }
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(value)
  } catch {
    return `${Math.round(value).toLocaleString(locale)} ${currencyMeta(currency).symbol}`
  }
}

export function formatMoneyCompact(value: number, currency: CurrencyCode, locale = getActiveLocale()): string {
  try {
    return new Intl.NumberFormat(locale, {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value) + ` ${currency === 'XOF' && !locale.startsWith('fr') ? 'XOF' : currencyMeta(currency).symbol}`
  } catch {
    return formatMoney(value, currency, locale)
  }
}
