import { useState } from 'react'
import { t } from '../../i18n'

export function CopyButton({ text, className = '' }: { text: string | (() => string); className?: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await navigator.clipboard.writeText(typeof text === 'function' ? text() : text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return <button className={`rounded bg-white/10 px-2 py-0.5 text-xs hover:bg-white/20 ${className}`} onClick={copy}>{copied ? t('Tersalin ✓') : t('Copy')}</button>
}
