import { useState, useEffect, useRef } from 'react'
import { Song } from '../types/song'

function App() {
	const [folderPath, setFolderPath] = useState<string | null>(null)
	const [songs, setSongs] = useState<Song[]>([])
	const [playingPath, setPlayingPath] = useState<string | null>(null)
	const [audioUrl, setAudioUrl] = useState<string | null>(null)
	const [pendingPlay, setPendingPlay] = useState(false)
	const [search, setSearch] = useState('')
	const audioRef = useRef<HTMLAudioElement>(null)

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

	const handlePlay = async (songPath: string) => {
		const buffer = await window.electronAPI.getAudioBuffer(songPath)
		if (buffer) {
			if (audioUrl) URL.revokeObjectURL(audioUrl)
			const blob = new Blob([buffer])
			const url = URL.createObjectURL(blob)
			setAudioUrl(url)
			setPlayingPath(songPath)
			setPendingPlay(true)
		}
	}

	const handleCanPlay = () => {
		if (pendingPlay && audioRef.current) {
			audioRef.current.play()
			setPendingPlay(false)
		}
	}

	const handleStop = () => {
		audioRef.current?.pause()
		audioRef.current!.currentTime = 0
		setPlayingPath(null)
		if (audioUrl) {
			URL.revokeObjectURL(audioUrl)
			setAudioUrl(null)
		}
	}

	const filteredSongs = songs.filter((song) => {
		const q = search.toLowerCase()
		return (
			song.title.toLowerCase().includes(q) ||
			song.artist.toLowerCase().includes(q) ||
			song.album.toLowerCase().includes(q) ||
			song.genre.toLowerCase().includes(q)
		)
	})

	return (
		<div style={{ padding: 32 }}>
			<h1>🎵 Tuku </h1>
			<button onClick={handleSelectFolder}>Seleccionar carpeta de música</button>
			{folderPath && (
				<p>
					Carpeta seleccionada: <span>{folderPath}</span>
				</p>
			)}
			{/* Buscador */}
			<input
				type="text"
				placeholder="Buscar por título, artista, álbum o género..."
				value={search}
				onChange={(e) => setSearch(e.target.value)}
				style={{ margin: '16px 0', padding: 8, width: 400, maxWidth: '100%' }}
			/>
			{filteredSongs.length > 0 && (
				<div>
					<h2>Canciones encontradas: {filteredSongs.length} canciones</h2>
					<ul className="songs-list" style={{ listStyleType: 'none', padding: 0 }}>
						{filteredSongs.map((song) => (
							<li className="song" key={song.path} style={{ display: 'flex', alignItems: 'flex-start', marginBlock: 16 }}>
								<div className="cover">
									{!song.cover && (
										<div style={{ width: 32, height: 32, backgroundColor: '#ccc', display: 'inline-block', marginRight: 8, flexShrink: 1, aspectRatio: 1 }} />
									)}
									{song.cover && (
										<img src={song.cover} alt="cover" width={32} style={{ verticalAlign: 'middle', marginRight: 8, flexShrink: 1, aspectRatio: 1 }} />
									)}
								</div>

								<div className="song-info" style={{ flexGrow: 1 }}>
									<strong>{song.title}</strong>
									<br />
									<small>
										{song.artist} ({song.album})
										{song.genre && (
											<span>
												{' '}
												— <em>{song.genre}</em>
											</span>
										)}
									</small>

									{/* <pre>{JSON.stringify(song, null, 2)}</pre> */}
								</div>

								<div className="song-actions" style={{ marginLeft: 'auto' }}>
									<button style={{ marginLeft: 8 }} onClick={() => handlePlay(song.path)} disabled={playingPath === song.path}>
										Play
									</button>
									<button style={{ marginLeft: 4 }} onClick={handleStop} disabled={playingPath !== song.path}>
										Stop
									</button>
								</div>
							</li>
						))}
					</ul>
				</div>
			)}
			{/* Audio player (hidden) */}
			<audio ref={audioRef} src={audioUrl || undefined} style={{ display: 'none' }} onEnded={handleStop} onCanPlay={handleCanPlay} />
		</div>
	)
}

export default App
