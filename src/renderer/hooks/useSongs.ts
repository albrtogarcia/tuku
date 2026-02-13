import { useState, useEffect } from 'react'
import type { Song } from '../../types/song'

const sanitizeCover = (cover: string | null) => {
	if (!cover) return cover
	// Strip cache-busting params/fragments so DB keeps the canonical path
	return cover.split(/[?#]/)[0]
}

export function useSongs() {
	const [folderPath, setFolderPath] = useState<string | null>(null)
	const [songs, setSongs] = useState<Song[]>([])
	const [lastUpdated, setLastUpdated] = useState<string | null>(null)
	const [isFirstRun, setIsFirstRun] = useState(false)

	useEffect(() => {
		// On mount, try to load library from SQLite
		;(async () => {
			const loaded: Song[] = await window.electronAPI.loadLibrary()
			if (loaded && loaded.length > 0) {
				setSongs(loaded)
				// Load last updated timestamp from SQLite
				const timestamp = await window.electronAPI.getLibraryMetadata('lastUpdated')
				setLastUpdated(timestamp)
				// Load folder path from SQLite
				const savedFolderPath = await window.electronAPI.getLibraryMetadata('folderPath')
				console.log('Loaded folderPath from DB:', savedFolderPath)
				if (savedFolderPath) {
					setFolderPath(savedFolderPath)
				}
			} else {
				// Check if there's a saved folder path (empty library but folder configured)
				const savedFolderPath = await window.electronAPI.getLibraryMetadata('folderPath')
				if (!savedFolderPath) {
					setIsFirstRun(true)
				}
			}
		})()
	}, [])



	useEffect(() => {
		// Save the library every time it changes
		if (songs.length > 0) {
			const songsToSave = songs.map((song) => ({
				...song,
				cover: sanitizeCover(song.cover),
			}))

			window.electronAPI.saveLibrary(songsToSave)
		}
	}, [songs])

	const handleSelectFolder = async () => {
		const path = await window.electronAPI.selectFolder()
		if (path) {
			setFolderPath(path)
			// Save folder path to SQLite
			console.log('Saving folderPath to DB:', path)
			const saved = await window.electronAPI.setLibraryMetadata('folderPath', path)
			console.log('FolderPath saved:', saved)
			const files = await window.electronAPI.getAudioFiles(path)
			setSongs(files)
			setIsFirstRun(false)
			// Timestamp is updated automatically by saveLibrary in the useEffect above
			const now = new Date().toISOString()
			setLastUpdated(now)
		}
	}

	const handleRescanFolder = async () => {
		if (folderPath) {
			const files = await window.electronAPI.getAudioFiles(folderPath)
			setSongs(files)
			// Timestamp is updated automatically by saveLibrary in the useEffect above
			const now = new Date().toISOString()
			setLastUpdated(now)
		}
	}

	return {
		folderPath,
		setFolderPath,
		songs,
		setSongs,
		lastUpdated,
		isFirstRun,
		handleSelectFolder,
		handleRescanFolder,
	}
}
