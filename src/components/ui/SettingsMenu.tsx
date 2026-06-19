import { useState, useRef, useEffect } from 'react'
import { Settings } from 'lucide-react'
import { useT, type Lang } from '../../lib/i18n'
import { useTheme, THEMES } from '../../lib/theme'

const LANGS: { id: Lang; label: string }[] = [
  { id: 'pl', label: '🇵🇱 Polski' },
  { id: 'en', label: '🇬🇧 English' },
  { id: 'no', label: '🇳🇴 Norsk' },
]

export default function SettingsMenu() {
  const { t, lang, setLang } = useT()
  const { themeId, setTheme } = useTheme()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(o => !o)} className="btn-secondary p-2">
        <Settings size={16} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-52 card shadow-lg py-3 z-50">
          <p className="text-xs font-semibold uppercase tracking-wide px-4 mb-2 opacity-50" style={{ color: 'var(--color-text-body)' }}>{t.language}</p>
          {LANGS.map(l => (
            <button
              key={l.id}
              onClick={() => setLang(l.id)}
              className={`w-full text-left px-4 py-1.5 text-sm flex items-center justify-between hover:bg-black/10 ${lang === l.id ? 'font-semibold' : ''}`}
              style={{ color: 'var(--color-text-body)' }}
            >
              {l.label}
              {lang === l.id && <span className="text-xs" style={{ color: 'var(--color-primary)' }}>✓</span>}
            </button>
          ))}
          <hr className="my-2" style={{ borderColor: 'var(--color-border-card)' }} />
          <p className="text-xs font-semibold uppercase tracking-wide px-4 mb-2 opacity-50" style={{ color: 'var(--color-text-body)' }}>{t.theme}</p>
          {THEMES.map(th => (
            <button
              key={th.id}
              onClick={() => setTheme(th.id)}
              className={`w-full text-left px-4 py-1.5 text-sm flex items-center justify-between hover:bg-black/10 ${themeId === th.id ? 'font-semibold' : ''}`}
              style={{ color: 'var(--color-text-body)' }}
            >
              {t[`theme${th.id.charAt(0).toUpperCase()}${th.id.slice(1)}` as keyof typeof t] as string}
              {themeId === th.id && <span className="text-xs" style={{ color: 'var(--color-primary)' }}>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
