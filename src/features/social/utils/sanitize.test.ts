import { describe, expect, it } from 'vitest'
import { sanitizeUserHtml } from './sanitize'

describe('sanitizeUserHtml', () => {
  describe('Safe Content (Happy Paths)', () => {
    it('returns plain text strings unmodified', () => {
      const input = 'This is a clean user review for a book.'
      expect(sanitizeUserHtml(input)).toBe(input)
    })

    it('preserves basic HTML formatting tags (b, i, strong, em, p, span, br)', () => {
      const input = '<p>This book was <strong>amazing</strong> and <em>thought-provoking</em>!</p>'
      expect(sanitizeUserHtml(input)).toBe(input)
    })

    it('preserves lists and structure (ul, ol, li)', () => {
      const input = '<ul><li>Point 1</li><li>Point 2</li></ul>'
      expect(sanitizeUserHtml(input)).toBe(input)
    })

    it('preserves valid hyper-links with safe href attributes', () => {
      const input = '<a href="https://example.com" target="_blank" rel="noopener noreferrer">Read more</a>'
      const sanitized = sanitizeUserHtml(input)
      expect(sanitized).toContain('href="https://example.com"')
      expect(sanitized).toContain('Read more')
    })
  })

  describe('XSS Vector Stripping (Security & Protection)', () => {
    it('removes <script> tags and inner executable script code', () => {
      const input = 'Great book! <script>alert("XSS Attack!");</script>'
      const sanitized = sanitizeUserHtml(input)
      expect(sanitized).not.toContain('<script>')
      expect(sanitized).not.toContain('alert(')
      expect(sanitized).toBe('Great book! ')
    })

    it('strips inline JavaScript event handlers (onerror, onload, onclick, onmouseover)', () => {
      const input = '<img src="invalid-image.jpg" onerror="alert(\'XSS\')" />'
      const sanitized = sanitizeUserHtml(input)
      expect(sanitized).not.toContain('onerror')
      expect(sanitized).not.toContain('alert')
      expect(sanitized).toContain('<img src="invalid-image.jpg">')
    })

    it('strips SVG inline event handlers', () => {
      const input = '<svg onload="alert(1)"></svg>'
      const sanitized = sanitizeUserHtml(input)
      expect(sanitized).not.toContain('onload')
      expect(sanitized).not.toContain('alert')
    })

    it('neutralizes javascript: URIs in anchor links', () => {
      const input = '<a href="javascript:alert(\'XSS\')">Click here for prize</a>'
      const sanitized = sanitizeUserHtml(input)
      expect(sanitized).not.toContain('javascript:')
      expect(sanitized).not.toContain('alert')
      expect(sanitized).toContain('Click here for prize')
    })

    it('strips dangerous embedded elements (iframe, object, embed)', () => {
      const input = '<div><iframe src="https://malicious-site.com"></iframe><object data="test"></object></div>'
      const sanitized = sanitizeUserHtml(input)
      expect(sanitized).not.toContain('<iframe')
      expect(sanitized).not.toContain('<object')
      expect(sanitized).not.toContain('malicious-site.com')
    })

    it('handles nested or malformed malicious HTML tags', () => {
      const input = '<<script>alert("XSS")</script>script>Content'
      const sanitized = sanitizeUserHtml(input)
      expect(sanitized).not.toContain('<script>')
      expect(sanitized).not.toContain('alert')
    })

    it('strips style tags or inline CSS expression vectors', () => {
      const input = '<style>body { background: url("javascript:alert(1)"); }</style><p>Text</p>'
      const sanitized = sanitizeUserHtml(input)
      expect(sanitized).not.toContain('<style>')
      expect(sanitized).not.toContain('javascript:')
      expect(sanitized).toContain('<p>Text</p>')
    })
  })

  describe('Edge Cases & Boundary Values', () => {
    it('handles empty strings gracefully', () => {
      expect(sanitizeUserHtml('')).toBe('')
    })

    it('handles whitespace-only strings without altering whitespace', () => {
      expect(sanitizeUserHtml('   ')).toBe('   ')
    })

    it('preserves plain text HTML entities like &lt;script&gt;', () => {
      const input = '&lt;script&gt;alert("test")&lt;/script&gt;'
      expect(sanitizeUserHtml(input)).toBe('&lt;script&gt;alert("test")&lt;/script&gt;')
    })

    it('handles multiline review bodies containing mixed valid formatting', () => {
      const input = `
        <h3>My Review</h3>
        <p>Line 1 with <b>bold</b> text.</p>
        <p>Line 2 with <script>doEvil()</script> clean ending.</p>
      `.trim()

      const sanitized = sanitizeUserHtml(input)
      expect(sanitized).toContain('<h3>My Review</h3>')
      expect(sanitized).toContain('<b>bold</b>')
      expect(sanitized).not.toContain('<script>')
      expect(sanitized).not.toContain('doEvil()')
    })
  })
})
