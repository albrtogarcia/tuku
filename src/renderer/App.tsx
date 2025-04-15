import { useState, useEffect } from 'react'
import { Song } from '../types/song'

function App() {
	const [folderPath, setFolderPath] = useState<string | null>(null)
	const [songs, setSongs] = useState<Song[]>([])
	useEffect(() => {
		const fetchFiles = async () => {
			if (folderPath) {
				const files = await window.electronAPI.getAudioFiles(folderPath)
				setSongs(files)
			}
		}
		fetchFiles()
	}, [folderPath])

	const handleSelectFolder = async () => {
		const path = await window.electronAPI.selectFolder()
		if (path) {
			setFolderPath(path)
			const files = await window.electronAPI.getAudioFiles(path)
			setSongs(files)
		}
	}

	return (
		<div style={{ padding: 32 }}>
			<h1>🎵 Bienvenido a Tuku</h1>
			<button onClick={handleSelectFolder}>Seleccionar carpeta de música</button>
			{folderPath && (
				<p>
					<strong>Carpeta seleccionada:</strong> {folderPath}
				</p>
			)}
			{songs.length > 0 && (
				<div>
					<h2>Canciones encontradas:</h2>
					<ul>
						{songs.map((song) => (
							<li key={song.path}>
								<pre>{JSON.stringify(song, null, 2)}</pre>
								{song.cover && <img src={song.cover} alt="cover" width={32} style={{ verticalAlign: 'middle', marginRight: 8 }} />}
								<strong>{song.title}</strong> — {song.artist} ({song.album})
							</li>
						))}
					</ul>
				</div>
			)}
		</div>
	)
}

export default App
