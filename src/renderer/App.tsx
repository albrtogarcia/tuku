import { useState, useEffect, useRef } from 'react'
import { Song } from '../types/song'
import { Play, Pause, Stop, Rewind, Trash, X, FastForward, Plus } from '@phosphor-icons/react'
import './styles/app.scss'

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
			setQueue((prev) => {
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
				<div className="queue">
					<h3>Cola de reproducción</h3>
					<ol className="queue__list">
						{queue.map((song, idx) => (
							<li key={song.path + '-' + idx} style={{ fontWeight: idx === currentIndex ? 'bold' : 'normal' }}>
								{song.title} {idx === currentIndex && '🎶'}
								<button className="btn" onClick={() => removeFromQueue(idx)} title="Eliminar de la cola">
									<X size={16} weight="bold" />
								</button>
							</li>
						))}
					</ol>
					<div className="queue__actions">
						<button onClick={playPrev} disabled={currentIndex <= 0}>
							<Rewind size={16} weight="fill" />
						</button>
						{isPlaying ? (
							<button onClick={handlePause}>
								<Pause size={16} weight="fill" />
							</button>
						) : (
							<button onClick={handleResume} disabled={currentIndex === -1}>
								<Play size={16} weight="fill" />
							</button>
						)}
						<button onClick={playNext} disabled={currentIndex === -1 || currentIndex >= queue.length - 1}>
							<FastForward size={16} weight="fill" />
						</button>
						<button onClick={clearQueue}>
							<Trash size={16} weight="fill" />
						</button>
					</div>
				</div>
			)}

			{/* Barra de progreso y tiempos de reproducción */}
			{isPlaying && (
				<div className="player" style={{ margin: '16px 0', width: 400, maxWidth: '100%', display: 'flex', alignItems: 'center', gap: 16 }}>
					{/* Carátula grande */}
					{queue[currentIndex]?.cover ? (
						<img
							src={queue[currentIndex]?.cover}
							alt="cover"
							width={96}
							height={96}
							style={{ borderRadius: 8, boxShadow: '0 2px 8px #0002', objectFit: 'cover' }}
						/>
					) : (
						<div className="player__cover">🎵</div>
					)}
					<div style={{ flex: 1 }}>
						<div>
							<strong>Reproduciendo:</strong> {queue[currentIndex]?.title || ''}
							<br />
							<small>
								{queue[currentIndex]?.artist} {queue[currentIndex]?.album && <>— {queue[currentIndex]?.album}</>}
							</small>
						</div>
						<input
							type="range"
							min={0}
							max={duration}
							value={currentTime}
							onChange={(e) => {
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
									<button style={{ marginLeft: 8 }} onClick={() => playAndInsertToQueue(song, idx)} disabled={playingPath === song.path}>
										<Play size={16} weight="fill" />
									</button>
									<button style={{ marginLeft: 4 }} onClick={handleStop} disabled={playingPath !== song.path}>
										<Stop size={16} weight="fill" />
									</button>
									<button style={{ marginLeft: 4 }} onClick={() => addToQueue(song)}>
										<Plus size={16} weight="bold" />
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
