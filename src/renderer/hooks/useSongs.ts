import { useState, useEffect } from 'react'
import type { Song } from '../../types/song'

export function useSongs() {
	const [folderPath, setFolderPath] = useState<string | null>(null)
	const [songs, setSongs] = useState<Song[]>([])

	useEffect(() => {
		// Al montar, intentar cargar la librería desde SQLite
		;(async () => {
			const loaded: Song[] = await window.electronAPI.loadLibrary()
			if (loaded && loaded.length > 0) {
				setSongs(loaded)
			}
		})()
	}, [])

	useEffect(() => {
		const fetchFiles = async () => {
			if (folderPath) {
				const files = await window.electronAPI.getAudioFiles(folderPath)
				setSongs(files)
			}
		}
		fetchFiles()
	}, [folderPath])

	useEffect(() => {
		// Guardar la librería cada vez que cambie
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
		}
	}

	return {
		folderPath,
		setFolderPath,
		songs,
		setSongs,
		handleSelectFolder,
	}
}
