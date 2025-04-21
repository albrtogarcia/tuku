import { create } from 'zustand'
import { Song } from '../../types/song'

interface PlayerState {
	queue: Song[]
	currentIndex: number
	isPlaying: boolean
	playingPath: string | null
	repeat: boolean
	shuffle: boolean
	setQueue: (queue: Song[]) => void
	setCurrentIndex: (idx: number) => void
	setIsPlaying: (playing: boolean) => void
	setPlayingPath: (path: string | null) => void
	setRepeat: (repeat: boolean) => void
	setShuffle: (shuffle: boolean) => void
	addToQueue: (song: Song) => void
	clearQueue: () => void
	removeFromQueue: (index: number) => void
	insertInQueue: (song: Song, position: number) => void
	cleanQueueHistory: () => void
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
	queue: [],
	currentIndex: -1,
	isPlaying: false,
	playingPath: null,
	repeat: false,
	shuffle: false,
	setQueue: (queue) => set({ queue }),
	setCurrentIndex: (idx) => set({ currentIndex: idx }),
	setIsPlaying: (isPlaying) => set({ isPlaying }),
	setPlayingPath: (path) => set({ playingPath: path }),
	setRepeat: (repeat) => set({ repeat }),
	setShuffle: (shuffle) => set({ shuffle }),
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
	insertInQueue: (song, position) => {
		const { queue } = get()
		// Evitar duplicados
		if (queue.find((q) => q.path === song.path)) return
		const newQueue = [...queue]
		newQueue.splice(position, 0, song)
		set({ queue: newQueue })
	},
	cleanQueueHistory: () => {
		const { queue, currentIndex } = get()
		if (currentIndex > 3) {
			const newQueue = queue.slice(currentIndex - 3)
			const newIndex = 3
			set({ queue: newQueue, currentIndex: newIndex })
		}
	},
}))
