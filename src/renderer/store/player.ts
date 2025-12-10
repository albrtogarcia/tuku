import { create } from 'zustand'
import { useEffect } from 'react'
import type { Song } from '../../types/song'

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
	addAlbumToQueue: (songs: Song[]) => void
	playNow: (song: Song) => void
	clearQueue: () => void
	removeFromQueue: (index: number) => void
	insertInQueue: (song: Song, position: number) => void
	cleanQueueHistory: () => void
	updateSongMetadata: (path: string, metadata: Partial<Song>) => void
	loadQueueFromStorage: () => Promise<void>
	saveQueueToStorage: () => Promise<void>
}

export const usePlayerStore = create<PlayerState>((set: (state: Partial<PlayerState>) => void, get: () => PlayerState) => ({
	queue: [],
	currentIndex: -1,
	isPlaying: false,
	playingPath: null,
	repeat: false,
	shuffle: false,
	setQueue: (queue) => {
		set({ queue })
		// Auto-save when queue changes
		const { saveQueueToStorage } = get()
		saveQueueToStorage()
	},
	setCurrentIndex: (idx) => {
		set({ currentIndex: idx })
		// Auto-save when index changes
		const { saveQueueToStorage } = get()
		saveQueueToStorage()
	},
	setIsPlaying: (isPlaying) => set({ isPlaying }),
	setPlayingPath: (path) => set({ playingPath: path }),
	setRepeat: (repeat) => set({ repeat }),
	setShuffle: (shuffle) => set({ shuffle }),
	addToQueue: (song) => {
		const { queue, currentIndex } = get()
		// Check if song is already in queue
		const existingIndex = queue.findIndex((q) => q.path === song.path)
		if (existingIndex !== -1) {
			// Song already exists in queue, don't add it
			return
		}
		const newQueue = [...queue, song]
		set({ queue: newQueue })
		if (currentIndex === -1) {
			set({ currentIndex: 0, playingPath: song.path, isPlaying: true })
		}
		// Auto-save
		const { saveQueueToStorage } = get()
		saveQueueToStorage()
	},
	addAlbumToQueue: (songs) => {
		const { queue, currentIndex } = get()
		// Filter out duplicates by path
		const uniqueSongs = songs.filter((song) => !queue.find((q) => q.path === song.path))
		const newQueue = [...queue, ...uniqueSongs]
		set({ queue: newQueue })
		if (currentIndex === -1 && uniqueSongs.length > 0) {
			set({ currentIndex: 0, playingPath: uniqueSongs[0].path, isPlaying: true })
		}
		// Auto-save
		const { saveQueueToStorage } = get()
		saveQueueToStorage()
	},
	playNow: (song) => {
		const { queue } = get()
		// Check if song is already in queue
		const existingIndex = queue.findIndex((q) => q.path === song.path)
		if (existingIndex !== -1) {
			// Song exists in queue, just set it as current
			set({ currentIndex: existingIndex, playingPath: song.path, isPlaying: true })
		} else {
			// Song not in queue, add it and play
			const newQueue = [...queue, song]
			set({ queue: newQueue, currentIndex: newQueue.length - 1, playingPath: song.path, isPlaying: true })
		}
		// Auto-save
		const { saveQueueToStorage } = get()
		saveQueueToStorage()
	},
	clearQueue: () => {
		set({ queue: [], currentIndex: -1 })
		// Don't set isPlaying: false or playingPath: null to allow current song to continue playing
		// Auto-save
		const { saveQueueToStorage } = get()
		saveQueueToStorage()
	},
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
		// Auto-save
		const { saveQueueToStorage } = get()
		saveQueueToStorage()
	},
	insertInQueue: (song, position) => {
		const { queue } = get()
		// Avoid duplicates
		if (queue.find((q) => q.path === song.path)) return
		const newQueue = [...queue]
		newQueue.splice(position, 0, song)
		set({ queue: newQueue })
		// Auto-save
		const { saveQueueToStorage } = get()
		saveQueueToStorage()
	},
	cleanQueueHistory: () => {
		const { queue, currentIndex } = get()
		if (currentIndex > 3) {
			const newQueue = queue.slice(currentIndex - 3)
			const newIndex = 3
			set({ queue: newQueue, currentIndex: newIndex })
			// Auto-save
			const { saveQueueToStorage } = get()
			saveQueueToStorage()
		}
	},
	updateSongMetadata: (path, metadata) => {
		const { queue } = get()
		const newQueue = queue.map((song) => {
			if (song.path === path) {
				return { ...song, ...metadata } // Update cover or other fields
			}
			return song
		})

		// Only update if something changed
		if (JSON.stringify(newQueue) !== JSON.stringify(queue)) {
			set({ queue: newQueue })
			// Auto-save
			const { saveQueueToStorage } = get()
			saveQueueToStorage()
		}
	},
	loadQueueFromStorage: async () => {
		try {
			const loaded = await window.electronAPI.loadQueue()
			if (!loaded || !loaded.queue || loaded.queue.length === 0) {
				return
			}

			// Load the full library to get metadata
			const library: Song[] = await window.electronAPI.loadLibrary()
			if (library.length === 0) {
				return
			}

			const libraryMap = new Map(library.map((song) => [song.path, song]))

			// Build the queue with complete metadata
			const queueWithMetadata: Song[] = loaded.queue.map((path) => libraryMap.get(path)).filter((song): song is Song => song !== undefined)

			if (queueWithMetadata.length > 0) {
				const currentIndex = Math.max(0, Math.min(loaded.currentIndex, queueWithMetadata.length - 1))

				set({
					queue: queueWithMetadata,
					currentIndex: currentIndex,
					playingPath: queueWithMetadata[currentIndex]?.path || null,
				})
			}
		} catch (error) {}
	},
	saveQueueToStorage: async () => {
		try {
			const { queue, currentIndex } = get()
			await window.electronAPI.saveQueue(queue, currentIndex)
		} catch (error) {
			// Error saving queue to storage
		}
	},
}))
