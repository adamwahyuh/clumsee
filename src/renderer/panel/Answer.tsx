import { useRef, type ReactNode } from 'react'
import Markdown, { type ExtraProps } from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import rehypeKatex from 'rehype-katex'
import remarkMath from 'remark-math'
import 'highlight.js/styles/github-dark.css'
import 'katex/dist/katex.min.css'
import { CopyButton } from './CopyButton'
import { normalizeMath } from './math'

/** Code block with a language label and its own copy button. */
function Code({ children, node }: { children?: ReactNode } & ExtraProps) {
  const ref = useRef<HTMLPreElement>(null)
  const code = node?.children[0]
  const classes = code?.type === 'element' ? code.properties.className : undefined
  const lang = Array.isArray(classes) ? classes.find((c) => String(c).startsWith('language-'))?.toString().slice(9) : undefined
  return (
    <div className="code-block overflow-hidden rounded-lg border border-white/10 bg-[#0d1117] text-neutral-100">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-1 text-xs text-neutral-400">
        <span className="font-mono">{lang ?? 'code'}</span>
        <CopyButton text={() => ref.current?.innerText ?? ''} />
      </div>
      <pre ref={ref}>{children}</pre>
    </div>
  )
}

/** AI answer as markdown: highlighted code blocks, and LaTeX math ($…$, $$…$$, \(…\), \[…\]) rendered by KaTeX. */
export function Answer({ text }: { text: string }) {
  return (
    <div className="markdown">
      <Markdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex, [rehypeHighlight, { detect: true, ignoreMissing: true }]]}
        components={{ pre: Code }}
      >
        {normalizeMath(text)}
      </Markdown>
    </div>
  )
}
