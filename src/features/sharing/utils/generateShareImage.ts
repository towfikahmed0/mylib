import { toPng } from 'html-to-image'

const OPTIONS = {
  cacheBust: true,
  pixelRatio: 2,
  backgroundColor: '#ffffff',
} as const

export async function generateShareImageDataUrl(element: HTMLElement): Promise<string> {
  return toPng(element, OPTIONS)
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
