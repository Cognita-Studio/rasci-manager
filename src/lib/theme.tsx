import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

export type ThemeId = 'indigo' | 'emerald' | 'violet' | 'rose' | 'sky'

export const THEMES: { id: ThemeId; label: string; primary: string; light: string; dark: string }[] = [
  { id: 'indigo', label: '🔵 Indygo',   primary: '#4f46e5', light: '#eef2ff', dark: '#3730a3' },
  { id: 'emerald',label: '🟢 Szmaragd', primary: '#059669', light: '#ecfdf5', dark: '#047857' },
  { id: 'violet', label: '🟣 Fiolet',   primary: '#7c3aed', light: '#f5f3ff', dark: '#6d28d9' },
  { id: 'rose',   label: '🌸 Róż',      primary: '#e11d48', light: '#fff1f2', dark: '#be123c' },
  { id: 'sky',    label: '🩵 Niebo',    primary: '#0284c7', light: '#f0f9ff', dark: '#0369a1' },
]

function applyTheme(id: ThemeId) {
  const t = THEMES.find(t => t.id === id) ?? THEMES[0]
  const root = document.documentElement
  root.style.setProperty('--color-primary', t.primary)
  root.style.setProperty('--color-primary-light', t.light)
  root.style.setProperty('--color-primary-dark', t.dark)
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
