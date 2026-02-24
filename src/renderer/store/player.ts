import { create } from 'zustand'
import { useEffect } from 'react'
import type { Song } from '../../types/song'

interface PlayerState {
	queue: Song[]
	currentIndex: number
	isPlaying: boolean
	playingPath: string | null
	repeat: boolean
	playHistory: Song[]
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
	addToHistory: (songs: Song[]) => void
	clearHistory: () => void
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
	playHistory: [],
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
		const { queue, currentIndex, playHistory } = get()

		// Move the currently playing song (and anything before it) to history
		const playedSongs = currentIndex >= 0 ? queue.slice(0, currentIndex + 1) : []
		const upcoming = currentIndex >= 0 ? queue.slice(currentIndex + 1) : queue

		const newHistory = [...playedSongs.reverse(), ...playHistory].slice(0, 25)
		const newQueue = [...songs, ...upcoming]

		set({
			queue: newQueue,
			currentIndex: 0,
			playingPath: songs[0]?.path || null,
			isPlaying: true,
			playHistory: newHistory,
		})

		const { saveQueueToStorage } = get()
		saveQueueToStorage()
	},
	playNow: (song) => {
		const { queue } = get()
		// Remove existing instance if any
		const filteredQueue = queue.filter((q) => q.path !== song.path)
		// Add to beginning
		const newQueue = [song, ...filteredQueue]

		set({ queue: newQueue, currentIndex: 0, playingPath: song.path, isPlaying: true })

		// Auto-save
		const { saveQueueToStorage } = get()
		saveQueueToStorage()
	},
	clearQueue: () => {
		const { queue, currentIndex, isPlaying } = get()
		if (isPlaying && currentIndex !== -1 && queue[currentIndex]) {
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
	addToHistory: (songs) => {
		const { playHistory } = get()
		set({ playHistory: [...songs, ...playHistory].slice(0, 25) })
	},
	clearHistory: () => set({ playHistory: [] }),
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
			const [loaded, library, savedHistory] = await Promise.all([
				window.electronAPI.loadQueue(),
				window.electronAPI.loadLibrary(),
				window.electronAPI.getLibraryMetadata('playHistory'),
			])

			if (library.length === 0) return

			const libraryMap = new Map(library.map((song: Song) => [song.path, song]))

			// Restore play history
			if (savedHistory) {
				try {
					const historyPaths: string[] = JSON.parse(savedHistory)
					const historyWithMetadata = historyPaths.map((p) => libraryMap.get(p)).filter(Boolean) as Song[]
					if (historyWithMetadata.length > 0) {
						set({ playHistory: historyWithMetadata })
					}
				} catch { }
			}

			// Restore queue
			if (!loaded || !loaded.queue || loaded.queue.length === 0) return

			const queueWithMetadata: Song[] = []
			const missingSongs: string[] = []

			loaded.queue.forEach((path: string) => {
				const song = libraryMap.get(path)
				if (song) {
					queueWithMetadata.push(song)
				} else {
					missingSongs.push(path)
				}
			})

			if (missingSongs.length > 0) {
				console.warn(`[Player Store] ${missingSongs.length} songs removed from queue (not found in library)`)
				window.dispatchEvent(new CustomEvent('queue-songs-removed', { detail: missingSongs.length }))
			}

			if (queueWithMetadata.length > 0) {
				const currentIndex = Math.max(0, Math.min(loaded.currentIndex, queueWithMetadata.length - 1))
				set({
					queue: queueWithMetadata,
					currentIndex,
					playingPath: queueWithMetadata[currentIndex]?.path || null,
				})
			}
		} catch (error) { }
	},
	saveQueueToStorage: async () => {
		try {
			const { queue, currentIndex, playHistory } = get()
			await Promise.all([
				window.electronAPI.saveQueue(queue, currentIndex),
				window.electronAPI.setLibraryMetadata('playHistory', JSON.stringify(playHistory.map((s) => s.path))),
			])
		} catch (error) {
			// Error saving queue to storage
		}
	},
}))
