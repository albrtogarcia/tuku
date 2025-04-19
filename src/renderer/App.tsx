import { useState, useEffect, useRef } from 'react'
import { Song } from '../types/song'
import { Play, Pause, Stop, Rewind, Trash, X, FastForward, Plus } from '@phosphor-icons/react'
import './styles/app.scss'
import Queue from './components/Queue'
import Player from './components/Player'
import SongsList from './components/SongsList'

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
				<Queue
					queue={queue}
					currentIndex={currentIndex}
					isPlaying={isPlaying}
					playPrev={playPrev}
					playNext={playNext}
					handlePause={handlePause}
					handleResume={handleResume}
					clearQueue={clearQueue}
					removeFromQueue={removeFromQueue}
				/>
			)}

			{/* PLAYER */}
			{isPlaying && (
				<Player
					song={queue[currentIndex]}
					duration={duration}
					currentTime={currentTime}
					onSeek={(time) => {
						audioRef.current!.currentTime = time
						setCurrentTime(time)
					}}
					formatTime={formatTime}
				/>
			)}

			{/* SEARCH */}
			<div className="search">
				<input type="search" placeholder="Search songs..." value={search} onChange={(e) => setSearch(e.target.value)} className="search__input" />
			</div>

			{/* SONGS LIST */}
			{filteredSongs.length > 0 && (
				<SongsList
					songs={filteredSongs}
					playingPath={playingPath}
					handlePause={handlePause}
					handleResume={handleResume}
					addToQueue={addToQueue}
					handleSelectFolder={handleSelectFolder}
					folderPath={folderPath}
				/>
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
