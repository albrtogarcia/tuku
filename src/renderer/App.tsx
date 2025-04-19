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
		<div className="app">
			<h1>🎵 Tuku </h1>

			{/* Cola de reproducción */}
			{queue.length > 0 && (
				<div className="queue">
					<h3 className="queue__title">Queue</h3>
					<ol className="queue__list">
						{queue.map((song, idx) => (
							<li key={song.path + '-' + idx} className={`queue__item ${idx === currentIndex ? 'active' : ''}`}>
								{song.title} {idx === currentIndex && '🎶'}
								<button className="btn" onClick={() => removeFromQueue(idx)} title="Remove from queue">
									<X size={16} weight="bold" />
								</button>
							</li>
						))}
					</ol>
					<div className="queue__actions">
						<button className="btn" onClick={playPrev} title="Previous song" disabled={currentIndex <= 0}>
							<Rewind size={16} weight="fill" />
						</button>
						{isPlaying ? (
							<button className="btn" onClick={handlePause} title="Pause" disabled={currentIndex === -1}>
								<Pause size={16} weight="fill" />
							</button>
						) : (
							<button className="btn" onClick={handleResume} title="Play" disabled={currentIndex === -1}>
								<Play size={16} weight="fill" />
							</button>
						)}
						<button className="btn" onClick={playNext} title="Next song" disabled={currentIndex === -1 || currentIndex >= queue.length - 1}>
							<FastForward size={16} weight="fill" />
						</button>
						<button className="btn" onClick={clearQueue} title="Clear queue" disabled={queue.length === 0}>
							<Trash size={16} weight="fill" />
						</button>
					</div>
				</div>
			)}

			{/* PLAYER */}
			{isPlaying && (
				<div className="player">
					{queue[currentIndex]?.cover ? (
						<img className="player__cover" src={queue[currentIndex]?.cover} alt="cover" />
					) : (
						<div className="player__cover--default">🎵</div>
					)}
					<div className="player__info">
						<h4 className="song__title">{queue[currentIndex]?.title || ''}</h4>
						<p className="song__metadata">
							{queue[currentIndex]?.artist} {queue[currentIndex]?.album && <>— {queue[currentIndex]?.album}</>}
						</p>
						<div className="player__controls">
							<input
								className="player__progress"
								type="range"
								min={0}
								max={duration}
								value={currentTime}
								onChange={(e) => {
									const time = Number(e.target.value)
									audioRef.current!.currentTime = time
									setCurrentTime(time)
								}}
							/>
							<div className="player__time">
								<span>{formatTime(currentTime)}</span>
								<span>{formatTime(duration)}</span>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* SEARCH */}
			<div className="search">
				<input type="search" placeholder="Search songs..." value={search} onChange={(e) => setSearch(e.target.value)} className="search__input" />
			</div>

			{/* SONGS LIST */}
			{filteredSongs.length > 0 && (
				<section className="songs">
					<header className="songs__header">
						<h2>Library: {filteredSongs.length} songs</h2>
						<button className="btn btn-secondary" onClick={handleSelectFolder}>
							{folderPath ? folderPath : 'Select music folder'}
						</button>
					</header>

					<ul className="songs__list">
						{filteredSongs.map((song, idx) => (
							<li className="song" key={song.path + '-' + idx}>
								{!song.cover && <div className="song__cover--default" />}
								{song.cover && <img className="song__cover" src={song.cover} alt={song.album} width={32} />}

								<div className="song__info">
									<p className="song__title">{song.title}</p>
									<small className="song__metadata">
										{song.artist} ({song.album})
										{song.genre && (
											<span>
												{' '}
												— <em>{song.genre}</em>
											</span>
										)}
									</small>
								</div>

								<div className="song__actions">
									{playingPath === song.path ? (
										<button className="btn btn-icon" onClick={handlePause}>
											<Pause size={16} weight="fill" />
										</button>
									) : (
										<button className="btn btn-icon" onClick={handleResume}>
											<Play size={16} weight="fill" />
										</button>
									)}

									<button className="btn btn-icon" onClick={() => addToQueue(song)}>
										<Plus size={16} weight="bold" />
									</button>
								</div>
							</li>
						))}
					</ul>
				</section>
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
