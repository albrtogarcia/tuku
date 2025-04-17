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
	const [isPlaying, setIsPlaying] = useState(false)
	const [currentTime, setCurrentTime] = useState(0)
	const [duration, setDuration] = useState(0)

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
			setIsPlaying(true)
		}
	}

	const handlePause = () => {
		audioRef.current?.pause()
		setIsPlaying(false)
	}

	const handleResume = () => {
		audioRef.current?.play()
		setIsPlaying(true)
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
		setIsPlaying(false)
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

	// Eliminar una canción de la cola
	const removeFromQueue = (index: number) => {
		setQueue((prev) => prev.filter((_, i) => i !== index))
		if (index === currentIndex) {
			// Si eliminamos la actual, reproducir la siguiente
			if (index < queue.length - 1) {
				setCurrentIndex(index)
				handlePlay(queue[index + 1].path)
			} else {
				setCurrentIndex(-1)
				handleStop()
			}
		} else if (index < currentIndex) {
			setCurrentIndex((prev) => prev - 1)
		}
	}

	// Vaciar la cola
	const clearQueue = () => {
		setQueue([])
		setCurrentIndex(-1)
		handleStop()
	}

	// Cuando termina la canción actual, eliminarla de la cola y reproducir la siguiente
	const handleEnded = () => {
		setQueue((prev) => {
			const newQueue = prev.filter((_, i) => i !== currentIndex)
			if (currentIndex < prev.length - 1) {
				setCurrentIndex(currentIndex)
				if (newQueue[currentIndex]) {
					handlePlay(newQueue[currentIndex].path)
				}
			} else {
				setCurrentIndex(-1)
				handleStop()
			}
			return newQueue
		})
	}

	function formatTime(sec: number) {
		const m = Math.floor(sec / 60)
		const s = Math.floor(sec % 60)
		return `${m}:${s.toString().padStart(2, '0')}`
	}

	const playAndInsertToQueue = (song: Song, idx: number) => {
		if (idx === currentIndex) {
			handlePlay(song.path)
		} else {
			setQueue(prev => {
				const newQueue = [...prev]
				newQueue.splice(currentIndex + 1, 0, song)
				return newQueue
			})
			setCurrentIndex(currentIndex + 1)
			handlePlay(song.path)
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

			{/* Cola de reproducción */}
			{queue.length > 0 && (
				<div style={{ margin: '24px 0' }}>
					<h3>Cola de reproducción</h3>
					<ol style={{ listStyleType: 'none', padding: 0 }}>
						{queue.map((song, idx) => (
							<li key={song.path + '-' + idx} style={{ fontWeight: idx === currentIndex ? 'bold' : 'normal', display: 'flex', alignItems: 'center' }}>
								{song.title} {idx === currentIndex && '🎶'}
								<button style={{ marginLeft: 'auto' }} onClick={() => removeFromQueue(idx)} title="Eliminar de la cola">
									<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#000000" viewBox="0 0 256 256">
										<path d="M208.49,191.51a12,12,0,0,1-17,17L128,145,64.49,208.49a12,12,0,0,1-17-17L111,128,47.51,64.49a12,12,0,0,1,17-17L128,111l63.51-63.52a12,12,0,0,1,17,17L145,128Z"></path>
									</svg>
								</button>
							</li>
						))}
					</ol>
					<div style={{ margin: '16px 0', display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
						<button onClick={playPrev} disabled={currentIndex <= 0}>
							<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#000000" viewBox="0 0 256 256">
								<path d="M232,71.84V184.16a15.92,15.92,0,0,1-24.48,13.34L128,146.86v37.3a15.92,15.92,0,0,1-24.48,13.34L15.33,141.34a15.8,15.8,0,0,1,0-26.68L103.52,58.5A15.91,15.91,0,0,1,128,71.84v37.3L207.52,58.5A15.91,15.91,0,0,1,232,71.84Z"></path>
							</svg>
						</button>
						{isPlaying ? (
							<button onClick={handlePause}>
								<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#000000" viewBox="0 0 256 256">
									<path d="M216,48V208a16,16,0,0,1-16,16H160a16,16,0,0,1-16-16V48a16,16,0,0,1,16-16h40A16,16,0,0,1,216,48ZM96,32H56A16,16,0,0,0,40,48V208a16,16,0,0,0,16,16H96a16,16,0,0,0,16-16V48A16,16,0,0,0,96,32Z"></path>
								</svg>
							</button>
						) : (
							<button onClick={handleResume} disabled={currentIndex === -1}>
								<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#000000" viewBox="0 0 256 256">
									<path d="M240,128a15.74,15.74,0,0,1-7.6,13.51L88.32,229.65a16,16,0,0,1-16.2.3A15.86,15.86,0,0,1,64,216.13V39.87a15.86,15.86,0,0,1,8.12-13.82,16,16,0,0,1,16.2.3L232.4,114.49A15.74,15.74,0,0,1,240,128Z"></path>
								</svg>
							</button>
						)}
						<button onClick={playNext} disabled={currentIndex === -1 || currentIndex >= queue.length - 1}>
							<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#000000" viewBox="0 0 256 256">
								<path d="M256,128a15.76,15.76,0,0,1-7.33,13.34L160.48,197.5A15.91,15.91,0,0,1,136,184.16v-37.3L56.48,197.5A15.91,15.91,0,0,1,32,184.16V71.84A15.91,15.91,0,0,1,56.48,58.5L136,109.14V71.84A15.91,15.91,0,0,1,160.48,58.5l88.19,56.16A15.76,15.76,0,0,1,256,128Z"></path>
							</svg>
						</button>
						<button onClick={clearQueue} style={{ marginLeft: 'auto' }}>
							<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#000000" viewBox="0 0 256 256">
								<path d="M216,48H176V40a24,24,0,0,0-24-24H104A24,24,0,0,0,80,40v8H40a8,8,0,0,0,0,16h8V208a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V64h8a8,8,0,0,0,0-16ZM112,168a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Zm48,0a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Zm0-120H96V40a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8Z"></path>
							</svg>
						</button>
					</div>
				</div>
			)}

			{/* Barra de progreso y tiempos de reproducción */}
			{isPlaying && (
				<div style={{ margin: '16px 0', width: 400, maxWidth: '100%', display: 'flex', alignItems: 'center', gap: 16 }}>
					{/* Carátula grande */}
					{queue[currentIndex]?.cover ? (
						<img src={queue[currentIndex]?.cover} alt="cover" width={96} height={96} style={{ borderRadius: 8, boxShadow: '0 2px 8px #0002', objectFit: 'cover' }} />
					) : (
						<div style={{ width: 96, height: 96, background: '#ccc', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', fontSize: 32 }}>
							 🎵
						</div>
					)}
					<div style={{ flex: 1 }}>
						<div>
							<strong>Reproduciendo:</strong> {queue[currentIndex]?.title || ''}
							<br />
							<small>{queue[currentIndex]?.artist} {queue[currentIndex]?.album && <>— {queue[currentIndex]?.album}</>}</small>
						</div>
						<input
							type="range"
							min={0}
							max={duration}
							value={currentTime}
							onChange={e => {
								const time = Number(e.target.value)
								audioRef.current!.currentTime = time
								setCurrentTime(time)
							}}
							style={{ width: '100%' }}
						/>
						<div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
							<span>{formatTime(currentTime)}</span>
							<span>{formatTime(duration)}</span>
						</div>
					</div>
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
						{filteredSongs.map((song, idx) => (
							<li className="song" key={song.path + '-' + idx} style={{ display: 'flex', alignItems: 'flex-start', marginBlock: 16 }}>
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

								<div className="song-actions" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
									<button
										style={{ marginLeft: 8 }}
										onClick={() => playAndInsertToQueue(song, idx)}
										disabled={playingPath === song.path}
									>
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
			<audio
				ref={audioRef}
				src={audioUrl || undefined}
				style={{ display: 'none' }}
				onEnded={handleEnded}
				onCanPlay={handleCanPlay}
				onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
				onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
			/>
		</div>
	)
}

export default App
