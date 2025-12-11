import { useState, useEffect } from 'react'
import './styles/app.scss'
import Queue from './components/Queue/Queue'
import Player from './components/Player/Player'
import SongsList from './components/SongsList/SongsList'
import SearchBar from './components/SearchBar/SearchBar'
import AlbumsGrid from './components/AlbumsGrid/AlbumsGrid'
import Settings from './components/Settings/Settings'
import { useAudioPlayer } from './hooks/useAudioPlayer'
import { useSongs } from './hooks/useSongs'
import { formatTime, filterSongs } from './utils'
import { usePlayerStore } from './store/player'

import { Song } from '../types/song'

interface Album {
	id: string
	title: string
	artist: string
	cover: string
	year: number
	songs: Song[]
}

function groupAlbums(songs: Song[]): Album[] {
	const albumsMap = new Map<string, Album>()
	songs.forEach((song) => {
		if (!albumsMap.has(song.album)) {
			albumsMap.set(song.album, {
				id: song.album,
				title: song.album,
				artist: song.artist,
				cover: song.cover || '',
				year: song.year || 0,
				songs: [song],
			})
		} else {
			albumsMap.get(song.album)!.songs.push(song)
		}
	})
	return Array.from(albumsMap.values())
}

function App() {
	const { folderPath, songs, handleSelectFolder, lastUpdated, handleRescanFolder, setSongs } = useSongs()
	const [search, setSearch] = useState('')
	const [activeTab, setActiveTab] = useState<'albums' | 'songs'>('albums')
	const [isSettingsOpen, setIsSettingsOpen] = useState(false)
	const [isScanning, setIsScanning] = useState(false)
	const [notification, setNotification] = useState<{ message: string; type: 'error' | 'success' | 'info' } | null>(null)
	const [scanProgress, setScanProgress] = useState({ current: 0, total: 0 })

	const handleShowNotification = (message: string, type: 'error' | 'success' | 'info' = 'info') => {
		setNotification({ message, type })
		setTimeout(() => setNotification(null), 3000)
	}

	useEffect(() => {
		// Listen for scan events
		window.electronAPI.onScanStart((total) => {
			setIsScanning(true)
			setScanProgress({ current: 0, total })
		})

		window.electronAPI.onScanProgress((progress) => {
			setScanProgress(progress)
		})

		window.electronAPI.onScanComplete(() => {
			setIsScanning(false)
			setScanProgress({ current: 0, total: 0 })
		})
	}, [])

	const audio = useAudioPlayer()

	const {
		queue,
		currentIndex,
		isPlaying,
		playingPath,
		addToQueue,
		clearQueue,
		setCurrentIndex,
		cleanQueueHistory,
		repeat,
		shuffle,
		setQueue,
		loadQueueFromStorage,
	} = usePlayerStore()

	// Load queue from storage when app starts
	// Load queue from storage when app starts
	useEffect(() => {
		loadQueueFromStorage()

		// Listen for native menu settings event
		window.electronAPI.onOpenSettings(() => {
			console.log('[App] Received open-settings event from native menu')
			setIsSettingsOpen(true)
		})
	}, [loadQueueFromStorage])

	function getNextShuffleIndex() {
		if (queue.length <= 1) return currentIndex
		const remaining = queue.map((_, idx) => idx).filter((idx) => idx !== currentIndex && idx > currentIndex)
		if (remaining.length === 0) return -1
		const randomIdx = remaining[Math.floor(Math.random() * remaining.length)]
		return randomIdx
	}

	const handleNext = () => {
		if (shuffle) {
			const nextIdx = getNextShuffleIndex()
			if (nextIdx !== -1) {
				setCurrentIndex(nextIdx)
				cleanQueueHistory()
				audio.handlePlay(queue[nextIdx].path)
				return
			} else if (repeat && queue.length > 0) {
				setCurrentIndex(0)
				cleanQueueHistory()
				audio.handlePlay(queue[0].path)
				return
			} else {
				audio.handleStop()
				return
			}
		}
		if (currentIndex + 1 < queue.length) {
			setCurrentIndex(currentIndex + 1)
			cleanQueueHistory()
			audio.handlePlay(queue[currentIndex + 1].path)
		} else if (repeat && queue.length > 0) {
			setCurrentIndex(0)
			cleanQueueHistory()
			audio.handlePlay(queue[0].path)
			return
		} else {
			audio.handleStop()
		}
	}

	const handlePrevious = () => {
		// If > 3 seconds in, restart song
		if (audio.currentTime > 3) {
			audio.setCurrentTime(0)
			return
		}

		if (currentIndex > 0) {
			setCurrentIndex(currentIndex - 1)
			audio.handlePlay(queue[currentIndex - 1].path)
		} else {
			audio.setCurrentTime(0)
		}
	}

	const handleSongEnd = () => {
		handleNext()
	}

	// Media Session API Support
	useEffect(() => {
		if (!('mediaSession' in navigator)) return

		const currentSong = queue[currentIndex]

		if (currentSong) {
			navigator.mediaSession.metadata = new MediaMetadata({
				title: currentSong.title || 'Unknown Title',
				artist: currentSong.artist || 'Unknown Artist',
				album: currentSong.album || 'Unknown Album',
				artwork: currentSong.cover ? [{ src: currentSong.cover, sizes: '512x512', type: 'image/jpeg' }] : []
			})
		}

		navigator.mediaSession.setActionHandler('play', () => audio.handleResume())
		navigator.mediaSession.setActionHandler('pause', () => audio.handlePause())
		navigator.mediaSession.setActionHandler('previoustrack', handlePrevious)
		navigator.mediaSession.setActionHandler('nexttrack', handleNext)

		// Clear handlers on unmount? optional, but good practice if dependencies change often
	}, [currentIndex, queue, audio.handleResume, audio.handlePause, handleNext, handlePrevious])


	const filteredSongs = filterSongs(songs, search)
	const albums = groupAlbums(songs)

	// Function to set queue and start playing
	const handleSetQueue = (songs: Array<any>) => {
		setQueue(songs)
		setCurrentIndex(0)
	}

	const { updateSongMetadata } = usePlayerStore()

	const handleUpdateAlbumCover = (albumName: string, artistName: string, newCover: string) => {
		console.log(`[App] Updating cover for Album="${albumName}", Artist="${artistName}"`)
		let updatedCount = 0
		const updatedSongs = songs.map((song) => {
			if (song.album === albumName && song.artist === artistName) {
				updatedCount++
				// Also update in queue if present
				updateSongMetadata(song.path, { cover: newCover })
				return { ...song, cover: newCover }
			}
			return song
		})
		console.log(`[App] Updated ${updatedCount} songs. Triggering setSongs...`)
		// This will trigger useSongs -> saveLibrary
		// @ts-ignore
		setSongs(updatedSongs)
	}

	return (
		<div className="container">
			<div className="container__player">
				{/* PLAYER - Always show with empty state if needed */}
				<Player audio={audio} songs={songs} onOpenSettings={() => setIsSettingsOpen(true)} />
			</div>
			<div className="container__queue">
				{/* QUEUE - Always show with empty state if needed */}
				<Queue audio={audio} />
			</div>
			<div className="container__library">
				<div className="library">
					<div className="library__header">
						{/* TABS */}
						<div className="tabs">
							<button className={`tabs__button ${activeTab === 'albums' ? 'active' : ''}`} onClick={() => setActiveTab('albums')}>
								Albums <small>({albums.length})</small>
							</button>
							<button className={`tabs__button ${activeTab === 'songs' ? 'active' : ''}`} onClick={() => setActiveTab('songs')}>
								Songs <small>({songs.length})</small>
							</button>
						</div>

						{/* SEARCH */}
						<SearchBar value={search} onChange={(e) => setSearch(e.target.value)} />
					</div>

					{/* TAB CONTENT */}
					<div className="library__body">
						{activeTab === 'albums' && <AlbumsGrid albums={albums} setQueue={handleSetQueue} audio={audio} onUpdateCover={handleUpdateAlbumCover} onOpenSettings={() => setIsSettingsOpen(true)} onShowNotification={handleShowNotification} />}
						{activeTab === 'songs' && <SongsList songs={filteredSongs} audio={audio} addToQueue={addToQueue} folderPath={folderPath} />}
					</div>
				</div>
			</div>
			{/* Audio player (hidden) */}
			<audio
				ref={audio.audioRef}
				src={audio.audioUrl || undefined}
				style={{ display: 'none' }}
				onEnded={handleSongEnd}
				onCanPlay={audio.handleCanPlay}
				onPlay={() => audio.setIsPlaying(true)}
				onPause={() => audio.setIsPlaying(false)}
				onTimeUpdate={() => audio.setCurrentTimeOnly(audio.audioRef.current?.currentTime || 0)}
				onLoadedMetadata={() => audio.setDuration(audio.audioRef.current?.duration || 0)}
			/>

			{/* Scan Progress Bar */}
			{isScanning && (
				<div
					style={{
						position: 'fixed',
						bottom: '20px',
						left: '50%',
						transform: 'translateX(-50%)',
						backgroundColor: '#1e1e1e',
						padding: '12px 24px',
						borderRadius: '8px',
						display: 'flex',
						flexDirection: 'column',
						gap: '8px',
						boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
						zIndex: 1000,
						border: '1px solid #333',
						minWidth: '300px',
					}}
				>
					<div style={{ display: 'flex', justifyContent: 'space-between', color: '#fff', fontSize: '14px' }}>
						<span>Scanning Library...</span>
						<span>
							{scanProgress.current} / {scanProgress.total}
						</span>
					</div>
					<div style={{ width: '100%', height: '4px', backgroundColor: '#333', borderRadius: '2px', overflow: 'hidden' }}>
						<div
							style={{
								width: `${(scanProgress.current / scanProgress.total) * 100}%`,
								height: '100%',
								backgroundColor: '#ff5722',
								transition: 'width 0.2s ease',
							}}
						/>
					</div>
				</div>
			)}

			{/* Notifications */}
			{notification && (
				<div
					style={{
						position: 'fixed',
						bottom: '20px',
						left: '50%',
						transform: 'translateX(-50%)',
						backgroundColor: notification.type === 'error' ? '#d32f2f' : '#1e1e1e',
						padding: '12px 24px',
						borderRadius: '8px',
						display: 'flex',
						alignItems: 'center',
						gap: '8px',
						boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
						zIndex: 1000,
						border: '1px solid #333',
						minWidth: '300px',
						justifyContent: 'center',
						color: 'white'
					}}
				>
					{notification.message}
				</div>
			)}
		</div>
	)
}

export default App
