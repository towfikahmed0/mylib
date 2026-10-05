import { jsPDF } from 'jspdf'
import autoTable, { type CellHookData } from 'jspdf-autotable'
import type { Book, Loan, ReadingStatus } from '../../../types'
import type { ReadingStatusMap } from '../../library/hooks/useReadingStatus'
import { dateStamp } from '../../library/utils/download'

const MARGIN = 14
const CONTENT_TOP = 18
const CONTENT_W = 210 - MARGIN * 2
const FOOTER_RESERVE = 18

const INK: [number, number, number] = [15, 23, 42]
const MUTED: [number, number, number] = [100, 116, 139]
const BORDER: [number, number, number] = [226, 232, 240]
const ACCENT: [number, number, number] = [79, 70, 229]
const ACCENT_SOFT: [number, number, number] = [238, 242, 255]
const STRIPE: [number, number, number] = [248, 250, 252]
const WHITE: [number, number, number] = [255, 255, 255]

// Noto Sans Bengali is bundled so that Bengali (and other non-Latin) text is
// embedded with its glyphs instead of the garbled output produced by jsPDF's
// built-in WinAnsi-only fonts. It also covers basic Latin, so mixed
// Bengali + English strings render in a single consistent font.
const UNICODE_FONT = 'NotoSansBengali'
const UNICODE_FONT_FILES = {
  normal: '/fonts/NotoSansBengali-Regular.ttf',
  bold: '/fonts/NotoSansBengali-Bold.ttf',
} as const

// Characters above U+00FF that the built-in standard fonts already render
// through WinAnsi (dashes, curly quotes, ellipsis, currency...). Avoiding a
// font switch for these keeps English-only text byte-for-byte identical.
const WINANSI_EXTENDED =
  /[\u2013\u2014\u2018\u2019\u201c\u201d\u2020\u2021\u2022\u2026\u2030\u2039\u203a\u20ac\u2122]/

function needsUnicodeFont(text: string): boolean {
  return /[\u0100-\uffff]/.test(text.replace(WINANSI_EXTENDED, ''))
}

function hasUnicodeFont(doc: jsPDF): boolean {
  try {
    return Boolean(doc.getFontList()[UNICODE_FONT])
  } catch {
    return false
  }
}

function applyTextFont(doc: jsPDF, text: string, style: 'normal' | 'bold'): void {
  doc.setFont(needsUnicodeFont(text) && hasUnicodeFont(doc) ? UNICODE_FONT : 'helvetica', style)
}

interface ReportFonts {
  normal: string
  bold: string
}

let reportFontsPromise: Promise<ReportFonts | null> | null = null

async function fetchFontAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url)
    if (!response.ok) return null
    const bytes = new Uint8Array(await response.arrayBuffer())
    const chunkSize = 0x8000
    let binary = ''
    for (let index = 0; index < bytes.length; index += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize))
    }
    return btoa(binary)
  } catch {
    return null
  }
}

function loadReportFonts(): Promise<ReportFonts | null> {
  if (!reportFontsPromise) {
    reportFontsPromise = (async () => {
      const [normal, bold] = await Promise.all([
        fetchFontAsBase64(UNICODE_FONT_FILES.normal),
        fetchFontAsBase64(UNICODE_FONT_FILES.bold),
      ])
      return normal && bold ? { normal, bold } : null
    })().then((fonts) => {
      if (!fonts) reportFontsPromise = null
      return fonts
    })
  }
  return reportFontsPromise
}

function registerReportFonts(doc: jsPDF, fonts: ReportFonts | null): void {
  if (!fonts) return
  try {
    doc.addFileToVFS(UNICODE_FONT_FILES.normal, fonts.normal)
    doc.addFont(UNICODE_FONT_FILES.normal, UNICODE_FONT, 'normal')
    doc.addFileToVFS(UNICODE_FONT_FILES.bold, fonts.bold)
    doc.addFont(UNICODE_FONT_FILES.bold, UNICODE_FONT, 'bold')
  } catch {
    // Fall back to the built-in fonts if the custom font cannot be embedded.
  }
}

/* ------------------------------------------------------------------ *
 * Complex-script text (Bengali)
 *
 * jsPDF maps each character to a single glyph and never applies OpenType
 * shaping, so Bengali matras are not reordered and conjuncts never form
 * (for example "ক্ষ" stays as ka + virama + ssa). Even with the font
 * embedded, the glyph run is emitted in logical order. To render these runs
 * correctly we rasterise them with the browser's own text engine - which does
 * shape - and embed the result as an image. Latin text still goes through
 * jsPDF.text(), so English output is unchanged.
 * ------------------------------------------------------------------ */

const DISPLAY_FONT = 'NotoSansBengali'
const CANVAS_SCALE = 3

interface TextImage {
  dataUrl: string
  width: number
  height: number
  ascent: number
}

const textImageCache = new Map<string, TextImage>()
let displayFontsPromise: Promise<void> | null = null

/** Loads the Bengali webfont so the canvas can shape it. Safe to call many times. */
function ensureDisplayFonts(): Promise<void> {
  if (!displayFontsPromise) {
    displayFontsPromise = (async () => {
      if (typeof document === 'undefined' || !document.fonts) return
      try {
        await Promise.all([
          document.fonts.load(`400 24px "${DISPLAY_FONT}"`),
          document.fonts.load(`700 24px "${DISPLAY_FONT}"`),
        ])
      } catch {
        // The canvas falls back to a system font if the webfont cannot load.
      }
    })()
  }
  return displayFontsPromise
}

function displayFontSpec(sizePt: number, style: 'normal' | 'bold'): string {
  const weight = style === 'bold' ? 700 : 400
  return `${weight} ${((sizePt * 96) / 72) * CANVAS_SCALE}px "${DISPLAY_FONT}", sans-serif`
}

function canvasToMm(value: number): number {
  return (value / CANVAS_SCALE) * (25.4 / 96)
}

function renderComplexText(
  text: string,
  sizePt: number,
  style: 'normal' | 'bold',
  color: [number, number, number],
): TextImage | null {
  if (typeof document === 'undefined' || text === '') return null
  const key = `${sizePt}|${style}|${color.join(',')}|${text}`
  const cached = textImageCache.get(key)
  if (cached) return cached

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  const fontSpec = displayFontSpec(sizePt, style)
  ctx.font = fontSpec
  const metrics = ctx.measureText(text)
  const fontPx = ((sizePt * 96) / 72) * CANVAS_SCALE
  const ascent = metrics.actualBoundingBoxAscent || fontPx * 0.8
  const descent = metrics.actualBoundingBoxDescent || fontPx * 0.25
  const pad = Math.ceil(fontPx * 0.12)

  canvas.width = Math.max(1, Math.ceil(metrics.width) + pad * 2)
  canvas.height = Math.max(1, Math.ceil(ascent + descent) + pad * 2)

  // Setting width/height resets the context, so re-apply the style.
  ctx.font = fontSpec
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = `rgb(${color[0]}, ${color[1]}, ${color[2]})`
  ctx.fillText(text, pad, pad + ascent)

  const image: TextImage = {
    dataUrl: canvas.toDataURL('image/png'),
    width: canvasToMm(canvas.width),
    height: canvasToMm(canvas.height),
    ascent: canvasToMm(pad + ascent),
  }
  textImageCache.set(key, image)
  return image
}

function truncateComplexText(
  text: string,
  sizePt: number,
  style: 'normal' | 'bold',
  maxWidth: number,
): string {
  if (typeof document === 'undefined') return text
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return text
  ctx.font = displayFontSpec(sizePt, style)
  if (canvasToMm(ctx.measureText(text).width) <= maxWidth) return text
  let result = text
  while (result.length > 1 && canvasToMm(ctx.measureText(`${result}…`).width) > maxWidth) {
    result = result.slice(0, -1)
  }
  return `${result}…`
}

interface TextLineOptions {
  size: number
  style: 'normal' | 'bold'
  color: [number, number, number]
  align?: 'left' | 'center' | 'right'
}

/** Draws one line, rasterising non-Latin runs and keeping Latin as jsPDF text. */
function drawTextLine(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  options: TextLineOptions,
): void {
  const { size, style, color, align = 'left' } = options
  if (needsUnicodeFont(text) && hasUnicodeFont(doc)) {
    const image = renderComplexText(text, size, style, color)
    if (image) {
      const drawX = align === 'right' ? x - image.width : align === 'center' ? x - image.width / 2 : x
      doc.addImage(image.dataUrl, 'PNG', drawX, y - image.ascent, image.width, image.height)
      return
    }
  }
  applyTextFont(doc, text, style)
  doc.setFontSize(size)
  doc.setTextColor(color[0], color[1], color[2])
  if (align === 'left') doc.text(text, x, y)
  else doc.text(text, x, y, { align })
}

export interface LibraryReportInput {
  username: string
  displayName: string
  includeCollaborators: boolean
  collaboratorCount: number
  books: Book[]
  statuses: ReadingStatusMap
  loans: Loan[]
  logoDataUrl?: string | null
}

export interface LibraryReportResult {
  blob: Blob
  filename: string
}

function formatMoney(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatMoneyExact(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '—'
  return new Intl.NumberFormat('en-US').format(value)
}

function formatLongDate(date: Date): string {
  return date.toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric' })
}

function dash(value: string | null | undefined): string {
  const text = (value ?? '').toString().trim()
  return text === '' ? '—' : text
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

function toDate(value: Book['createdAt'] | null | undefined): Date | null {
  if (!value) return null
  try {
    return value.toDate()
  } catch {
    return null
  }
}

function fileSafeUsername(username: string): string {
  const cleaned = username
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return cleaned === '' ? 'reader' : cleaned
}

interface ReportData {
  books: Book[]
  totalBooks: number
  totalValue: number
  pricedCount: number
  averageValue: number
  highest: Book | null
  available: number
  issued: number
  totalAuthors: number
  totalCategories: number
  categoryRows: { label: string; count: number; pct: number; value: number }[]
  authorRows: { name: string; count: number }[]
  inventory: {
    index: number
    title: string
    author: string
    category: string
    isbn: string
    status: string
    value: string
  }[]
  circulation: {
    totalLoans: number
    issued: number
    returned: number
    activeMembers: number
    mostBorrowed: { rank: number; title: string; author: string; count: number }[]
  } | null
  earliest: Date | null
}

function bookStatusLabel(book: Book, status?: ReadingStatus): string {
  if (status?.isWishlist) return 'Wishlist'
  const availability = book.borrowStatus ?? (book.borrowedBy ? 'on_loan' : 'available')
  switch (availability) {
    case 'pending_request':
      return 'Request Pending'
    case 'accepted_waiting_confirmation':
      return 'Handover Pending'
    case 'on_loan':
      return 'Issued'
    case 'return_pending_confirmation':
      return 'Return Pending'
    default:
      return 'Available'
  }
}

function buildReportData(input: LibraryReportInput): ReportData {
  const books = input.books.filter(
    (book) =>
      book.isInLibrary !== false &&
      book.isWishlist !== true &&
      !input.statuses[book.id]?.isWishlist,
  )

  const categories = new Map<string, { count: number; value: number }>()
  const authors = new Map<string, number>()
  const uncategorized = { count: 0, value: 0 }

  let totalValue = 0
  let pricedCount = 0
  let highest: Book | null = null
  let available = 0
  let issued = 0
  let earliest: Date | null = null

  for (const book of books) {
    if (book.price > 0) {
      totalValue += book.price
      pricedCount += 1
      if (!highest || book.price > highest.price) highest = book
    }

    const genres = (book.genres ?? []).map((genre) => genre.trim()).filter(Boolean)
    if (genres.length === 0) {
      uncategorized.count += 1
      uncategorized.value += book.price > 0 ? book.price : 0
    } else {
      for (const key of genres) {
        const entry = categories.get(key) ?? { count: 0, value: 0 }
        entry.count += 1
        entry.value += book.price > 0 ? book.price : 0
        categories.set(key, entry)
      }
    }

    const author = (book.author ?? '').trim()
    if (author !== '') authors.set(author, (authors.get(author) ?? 0) + 1)

    const availability = book.borrowStatus ?? (book.borrowedBy ? 'on_loan' : 'available')
    if (availability === 'available') available += 1
    else if (availability === 'on_loan' || availability === 'return_pending_confirmation') {
      issued += 1
    }

    const created = toDate(book.createdAt)
    if (created && (!earliest || created.getTime() < earliest.getTime())) earliest = created
  }

  const totalBooks = books.length
  const categoryEntries = [...categories.entries()].map(([label, entry]) => ({
    label,
    count: entry.count,
    pct: totalBooks > 0 ? (entry.count / totalBooks) * 100 : 0,
    value: entry.value,
  }))
  if (uncategorized.count > 0) {
    categoryEntries.push({
      label: 'Uncategorized',
      count: uncategorized.count,
      pct: totalBooks > 0 ? (uncategorized.count / totalBooks) * 100 : 0,
      value: uncategorized.value,
    })
  }
  const categoryRows = categoryEntries.sort(
    (a, b) => b.count - a.count || a.label.localeCompare(b.label),
  )

  const authorRows = [...authors.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))

  const inventory = [...books]
    .sort((a, b) => (a.title ?? '').localeCompare(b.title ?? ''))
    .map((book, index) => ({
      index: index + 1,
      title: dash(book.title),
      author: dash(book.author),
      category: dash((book.genres ?? [])[0]),
      isbn: dash(book.isbn),
      status: bookStatusLabel(book, input.statuses[book.id]),
      value: book.price > 0 ? formatMoney(book.price) : '—',
    }))

  const ownerLoans = input.loans
  let circulation: ReportData['circulation'] = null
  if (ownerLoans.length > 0) {
    const active = ownerLoans.filter((loan) => loan.status === 'active').length
    const returnPending = ownerLoans.filter(
      (loan) => loan.status === 'return_pending_confirmation',
    ).length
    const returned = ownerLoans.filter((loan) => loan.status === 'returned').length
    const members = new Set(ownerLoans.map((loan) => loan.borrowerId)).size

    const borrowed = new Map<string, { title: string; author: string; count: number }>()
    for (const loan of ownerLoans) {
      const entry = borrowed.get(loan.bookId) ?? {
        title: loan.bookTitle || 'Untitled',
        author: '',
        count: 0,
      }
      entry.count += 1
      borrowed.set(loan.bookId, entry)
    }
    for (const [id, entry] of borrowed) {
      const book = books.find((candidate) => candidate.id === id)
      if (book) entry.author = dash(book.author)
    }
    const mostBorrowed = [...borrowed.values()]
      .sort((a, b) => b.count - a.count || a.title.localeCompare(b.title))
      .slice(0, 10)
      .map((entry, index) => ({
        rank: index + 1,
        title: entry.title,
        author: entry.author === '' ? '—' : entry.author,
        count: entry.count,
      }))

    circulation = {
      totalLoans: ownerLoans.length,
      issued: active + returnPending,
      returned,
      activeMembers: members,
      mostBorrowed,
    }
  }

  return {
    books,
    totalBooks,
    totalValue,
    pricedCount,
    averageValue: pricedCount > 0 ? totalValue / pricedCount : 0,
    highest,
    available,
    issued,
    totalAuthors: authors.size,
    totalCategories: categories.size,
    categoryRows,
    authorRows,
    inventory,
    circulation,
    earliest,
  }
}

interface DocWithTable extends jsPDF {
  lastAutoTable?: { finalY?: number }
}

function contentBottom(doc: jsPDF): number {
  return doc.internal.pageSize.getHeight() - MARGIN - FOOTER_RESERVE / 2
}

function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > contentBottom(doc)) {
    doc.addPage()
    return CONTENT_TOP
  }
  return y
}

function drawSectionTitle(doc: jsPDF, y: number, title: string): number {
  const startY = ensureSpace(doc, y, 20)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(INK[0], INK[1], INK[2])
  doc.text(title.toUpperCase(), MARGIN, startY)
  doc.setDrawColor(ACCENT[0], ACCENT[1], ACCENT[2])
  doc.setLineWidth(0.8)
  doc.line(MARGIN, startY + 2, MARGIN + 18, startY + 2)
  doc.setLineWidth(0.2)
  return startY + 9
}

function drawStatCards(
  doc: jsPDF,
  y: number,
  items: { label: string; value: string }[],
): number {
  const columns = 3
  const gap = 4
  const cardW = (CONTENT_W - gap * (columns - 1)) / columns
  const cardH = 19
  let rowY = y

  items.forEach((item, index) => {
    const column = index % columns
    if (column === 0) rowY = ensureSpace(doc, rowY, cardH + gap)
    const x = MARGIN + column * (cardW + gap)
    doc.setFillColor(ACCENT_SOFT[0], ACCENT_SOFT[1], ACCENT_SOFT[2])
    doc.setDrawColor(BORDER[0], BORDER[1], BORDER[2])
    doc.roundedRect(x, rowY, cardW, cardH, 2, 2, 'FD')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(MUTED[0], MUTED[1], MUTED[2])
    doc.text(item.label.toUpperCase(), x + 3, rowY + 6)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.setTextColor(INK[0], INK[1], INK[2])
    doc.text(item.value, x + 3, rowY + 14.5)
    if (column === columns - 1 || index === items.length - 1) rowY += cardH + gap
  })

  return rowY
}

function drawBarChart(
  doc: jsPDF,
  y: number,
  rows: { label: string; count: number }[],
): number {
  const visible = rows.slice(0, 8)
  if (visible.length === 0) return y
  const max = Math.max(...visible.map((row) => row.count), 1)
  const barH = 6
  const gap = 3
  const labelW = 46
  const barMaxW = CONTENT_W - labelW - 18
  let startY = ensureSpace(doc, y, visible.length * (barH + gap) + 4)

  visible.forEach((row, index) => {
    const rowY = startY + index * (barH + gap)
    const baseline = rowY + barH - 1.5
    const label = needsUnicodeFont(row.label)
      ? truncateComplexText(row.label, 8, 'normal', labelW - 4)
      : truncate(row.label, 26)
    drawTextLine(doc, label, MARGIN, baseline, { size: 8, style: 'normal', color: INK })
    const width = Math.max(2, (row.count / max) * barMaxW)
    doc.setFillColor(ACCENT[0], ACCENT[1], ACCENT[2])
    doc.roundedRect(MARGIN + labelW, rowY, width, barH, 1, 1, 'F')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(MUTED[0], MUTED[1], MUTED[2])
    doc.text(String(row.count), MARGIN + labelW + width + 2, baseline)
  })

  startY += visible.length * (barH + gap)
  return startY
}

function drawTable(
  doc: jsPDF,
  y: number,
  head: string[],
  body: (string | number)[][],
  columnStyles?: Record<string, { cellWidth?: number; halign?: 'left' | 'right' | 'center' }>,
): number {
  autoTable(doc, {
    startY: y,
    head: [head],
    body,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 2,
      textColor: INK,
      lineColor: BORDER,
      lineWidth: 0.2,
      overflow: 'linebreak',
      valign: 'middle',
    },
    headStyles: {
      fillColor: ACCENT,
      textColor: WHITE,
      fontStyle: 'bold',
      fontSize: 8,
    },
    alternateRowStyles: { fillColor: STRIPE },
    didParseCell: (hook: CellHookData) => {
      if (hook.section === 'head') return
      const raw = hook.cell.raw
      const text =
        typeof raw === 'string' ? raw : typeof raw === 'number' ? String(raw) : hook.cell.text.join('\n')
      if (!hasUnicodeFont(doc) || !needsUnicodeFont(text)) return
      const size = typeof hook.cell.styles.fontSize === 'number' ? hook.cell.styles.fontSize : 8
      const style = hook.cell.styles.fontStyle === 'bold' ? 'bold' : 'normal'
      const image = renderComplexText(text, size, style, INK)
      if (image) {
        // Blank autoTable's unshaped glyphs and reserve room for the image.
        hook.cell.text = []
        hook.cell.styles.minCellHeight = image.height + 4
      } else {
        hook.cell.styles.font = UNICODE_FONT
      }
    },
    didDrawCell: (hook: CellHookData) => {
      if (hook.section !== 'body') return
      const raw = hook.cell.raw
      const text = typeof raw === 'string' ? raw : typeof raw === 'number' ? String(raw) : ''
      if (text === '' || !hasUnicodeFont(doc) || !needsUnicodeFont(text)) return
      const size = typeof hook.cell.styles.fontSize === 'number' ? hook.cell.styles.fontSize : 8
      const style = hook.cell.styles.fontStyle === 'bold' ? 'bold' : 'normal'
      const padding = 2
      const available = hook.cell.width - padding * 2
      const fitted = truncateComplexText(text, size, style, available)
      const image = renderComplexText(fitted, size, style, INK)
      if (!image) return
      const width = Math.min(image.width, available)
      const height = image.width === 0 ? image.height : image.height * (width / image.width)
      const halign = hook.cell.styles.halign
      const drawX =
        halign === 'right'
          ? hook.cell.x + hook.cell.width - padding - width
          : halign === 'center'
            ? hook.cell.x + (hook.cell.width - width) / 2
            : hook.cell.x + padding
      const drawY = hook.cell.y + (hook.cell.height - height) / 2
      doc.addImage(image.dataUrl, 'PNG', drawX, drawY, width, height)
    },
    margin: { top: CONTENT_TOP, bottom: FOOTER_RESERVE, left: MARGIN, right: MARGIN },
    columnStyles,
  })
  const finalY = (doc as DocWithTable).lastAutoTable?.finalY
  return typeof finalY === 'number' ? finalY : y
}

function drawCover(doc: jsPDF, data: ReportData, input: LibraryReportInput): number {
  const generated = new Date()
  let y = MARGIN + 4

  if (input.logoDataUrl) {
    try {
      doc.addImage(input.logoDataUrl, 'PNG', MARGIN, y - 3, 14, 14)
    } catch {
      // Ignore a logo that cannot be embedded.
    }
  }

  const textX = input.logoDataUrl ? MARGIN + 18 : MARGIN
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.setTextColor(ACCENT[0], ACCENT[1], ACCENT[2])
  doc.text('MYLIB', textX, y + 6)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(MUTED[0], MUTED[1], MUTED[2])
  doc.text('Library Management Software', textX, y + 11)
  y += 20

  doc.setDrawColor(BORDER[0], BORDER[1], BORDER[2])
  doc.line(MARGIN, y, MARGIN + CONTENT_W, y)
  y += 10

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.setTextColor(INK[0], INK[1], INK[2])
  doc.text('LIBRARY REPORT', MARGIN, y)
  y += 10

  const libraryName = dash(input.displayName) === '—'
    ? `@${input.username}`
    : `${input.displayName}'s Library`
  const period =
    data.earliest && data.totalBooks > 0
      ? `${formatLongDate(data.earliest)} – ${formatLongDate(generated)}`
      : 'All-time'
  const scope = input.includeCollaborators
    ? `Your library + ${input.collaboratorCount} collaborator${input.collaboratorCount === 1 ? '' : 's'}`
    : 'Your library only'

  const meta: [string, string][] = [
    ['Library Name', libraryName],
    ['Generated for', input.username ? `@${input.username}` : '—'],
    ['Profile', input.username ? `mylib.softrly.com/u/${input.username}` : '—'],
    ['Generated', formatLongDate(generated)],
    ['Reporting Period', period],
    ['Scope', scope],
  ]

  doc.setFontSize(9)
  meta.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(MUTED[0], MUTED[1], MUTED[2])
    doc.text(`${label}:`, MARGIN, y)
    drawTextLine(doc, value, MARGIN + 34, y, { size: 9, style: 'normal', color: INK })
    y += 5.5
  })

  return y + 4
}

function drawInsight(doc: jsPDF, y: number, data: ReportData): number {
  let cursor = drawSectionTitle(doc, y, 'Library Insight')
  cursor = drawStatCards(doc, cursor, [
    { label: 'Total Books', value: formatNumber(data.totalBooks) },
    { label: 'Total Collection Value', value: formatMoney(data.totalValue) },
    { label: 'Available Books', value: formatNumber(data.available) },
    { label: 'Currently Issued', value: formatNumber(data.issued) },
    { label: 'Total Authors', value: formatNumber(data.totalAuthors) },
    { label: 'Total Categories', value: formatNumber(data.totalCategories) },
  ])
  return cursor + 2
}

function drawCollectionOverview(doc: jsPDF, y: number, data: ReportData): number {
  let cursor = drawSectionTitle(doc, y, 'Collection Overview')
  if (data.categoryRows.length === 0) {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(9)
    doc.setTextColor(MUTED[0], MUTED[1], MUTED[2])
    doc.text('No categories have been recorded for this library yet.', MARGIN, cursor)
    return cursor + 10
  }

  cursor = drawTable(
    doc,
    cursor,
    ['Category', 'Books', '%', 'Collection Value'],
    data.categoryRows.map((row) => [
      row.label,
      formatNumber(row.count),
      `${row.pct.toFixed(1)}%`,
      row.value > 0 ? formatMoney(row.value) : '—',
    ]),
    {
      0: { cellWidth: 70 },
      1: { cellWidth: 24, halign: 'right' },
      2: { cellWidth: 22, halign: 'right' },
      3: { cellWidth: 'auto' as unknown as number, halign: 'right' },
    },
  )

  cursor = ensureSpace(doc, cursor + 8, 40)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(INK[0], INK[1], INK[2])
  doc.text('Books by Category', MARGIN, cursor)
  cursor = drawBarChart(doc, cursor + 4, data.categoryRows)
  return cursor + 4
}

function drawCirculation(doc: jsPDF, y: number, data: ReportData): number {
  if (!data.circulation) return y
  const circulation = data.circulation
  let cursor = drawSectionTitle(doc, y, 'Circulation Summary')
  cursor = drawStatCards(doc, cursor, [
    { label: 'Total Loans', value: formatNumber(circulation.totalLoans) },
    { label: 'Currently Issued', value: formatNumber(circulation.issued) },
    { label: 'Returned', value: formatNumber(circulation.returned) },
    { label: 'Active Members', value: formatNumber(circulation.activeMembers) },
  ])

  if (circulation.mostBorrowed.length > 0) {
    cursor = ensureSpace(doc, cursor + 4, 30)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(INK[0], INK[1], INK[2])
    doc.text('Most Borrowed Books', MARGIN, cursor)
    cursor = drawTable(
      doc,
      cursor + 3,
      ['Rank', 'Book', 'Author', 'Times Borrowed'],
      circulation.mostBorrowed.map((row) => [row.rank, row.title, row.author, row.count]),
      {
        0: { cellWidth: 16, halign: 'right' },
        1: { cellWidth: 72 },
        2: { cellWidth: 60 },
        3: { cellWidth: 'auto' as unknown as number, halign: 'right' },
      },
    )
  }

  return cursor + 4
}

function drawCollectionValue(doc: jsPDF, y: number, data: ReportData): number {
  let cursor = drawSectionTitle(doc, y, 'Collection Value')
  if (data.pricedCount === 0) {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(9)
    doc.setTextColor(MUTED[0], MUTED[1], MUTED[2])
    doc.text('No book values have been recorded, so a collection value cannot be shown.', MARGIN, cursor)
    return cursor + 10
  }

  cursor = drawTable(
    doc,
    cursor,
    ['Metric', 'Value'],
    [
      ['Total Collection Value', formatMoney(data.totalValue)],
      ['Books with a Recorded Value', formatNumber(data.pricedCount)],
      ['Average Book Value', formatMoneyExact(data.averageValue)],
      ['Highest-Valued Book', data.highest ? dash(data.highest.title) : '—'],
      ['Highest Value', data.highest ? formatMoneyExact(data.highest.price) : '—'],
    ],
    {
      0: { cellWidth: 90 },
      1: { cellWidth: 'auto' as unknown as number, halign: 'right' },
    },
  )

  return cursor + 4
}

function drawAuthors(doc: jsPDF, y: number, data: ReportData): number {
  if (data.authorRows.length === 0) return y
  let cursor = drawSectionTitle(doc, y, 'Authors')
  const limited = data.authorRows.slice(0, 12)
  cursor = drawTable(
    doc,
    cursor,
    ['#', 'Author', 'Number of Books'],
    limited.map((row, index) => [index + 1, row.name, row.count]),
    {
      0: { cellWidth: 16, halign: 'right' },
      1: { cellWidth: 110 },
      2: { cellWidth: 'auto' as unknown as number, halign: 'right' },
    },
  )
  if (data.authorRows.length > limited.length) {
    cursor = ensureSpace(doc, cursor + 3, 8)
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(8)
    doc.setTextColor(MUTED[0], MUTED[1], MUTED[2])
    doc.text(
      `Showing the 12 most prolific authors of ${formatNumber(data.authorRows.length)} total.`,
      MARGIN,
      cursor + 3,
    )
    cursor += 6
  }
  return cursor + 4
}

function drawInventory(doc: jsPDF, y: number, data: ReportData): number {
  let cursor = drawSectionTitle(doc, y, 'Book Inventory')
  if (data.inventory.length === 0) {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(9)
    doc.setTextColor(MUTED[0], MUTED[1], MUTED[2])
    doc.text('No books are in this library yet.', MARGIN, cursor)
    return cursor + 10
  }

  cursor = drawTable(
    doc,
    cursor,
    ['#', 'Title', 'Author', 'Category', 'ISBN', 'Status', 'Value'],
    data.inventory.map((row) => [
      row.index,
      row.title,
      row.author,
      row.category,
      row.isbn,
      row.status,
      row.value,
    ]),
    {
      0: { cellWidth: 8, halign: 'right' },
      1: { cellWidth: 44 },
      2: { cellWidth: 30 },
      3: { cellWidth: 22 },
      4: { cellWidth: 30 },
      5: { cellWidth: 22 },
      6: { cellWidth: 'auto' as unknown as number, halign: 'right' },
    },
  )

  return cursor + 4
}

function drawFooters(doc: jsPDF, profileUrl: string): void {
  const pages = doc.getNumberOfPages()
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page)
    const width = doc.internal.pageSize.getWidth()
    const height = doc.internal.pageSize.getHeight()
    doc.setDrawColor(BORDER[0], BORDER[1], BORDER[2])
    doc.setLineWidth(0.2)
    doc.line(MARGIN, height - 13, width - MARGIN, height - 13)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(MUTED[0], MUTED[1], MUTED[2])
    doc.text('MyLib — Library Management Software', MARGIN, height - 8.5)
    doc.text(profileUrl, width / 2, height - 8.5, { align: 'center' })
    doc.text(`Page ${page} of ${pages}`, width - MARGIN, height - 8.5, { align: 'right' })
  }
}

export async function generateLibraryReportPdf(
  input: LibraryReportInput,
): Promise<LibraryReportResult> {
  const fonts = await loadReportFonts()
  await ensureDisplayFonts()
  const data = buildReportData(input)
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  registerReportFonts(doc, fonts)

  let cursor = drawCover(doc, data, input)
  cursor = drawInsight(doc, cursor, data)
  cursor = drawCollectionOverview(doc, cursor, data)
  cursor = drawCirculation(doc, cursor, data)
  cursor = drawCollectionValue(doc, cursor, data)
  cursor = drawAuthors(doc, cursor, data)
  drawInventory(doc, cursor, data)

  drawFooters(doc, input.username ? `mylib.softrly.com/u/${input.username}` : 'mylib.softrly.com')

  const filename = `MyLib-Library-Report-${fileSafeUsername(input.username)}-${dateStamp()}.pdf`
  return { blob: doc.output('blob'), filename }
}

export async function loadMyLibLogo(): Promise<string | null> {
  try {
    const response = await fetch('/logo.png')
    if (!response.ok) return null
    const blob = await response.blob()
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(new Error('Could not read the logo.'))
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}
