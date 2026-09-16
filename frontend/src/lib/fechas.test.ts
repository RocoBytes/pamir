import { describe, expect, it } from 'vitest'
import { restarDias, esFechaCompleta } from './fechas'

describe('restarDias', () => {
  it('subtracts days within the same month', () => {
    expect(restarDias('2026-09-24', 2)).toBe('2026-09-22')
  })

  it('crosses a month boundary', () => {
    expect(restarDias('2026-03-01', 2)).toBe('2026-02-27')
  })

  it('does not map a low year to 19xx (regression)', () => {
    expect(restarDias('0002-09-24', 2)).toBe('0002-09-22')
  })
})

describe('esFechaCompleta', () => {
  it('accepts a plausible 4-digit year', () => {
    expect(esFechaCompleta('2026-09-24')).toBe(true)
  })

  it('rejects a padded intermediate year while typing', () => {
    expect(esFechaCompleta('0002-09-24')).toBe(false)
    expect(esFechaCompleta('0202-09-24')).toBe(false)
  })

  it('rejects an empty string', () => {
    expect(esFechaCompleta('')).toBe(false)
  })

  it('rejects a non-padded partial date', () => {
    expect(esFechaCompleta('2026-9-4')).toBe(false)
  })
})
