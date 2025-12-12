import { create } from 'zustand'
import { useEffect } from 'react'
import type { Song } from '../../types/song'

interface PlayerState {
	queue: Song[]
	currentIndex: number
	isPlaying: boolean
	playingPath: string | null
	repeat: boolean
	setQueue: (queue: Song[]) => void
	setCurrentIndex: (idx: number) => void
	setIsPlaying: (playing: boolean) => void
	setPlayingPath: (path: string | null) => void
	setRepeat: (repeat: boolean) => void
	shuffleQueue: () => void
	addToQueue: (song: Song) => void
	addAlbumToQueue: (songs: Song[]) => void
	playAlbumImmediately: (songs: Song[]) => void
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
	setQueue: (queue) => {
		set({ queue })
		// Auto-save when queue changes
		const { saveQueueToStorage } = get()
		saveQueueToStorage()
	},
	setCurrentIndex: (idx) => {
		const { queue } = get()
		set({ currentIndex: idx, playingPath: queue[idx]?.path || null })
		// Auto-save when index changes
		const { saveQueueToStorage } = get()
		saveQueueToStorage()
	},
	setIsPlaying: (isPlaying) => set({ isPlaying }),
	setPlayingPath: (path) => set({ playingPath: path }),
	setRepeat: (repeat) => set({ repeat }),
	shuffleQueue: () => {
		const { queue, currentIndex } = get()
		if (queue.length <= 1) return

		// Keep played songs order (0 to currentIndex)
		// Shuffle upcoming songs (currentIndex + 1 to end)
		const past = queue.slice(0, currentIndex + 1)
		const future = queue.slice(currentIndex + 1)

		// Fisher-Yates shuffle for future
		for (let i = future.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[future[i], future[j]] = [future[j], future[i]]
		}

		const newQueue = [...past, ...future]
		set({ queue: newQueue })
		// Auto-save
		const { saveQueueToStorage } = get()
		saveQueueToStorage()
	},
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
	playAlbumImmediately: (songs) => {
		const { queue } = get()
		// Filter out duplicates to avoid mess (optional, but consistent with other methods)
		const uniqueSongs = songs.filter((song) => !queue.find((q) => q.path === song.path))

		// If we want to strictly "move" them continuously to top, we might need more complex logic.
		// But "add to front" usually means Prepend.
		// If songs are ALREADY in queue, we might duplicate them if we don't filter?
		// The requirement is "add to start and play".
		// Let's assume we prepend them.

		const newQueue = [...songs, ...queue]
		set({
			queue: newQueue,
			currentIndex: 0,
			playingPath: songs[0]?.path || null,
			isPlaying: true
		})

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
			// Song not in queue, add it to the BEGINNING and play
			const newQueue = [song, ...queue]
			set({ queue: newQueue, currentIndex: 0, playingPath: song.path, isPlaying: true })
		}
		// Auto-save
		const { saveQueueToStorage } = get()
		saveQueueToStorage()
	},
	clearQueue: () => {
		const { queue, currentIndex } = get()
		if (currentIndex !== -1 && queue[currentIndex]) {
			// Keep current playing song, remove everything else
			set({ queue: [queue[currentIndex]], currentIndex: 0 })
		} else {
			// No song playing, clear all
			set({ queue: [], currentIndex: -1 })
		}
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
		} catch (error) { }
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
