import { describe, expect, it } from 'vitest'
import { sanitizeUserHtml } from '../sanitize'

describe('sanitizeUserHtml (__tests__)', () => {
  it('sanitizes unsafe HTML script tags', () => {
    expect(sanitizeUserHtml('Hello <script>alert(1)</script>')).toBe('Hello ')
  })

  it('preserves safe formatting', () => {
    expect(sanitizeUserHtml('<b>Clean</b>')).toBe('<b>Clean</b>')
  })
})
