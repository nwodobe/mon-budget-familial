import { describe, expect, it } from 'vitest'
import { currencyMeta, formatMoney, isCurrencyCode } from './currency'

describe('currency', () => {
  it('defaults XOF metadata', () => {
    expect(currencyMeta('XOF').symbol).toBe('FCFA')
  })

  it('formats XOF without decimals', () => {
    expect(formatMoney(125000, 'XOF')).toContain('125')
    expect(formatMoney(125000, 'XOF')).toContain('FCFA')
  })

  it('formats EUR and USD with their currencies', () => {
    expect(formatMoney(125000, 'EUR')).toMatch(/€|EUR/)
    expect(formatMoney(125000, 'USD')).toMatch(/\$|USD/)
  })

  it('recognizes supported currencies only', () => {
    expect(isCurrencyCode('GHS')).toBe(true)
    expect(isCurrencyCode('BTC')).toBe(false)
  })
})
