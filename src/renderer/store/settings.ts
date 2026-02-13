import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import i18n from '../../i18n'

interface SettingsState {
  theme: 'light' | 'dark' | 'system'
  volume: number
  language: 'en' | 'es' | 'system'
  setTheme: (theme: 'light' | 'dark' | 'system') => void
  setVolume: (volume: number) => void
  setLanguage: (language: 'en' | 'es' | 'system') => void
}

const resolveLanguage = (lang: 'en' | 'es' | 'system'): string => {
  if (lang !== 'system') return lang
  const detected = navigator.language?.substring(0, 2)
  return detected === 'es' ? 'es' : 'en'
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'system',
      volume: 0.25,
      language: 'system',
      setTheme: (theme) => set({ theme }),
      setVolume: (volume) => set({ volume }),
      setLanguage: (language) => {
        const resolved = resolveLanguage(language)
        i18n.changeLanguage(resolved)
        window.electronAPI.setLanguage(resolved)
        set({ language })
      },
    }),
    {
      name: 'tuku-settings',
      onRehydrateStorage: () => (state) => {
        if (state) {
          const resolved = resolveLanguage(state.language)
          i18n.changeLanguage(resolved)
        }
      },
    }
  )
)
