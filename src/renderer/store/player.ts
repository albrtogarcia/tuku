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
	clearQueue: () => void
	removeFromQueue: (index: number) => void
	insertInQueue: (song: Song, position: number) => void
	cleanQueueHistory: () => void
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
		// Guardar automáticamente cuando se cambie la cola
		const { saveQueueToStorage } = get()
		saveQueueToStorage()
	},
	setCurrentIndex: (idx) => {
		set({ currentIndex: idx })
		// Guardar automáticamente cuando se cambie el índice
		const { saveQueueToStorage } = get()
		saveQueueToStorage()
	},
	setIsPlaying: (isPlaying) => set({ isPlaying }),
	setPlayingPath: (path) => set({ playingPath: path }),
	setRepeat: (repeat) => set({ repeat }),
	setShuffle: (shuffle) => set({ shuffle }),
	addToQueue: (song) => {
		const { queue, currentIndex } = get()
		const newQueue = [...queue, song]
		set({ queue: newQueue })
		if (currentIndex === -1) {
			set({ currentIndex: 0, playingPath: song.path, isPlaying: true })
		}
		// Guardar automáticamente
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
		// Guardar automáticamente
		const { saveQueueToStorage } = get()
		saveQueueToStorage()
	},
	clearQueue: () => {
		set({ queue: [], currentIndex: -1 })
		// No establecer isPlaying: false ni playingPath: null para permitir que la canción actual siga reproduciéndose
		// Guardar automáticamente
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
		// Guardar automáticamente
		const { saveQueueToStorage } = get()
		saveQueueToStorage()
	},
	insertInQueue: (song, position) => {
		const { queue } = get()
		// Evitar duplicados
		if (queue.find((q) => q.path === song.path)) return
		const newQueue = [...queue]
		newQueue.splice(position, 0, song)
		set({ queue: newQueue })
		// Guardar automáticamente
		const { saveQueueToStorage } = get()
		saveQueueToStorage()
	},
	cleanQueueHistory: () => {
		const { queue, currentIndex } = get()
		if (currentIndex > 3) {
			const newQueue = queue.slice(currentIndex - 3)
			const newIndex = 3
			set({ queue: newQueue, currentIndex: newIndex })
			// Guardar automáticamente
			const { saveQueueToStorage } = get()
			saveQueueToStorage()
		}
	},
	loadQueueFromStorage: async () => {
		try {
			const loaded = await window.electronAPI.loadQueue()
			if (!loaded || !loaded.queue || loaded.queue.length === 0) {
				console.log('No queue found in storage or queue is empty')
				return
			}

			console.log('Loading queue from storage:', loaded)

			// Cargar la librería completa para obtener metadatos
			const library: Song[] = await window.electronAPI.loadLibrary()
			if (library.length === 0) {
				console.log('No library found, cannot restore queue with metadata')
				return
			}

			const libraryMap = new Map(library.map((song) => [song.path, song]))

			// Construir la cola con metadatos completos
			const queueWithMetadata: Song[] = loaded.queue.map((path) => libraryMap.get(path)).filter((song): song is Song => song !== undefined)

			if (queueWithMetadata.length > 0) {
				const currentIndex = Math.max(0, Math.min(loaded.currentIndex, queueWithMetadata.length - 1))

				set({
					queue: queueWithMetadata,
					currentIndex: currentIndex,
					playingPath: queueWithMetadata[currentIndex]?.path || null,
				})

				console.log(`Queue restored: ${queueWithMetadata.length} songs, currentIndex: ${currentIndex}`)
			} else {
				console.log('No valid songs found for queue restoration')
			}
		} catch (error) {
			console.error('Error loading queue from storage:', error)
		}
	},
	saveQueueToStorage: async () => {
		try {
			const { queue, currentIndex } = get()
			await window.electronAPI.saveQueue(queue, currentIndex)
		} catch (error) {
			console.error('Error saving queue to storage:', error)
		}
	},
}))

// Hook para sincronizar la cola y el índice con SQLite (opcional, no se usa actualmente)
export function useQueuePersistence(queue: Song[], currentIndex: number) {
	useEffect(() => {
		window.electronAPI.saveQueue(queue, currentIndex)
	}, [queue, currentIndex])
}
