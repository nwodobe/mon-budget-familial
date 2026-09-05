import { describe, expect, it } from 'vitest'
import { formatMoney } from '../domain/currency'
import { languageFromLocale, paymentLabel, resolveLanguage, translate } from './index'

describe('i18n', () => {
  it('detects French phone locales', () => {
    expect(languageFromLocale('fr-FR')).toBe('fr')
    expect(languageFromLocale('fr-CI')).toBe('fr')
  })

  it('uses English for English and unsupported phone locales', () => {
    expect(languageFromLocale('en-US')).toBe('en')
    expect(languageFromLocale('en-GB')).toBe('en')
    expect(languageFromLocale('de-DE')).toBe('en')
    expect(languageFromLocale('es-ES')).toBe('en')
  })

  it('persists a valid manual language over the phone locale', () => {
    expect(resolveLanguage('en', 'fr-FR')).toBe('en')
    expect(resolveLanguage('fr', 'en-US')).toBe('fr')
    expect(resolveLanguage(null, 'fr-FR')).toBe('fr')
    expect(resolveLanguage('invalid', 'ja-JP')).toBe('en')
  })

  it('renders core semantic translations without leaking keys', () => {
    expect(translate('fr', 'dashboard.safeToSpend')).toBe('Disponible à dépenser')
    expect(translate('en', 'dashboard.safeToSpend')).toBe('Safe to spend')
    expect(translate('en', 'premium.restore')).toBe('Restore purchases')
    expect(translate('en', 'dashboard.deficit', { amount: '$250' })).toBe('Deficit to cover: $250')
    expect(translate('en', 'dashboard.safeToSpend')).not.toContain('dashboard.')
  })

  it('localizes payment methods', () => {
    expect(paymentLabel('fr', 'especes')).toBe('Espèces')
    expect(paymentLabel('en', 'especes')).toBe('Cash')
    expect(paymentLabel('en', 'banque')).toBe('Bank')
  })

  it('formats amounts for French and English locales', () => {
    expect(formatMoney(125000, 'XOF', 'fr-FR')).toContain('FCFA')
    const englishXof = formatMoney(125000, 'XOF', 'en-US')
    expect(englishXof).toContain('125,000')
    expect(englishXof).toContain('XOF')
    expect(formatMoney(3500, 'USD', 'en-US')).toContain('$3,500')
  })
})
