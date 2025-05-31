import { useState, useEffect } from 'react'
import type { Song } from '../../types/song'

export function useSongs() {
	const [folderPath, setFolderPath] = useState<string | null>(null)
	const [songs, setSongs] = useState<Song[]>([])
	const [lastUpdated, setLastUpdated] = useState<string | null>(null)

	useEffect(() => {
		// On mount, try to load library from SQLite
		;(async () => {
			const loaded: Song[] = await window.electronAPI.loadLibrary()
			if (loaded && loaded.length > 0) {
				setSongs(loaded)
				// Load last updated timestamp from SQLite
				const timestamp = await window.electronAPI.getLibraryMetadata('lastUpdated')
				setLastUpdated(timestamp)
			}
		})()
	}, [])

	useEffect(() => {
		const fetchFiles = async () => {
			if (folderPath) {
				const files = await window.electronAPI.getAudioFiles(folderPath)
				setSongs(files)
				// Update timestamp when songs are loaded - stored in SQLite automatically by saveLibrary
				const now = new Date().toISOString()
				setLastUpdated(now)
			}
		}
		fetchFiles()
	}, [folderPath])

	useEffect(() => {
		// Save the library every time it changes
		if (songs.length > 0) {
			window.electronAPI.saveLibrary(songs)
		}
	}, [songs])

	const handleSelectFolder = async () => {
		const path = await window.electronAPI.selectFolder()
		if (path) {
			setFolderPath(path)
			const files = await window.electronAPI.getAudioFiles(path)
			setSongs(files)
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
		handleSelectFolder,
		handleRescanFolder,
	}
}
