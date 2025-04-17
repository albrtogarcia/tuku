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

	const [queue, setQueue] = useState<Song[]>([])
	const [currentIndex, setCurrentIndex] = useState<number>(-1)

	enum PlayerState {
		STOPPED,
		PLAYING,
	}
	const [playerState, setPlayerState] = useState<PlayerState>(PlayerState.STOPPED)

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

	const addToQueue = (song: Song) => {
		setQueue((prev) => [...prev, song])
		if (currentIndex === -1) {
			setCurrentIndex(0)
			handlePlay(song.path)
		}
	}

	const playNext = () => {
		if (currentIndex + 1 < queue.length) {
			setCurrentIndex(currentIndex + 1)
			handlePlay(queue[currentIndex + 1].path)
		}
	}

	const playPrev = () => {
		if (currentIndex > 0) {
			setCurrentIndex(currentIndex - 1)
			handlePlay(queue[currentIndex - 1].path)
		}
	}

	const handleEnded = () => {
		playNext()
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

			{/* Cola de reproducción */}
			{queue.length > 0 && (
				<div style={{ margin: '24px 0' }}>
					<h3>Cola de reproducción</h3>
					<ol>
						{queue.map((song, idx) => (
							<li key={song.path} style={{ fontWeight: idx === currentIndex ? 'bold' : 'normal' }}>
								{song.title} {idx === currentIndex && '▶️'}
							</li>
						))}
					</ol>
					<button onClick={playPrev} disabled={currentIndex <= 0}>
						Anterior
					</button>
					<button onClick={playNext} disabled={currentIndex === -1 || currentIndex >= queue.length - 1}>
						Siguiente
					</button>
				</div>
			)}

			{/* Buscador */}
			<input
				type="text"
				placeholder="Buscar por título, artista, álbum o género..."
				value={search}
				onChange={(e) => setSearch(e.target.value)}
				style={{ margin: '16px 0', padding: 8, width: 400, maxWidth: '100%' }}
			/>

			{/* Lista de canciones */}
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
										<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#000000" viewBox="0 0 256 256">
											<path d="M240,128a15.74,15.74,0,0,1-7.6,13.51L88.32,229.65a16,16,0,0,1-16.2.3A15.86,15.86,0,0,1,64,216.13V39.87a15.86,15.86,0,0,1,8.12-13.82,16,16,0,0,1,16.2.3L232.4,114.49A15.74,15.74,0,0,1,240,128Z"></path>
										</svg>
									</button>
									<button style={{ marginLeft: 4 }} onClick={handleStop} disabled={playingPath !== song.path}>
										<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#000000" viewBox="0 0 256 256">
											<path d="M216,56V200a16,16,0,0,1-16,16H56a16,16,0,0,1-16-16V56A16,16,0,0,1,56,40H200A16,16,0,0,1,216,56Z"></path>
										</svg>
									</button>
									<button style={{ marginLeft: 4 }} onClick={() => addToQueue(song)}>
										<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#000000" viewBox="0 0 256 256">
											<path d="M228,128a12,12,0,0,1-12,12H140v76a12,12,0,0,1-24,0V140H40a12,12,0,0,1,0-24h76V40a12,12,0,0,1,24,0v76h76A12,12,0,0,1,228,128Z"></path>
										</svg>
									</button>
								</div>
							</li>
						))}
					</ul>
				</div>
			)}

			{/* Audio player (hidden) */}
			<audio ref={audioRef} src={audioUrl || undefined} style={{ display: 'none' }} onEnded={handleEnded} onCanPlay={handleCanPlay} />
		</div>
	)
}

export default App
