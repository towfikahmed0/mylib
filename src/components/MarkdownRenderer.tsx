import ReactMarkdown from 'react-markdown'
import { cn } from '../lib/utils'

const MARKDOWN_CLASS =
  'text-sm leading-relaxed text-muted [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 ' +
  '[&_h1]:mt-6 [&_h1]:text-xl [&_h1]:font-semibold [&_h1]:tracking-tight [&_h1]:text-foreground ' +
  '[&_h2]:mt-6 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-foreground ' +
  '[&_h3]:mt-4 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-foreground ' +
  '[&_p]:my-2 [&_strong]:font-semibold [&_strong]:text-foreground [&_em]:italic ' +
  '[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 ' +
  '[&_li]:my-1 ' +
  '[&_a]:font-medium [&_a]:text-accent [&_a]:underline [&_a]:underline-offset-2 ' +
  '[&_code]:rounded [&_code]:bg-surface-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.85em] ' +
  '[&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:italic ' +
  '[&_hr]:my-4 [&_hr]:border-border'

export function MarkdownRenderer({
  content,
  className,
}: {
  content: string
  className?: string
}) {
  return (
    <div className={cn(MARKDOWN_CLASS, className)}>
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  )
}
