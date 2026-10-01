import DOMPurify from 'dompurify'

export function sanitizeUserHtml(value: string): string {
  return DOMPurify.sanitize(value)
}
