import DOMPurify from 'dompurify'

const ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ESCAPE_MAP[character] ?? character)
}

function applyInline(value: string): string {
  return value
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
}

export function formatAIHtml(text: string): string {
  const escaped = escapeHtml(text)
  const formatted = applyInline(escaped).replace(/\n/g, '<br />')
  return DOMPurify.sanitize(formatted)
}

export function formatAIMarkdown(text: string): string {
  const lines = text.split('\n')
  const html: string[] = []
  let listType: 'ul' | 'ol' | null = null

  const closeList = () => {
    if (listType) {
      html.push(`</${listType}>`)
      listType = null
    }
  }

  for (const raw of lines) {
    const line = escapeHtml(raw.trim())

    if (line === '') {
      closeList()
      continue
    }

    const heading = line.match(/^(#{1,4})\s+(.*)$/)
    if (heading) {
      closeList()
      const level = Math.min(heading[1].length, 3)
      html.push(`<h${level}>${applyInline(heading[2])}</h${level}>`)
      continue
    }

    const bullet = line.match(/^[-*•]\s+(.*)$/)
    if (bullet) {
      if (listType !== 'ul') {
        closeList()
        html.push('<ul>')
        listType = 'ul'
      }
      html.push(`<li>${applyInline(bullet[1])}</li>`)
      continue
    }

    const ordered = line.match(/^\d+[.)]\s+(.*)$/)
    if (ordered) {
      if (listType !== 'ol') {
        closeList()
        html.push('<ol>')
        listType = 'ol'
      }
      html.push(`<li>${applyInline(ordered[1])}</li>`)
      continue
    }

    closeList()
    html.push(`<p>${applyInline(line)}</p>`)
  }

  closeList()
  return DOMPurify.sanitize(html.join(''))
}

export function speakText(text: string): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.rate = 1
  utterance.pitch = 1
  window.speechSynthesis.speak(utterance)
}
