import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

export type ThemeId = 'night' | 'slate' | 'indigo' | 'emerald' | 'snow'

export const THEMES: {
  id: ThemeId; label: string
  primary: string; light: string; dark: string
  bgPage: string; bgHeader: string; bgCard: string
  textBody: string; borderCard: string
}[] = [
  {
    id: 'night',
    label: '🌑 Noc',
    primary: '#a5b4fc', light: '#1e1b4b', dark: '#c7d2fe',
    bgPage: '#0a0f1e', bgHeader: '#0f172a', bgCard: '#1e293b',
    textBody: '#e2e8f0', borderCard: '#475569',
  },
  {
    id: 'slate',
    label: '🌒 Grafit',
    primary: '#60a5fa', light: '#172554', dark: '#93c5fd',
    bgPage: '#0f1f35', bgHeader: '#0a1628', bgCard: '#1a3050',
    textBody: '#e2e8f0', borderCard: '#2d4a6e',
  },
  {
    id: 'indigo',
    label: '🔵 Indygo',
    primary: '#4f46e5', light: '#eef2ff', dark: '#3730a3',
    bgPage: '#f8fafc', bgHeader: '#ffffff', bgCard: '#ffffff',
    textBody: '#374151', borderCard: '#e5e7eb',
  },
  {
    id: 'emerald',
    label: '🟢 Natura',
    primary: '#059669', light: '#ecfdf5', dark: '#047857',
    bgPage: '#f0fdf4', bgHeader: '#ffffff', bgCard: '#ffffff',
    textBody: '#374151', borderCard: '#e5e7eb',
  },
  {
    id: 'snow',
    label: '⬜ Śnieg',
    primary: '#7c3aed', light: '#f5f3ff', dark: '#6d28d9',
    bgPage: '#ffffff', bgHeader: '#faf5ff', bgCard: '#ffffff',
    textBody: '#374151', borderCard: '#e5e7eb',
  },
]

export function isDark(id: ThemeId) {
  return id === 'night' || id === 'slate'
}

function applyTheme(id: ThemeId) {
  const theme = THEMES.find(t => t.id === id) ?? THEMES[2]
  const root = document.documentElement
  root.style.setProperty('--color-primary', theme.primary)
  root.style.setProperty('--color-primary-light', theme.light)
  root.style.setProperty('--color-primary-dark', theme.dark)
  root.style.setProperty('--color-bg-page', theme.bgPage)
  root.style.setProperty('--color-bg-header', theme.bgHeader)
  root.style.setProperty('--color-bg-card', theme.bgCard)
  root.style.setProperty('--color-text-body', theme.textBody)
  root.style.setProperty('--color-border-card', theme.borderCard)
}

const ThemeContext = createContext<{ themeId: ThemeId; setTheme: (id: ThemeId) => void }>({
  themeId: 'indigo',
  setTheme: () => {},
})

export function ThemeProvider({ children }: { children: ReactNode }) {
  const stored = (localStorage.getItem('rasci_theme') ?? 'indigo') as ThemeId
  const [themeId, setThemeId] = useState<ThemeId>(stored)

  const setTheme = (id: ThemeId) => {
    localStorage.setItem('rasci_theme', id)
    setThemeId(id)
    applyTheme(id)
  }

  useEffect(() => { applyTheme(themeId) }, [themeId])

  return (
    <ThemeContext.Provider value={{ themeId, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
