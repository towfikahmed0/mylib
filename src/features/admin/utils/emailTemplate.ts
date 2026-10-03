/**
 * Replaces `{{token}}` placeholders with values from `variables`. Unknown tokens
 * are left untouched so the backend can fill them per-recipient for bulk sends.
 */
export function renderTemplate(template: string, variables?: Record<string, string>): string {
  if (!variables) return template
  const keys = Object.keys(variables)
  if (keys.length === 0) return template

  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (match, key: string) => {
    const value = variables[key]
    return value === undefined ? match : value
  })
}
