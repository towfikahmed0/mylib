import { toPng } from 'html-to-image'

const TRANSPARENT_PIXEL =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'

const BASE_OPTIONS = {
  pixelRatio: 2,
  backgroundColor: '#ffffff',
  // Never let one broken/unfetchable cover abort the whole export.
  imagePlaceholder: TRANSPARENT_PIXEL,
  onImageErrorHandler: () => TRANSPARENT_PIXEL,
}

export async function generateShareImageDataUrl(element: HTMLElement): Promise<string> {
  try {
    return await toPng(element, BASE_OPTIONS)
  } catch {
    // Last-resort retry: skip font embedding (e.g. a font host is unreachable)
    // and drop to 1x so a large canvas still has a chance to render.
    return toPng(element, { ...BASE_OPTIONS, skipFonts: true, pixelRatio: 1 })
  }
}

export async function generateShareImage(element: HTMLElement, filename: string): Promise<void> {
  const dataUrl = await generateShareImageDataUrl(element)
  const link = document.createElement('a')
  link.download = filename.endsWith('.png') ? filename : `${filename}.png`
  link.href = dataUrl
  link.click()
}

export async function shareImageDataUrl(
  dataUrl: string,
  filename: string,
): Promise<'shared' | 'copied'> {
  try {
    const response = await fetch(dataUrl)
    const blob = await response.blob()
    const file = new File([blob], `${filename}.png`, { type: 'image/png' })

    if (typeof navigator !== 'undefined' && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: 'MyLib' })
      return 'shared'
    }

    if (typeof navigator !== 'undefined' && 'clipboard' in navigator && 'ClipboardItem' in window) {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
      return 'copied'
    }
  } catch {
    // Fall through to the data URL copy below.
  }

  await navigator.clipboard.writeText(dataUrl)
  return 'copied'
}
