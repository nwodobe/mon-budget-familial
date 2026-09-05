import { describe, expect, it } from 'vitest'
import { formatMoney } from '../domain/currency'
import { languageFromLocale, paymentLabel, resolveLanguage, translate } from './index'

describe('i18n', () => {
  it('detects the five supported phone languages', () => {
    expect(languageFromLocale('fr-FR')).toBe('fr')
    expect(languageFromLocale('fr-CI')).toBe('fr')
    expect(languageFromLocale('en-US')).toBe('en')
    expect(languageFromLocale('en-GB')).toBe('en')
    expect(languageFromLocale('es-ES')).toBe('es')
    expect(languageFromLocale('es-MX')).toBe('es')
    expect(languageFromLocale('ar-MA')).toBe('ar')
    expect(languageFromLocale('ar-SA')).toBe('ar')
    expect(languageFromLocale('pt-BR')).toBe('pt')
    expect(languageFromLocale('pt-PT')).toBe('pt')
  })

  it('uses English for unsupported phone locales', () => {
    expect(languageFromLocale('de-DE')).toBe('en')
    expect(languageFromLocale('zh-CN')).toBe('en')
    expect(languageFromLocale('hi-IN')).toBe('en')
  })

  it('persists any valid manual language over the phone locale', () => {
    expect(resolveLanguage('en', 'fr-FR')).toBe('en')
    expect(resolveLanguage('fr', 'en-US')).toBe('fr')
    expect(resolveLanguage('es', 'en-US')).toBe('es')
    expect(resolveLanguage('ar', 'fr-FR')).toBe('ar')
    expect(resolveLanguage('pt', 'es-ES')).toBe('pt')
    expect(resolveLanguage(null, 'ar-MA')).toBe('ar')
    expect(resolveLanguage('invalid', 'ja-JP')).toBe('en')
  })

  it('renders core semantic translations without leaking keys', () => {
    expect(translate('fr', 'dashboard.safeToSpend')).toBe('Disponible à dépenser')
    expect(translate('en', 'dashboard.safeToSpend')).toBe('Safe to spend')
    expect(translate('es', 'dashboard.safeToSpend')).toBe('Disponible para gastar')
    expect(translate('pt', 'dashboard.safeToSpend')).toBe('Disponível para gastar')
    expect(translate('ar', 'dashboard.safeToSpend')).toBe('المتاح للإنفاق بأمان')
    expect(translate('en', 'premium.restore')).toBe('Restore purchases')
    expect(translate('es', 'dashboard.safeToSpend')).not.toContain('dashboard.')
  })

  it('falls back to English when a secondary translation is missing', () => {
    expect(translate('pt', 'dashboard.amountsIn', { currency: 'USD' })).toBe('Amounts in USD')
    expect(translate('ar', 'dashboard.amountsIn', { currency: 'USD' })).toBe('Amounts in USD')
  })

  it('localizes payment methods', () => {
    expect(paymentLabel('fr', 'especes')).toBe('Espèces')
    expect(paymentLabel('en', 'especes')).toBe('Cash')
    expect(paymentLabel('es', 'especes')).toBe('Efectivo')
    expect(paymentLabel('pt', 'banque')).toBe('Banco')
    expect(paymentLabel('ar', 'banque')).toBe('البنك')
  })

  it('formats amounts for localized display', () => {
    expect(formatMoney(125000, 'XOF', 'fr-FR')).toContain('FCFA')
    const englishXof = formatMoney(125000, 'XOF', 'en-US')
    expect(englishXof).toContain('125,000')
    expect(englishXof).toContain('XOF')
    expect(formatMoney(3500, 'USD', 'en-US')).toContain('$3,500')
    expect(formatMoney(3500, 'EUR', 'es-ES')).toContain('3500')
  })
})
