import { create } from 'zustand'
import { Song } from '../../types/song'

interface PlayerState {
	queue: Song[]
	currentIndex: number
	isPlaying: boolean
	playingPath: string | null
	setQueue: (queue: Song[]) => void
	setCurrentIndex: (idx: number) => void
	setIsPlaying: (playing: boolean) => void
	setPlayingPath: (path: string | null) => void
	addToQueue: (song: Song) => void
	clearQueue: () => void
	removeFromQueue: (index: number) => void
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
	queue: [],
	currentIndex: -1,
	isPlaying: false,
	playingPath: null,
	setQueue: (queue) => set({ queue }),
	setCurrentIndex: (idx) => set({ currentIndex: idx }),
	setIsPlaying: (isPlaying) => set({ isPlaying }),
	setPlayingPath: (path) => set({ playingPath: path }),
	addToQueue: (song) => {
		const { queue, currentIndex } = get()
		set({ queue: [...queue, song] })
		if (currentIndex === -1) {
			set({ currentIndex: 0, playingPath: song.path, isPlaying: true })
		}
	},
	clearQueue: () => set({ queue: [], currentIndex: -1, isPlaying: false, playingPath: null }),
	removeFromQueue: (index) => {
		const { queue, currentIndex } = get()
		const newQueue = queue.filter((_, i) => i !== index)
		let newIndex = currentIndex
		if (index === currentIndex) {
			if (index < queue.length - 1) {
				newIndex = index
			} else {
				newIndex = -1
			}
		} else if (index < currentIndex) {
			newIndex = currentIndex - 1
		}
		set({ queue: newQueue, currentIndex: newIndex })
	},
}))
