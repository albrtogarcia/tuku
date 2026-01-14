import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SettingsState {
  theme: 'light' | 'dark' | 'system'
  volume: number
  setTheme: (theme: 'light' | 'dark' | 'system') => void
  setVolume: (volume: number) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'system',
      volume: 0.25,
      setTheme: (theme) => set({ theme }),
      setVolume: (volume) => set({ volume }),
    }),
    {
      name: 'tuku-settings',
    }
  )
)
