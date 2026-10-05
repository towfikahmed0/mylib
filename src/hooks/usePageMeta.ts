import { useEffect } from 'react'

export interface PageMeta {
  title: string
  description: string
  canonical?: string
}

function upsertMeta(attribute: 'name' | 'property', key: string, content: string): void {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`)
  if (!element) {
    element = document.createElement('meta')
    element.setAttribute(attribute, key)
    document.head.appendChild(element)
  }
  element.setAttribute('content', content)
}

function upsertCanonical(href: string): void {
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!link) {
    link = document.createElement('link')
    link.setAttribute('rel', 'canonical')
    document.head.appendChild(link)
  }
  link.setAttribute('href', href)
}

/**
 * Sets per-route document metadata (title, description, canonical, and the
 * matching Open Graph tags). Tags are created when missing and updated in place
 * when they already exist, so the static tags in index.html are reused.
 */
export function usePageMeta({ title, description, canonical }: PageMeta): void {
  useEffect(() => {
    document.title = title
    upsertMeta('name', 'description', description)
    upsertMeta('property', 'og:title', title)
    upsertMeta('property', 'og:description', description)

    if (canonical) {
      upsertMeta('property', 'og:url', canonical)
      upsertCanonical(canonical)
    }
  }, [title, description, canonical])
}
