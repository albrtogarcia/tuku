import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import './styles/app.scss'
import Queue from './components/Queue/Queue'
import Player from './components/Player/Player'
import SongsList from './components/SongsList/SongsList'
import SearchBar from './components/SearchBar/SearchBar'
import AlbumsGrid from './components/AlbumsGrid/AlbumsGrid'
import Settings from './components/Settings/Settings'
import { useAudioPlayer } from './hooks/useAudioPlayer'
import { useSongs } from './hooks/useSongs'
import { formatTime, filterSongs, filterAlbums } from './utils'
import Notification from './components/Notifications/Notification'
import ScanProgress from './components/Notifications/ScanProgress'
import { usePlayerStore } from './store/player'
import { useSettingsStore } from './store/settings'

import { useDebounce } from './hooks/useDebounce'
import { Song } from '../types/song'
import { Album } from '../types/album'

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
	const debouncedSearch = useDebounce(search, 300)
	const [activeTab, setActiveTab] = useState<'albums' | 'songs'>('albums')
	const [isSettingsOpen, setIsSettingsOpen] = useState(false)
	const [isScanning, setIsScanning] = useState(false)
	const [notification, setNotification] = useState<{ message: string; type: 'error' | 'success' | 'info' } | null>(null)
	const [errorNotificationShown, setErrorNotificationShown] = useState(false)
	const [scanProgress, setScanProgress] = useState({ current: 0, total: 0 })
	const [failedSongPaths, setFailedSongPaths] = useState<Set<string>>(new Set())

	const handleShowNotification = useCallback((message: string, type: 'error' | 'success' | 'info' = 'info') => {
		setNotification({ message, type })
		// Only auto-hide success and info notifications, keep errors visible
		if (type !== 'error') {
			setTimeout(() => setNotification(null), 3000)
		}
	}, [])

	const handleCleanupMissingFiles = useCallback(async () => {
		try {
			const result = await window.electronAPI.cleanupMissingFiles()
			if (result.error) {
				handleShowNotification('Failed to cleanup missing files', 'error')
			} else if (result.removed === 0) {
				handleShowNotification('No missing files found', 'info')
			} else {
				handleShowNotification(`Removed ${result.removed} missing file${result.removed > 1 ? 's' : ''} from library`, 'success')
				// Reload the library to reflect changes
				const updatedLibrary = await window.electronAPI.loadLibrary()
				setSongs(updatedLibrary)
				// Clear failed song paths since we just cleaned up
				setFailedSongPaths(new Set())
			}
		} catch (error) {
			console.error('[App] Error cleaning up missing files:', error)
			handleShowNotification('Failed to cleanup missing files', 'error')
		}
	}, [handleShowNotification, setSongs])

	const { theme, volume: savedVolume, setVolume: saveVolume } = useSettingsStore()

	useEffect(() => {
		const root = document.documentElement
		if (theme === 'system') {
			root.removeAttribute('data-theme')
		} else {
			root.setAttribute('data-theme', theme)
		}
	}, [theme])

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
			setIsSettingsOpen(false)
		})
	}, [])

	const {
		queue,
		currentIndex,
		isPlaying,
		playingPath,
		addToQueue,
		clearQueue,
		setCurrentIndex,
		cleanQueueHistory,
		setIsPlaying,
		repeat,
		setQueue,
		loadQueueFromStorage,
	} = usePlayerStore()

	// Track last error to prevent duplicate handling
	const lastErrorRef = useRef<{ path: string; time: number } | null>(null)
	const failureCountRef = useRef<{ count: number; startTime: number }>({ count: 0, startTime: Date.now() })

	// Audio player error handler - show notification and skip to next song
	const handleAudioError = useCallback(
		(error: { message: string; path: string }) => {
			console.error('[App] Audio error:', error)

			// Prevent duplicate error handling for the same path within 1 second
			const now = Date.now()
			if (lastErrorRef.current && lastErrorRef.current.path === error.path) {
				const timeSinceLastError = now - lastErrorRef.current.time
				if (timeSinceLastError < 1000) {
					console.log(`[App] Ignoring duplicate error for ${error.path} (${timeSinceLastError}ms ago)`)
					return
				}
			}
			lastErrorRef.current = { path: error.path, time: now }

			// Get current state from store to avoid stale closure values
			const state = usePlayerStore.getState()
			const idx = state.currentIndex
			const queueLen = state.queue.length
			const repeatMode = state.repeat
			const failedSong = state.queue[idx]

			// Track this failed song path
			if (failedSong) {
				setFailedSongPaths((prev) => new Set(prev).add(failedSong.path))
			}

			// Track consecutive failures to detect mass file issues
			if (now - failureCountRef.current.startTime < 10000) {
				// Within 10-second window
				failureCountRef.current.count++
			} else {
				// Reset window
				failureCountRef.current = { count: 1, startTime: now }
			}

			// Build detailed error message with song info
			const songInfo = failedSong ? `${failedSong.artist || 'Unknown Artist'} - ${failedSong.title || 'Unknown Title'}` : 'Unknown Song'

			console.log(`[App] Error handler - current index from store: ${idx}, queue length: ${queueLen}`)
			console.log(`[App] Failed song: ${songInfo}`)
			console.log(`[App] Failure count: ${failureCountRef.current.count} in current window`)

			// Only show notification if one isn't already visible
			// This prevents notification stacking when multiple songs fail rapidly
			if (!errorNotificationShown) {
				// If multiple failures detected, suggest going to Settings
				if (failureCountRef.current.count >= 3) {
					const detailedMessage = `Multiple songs failed to load. Files may be missing or moved. Check Settings to Rescan Library or Clean Up Missing Files.`
					handleShowNotification(detailedMessage, 'error')
				} else {
					const detailedMessage = `Failed to load: ${songInfo}. The file may be missing or moved.`
					handleShowNotification(detailedMessage, 'error')
				}
				setErrorNotificationShown(true)
			}

			// Skip to next song immediately
			if (idx + 1 < queueLen) {
				console.log(`[App] Skipping to next song after error. Moving from index ${idx} to ${idx + 1}`)
				state.setCurrentIndex(idx + 1)
				state.setIsPlaying(true)
				state.cleanQueueHistory()
			} else if (repeatMode && queueLen > 0) {
				console.log('[App] End of queue, restarting from beginning due to repeat')
				state.setCurrentIndex(0)
				state.setIsPlaying(true)
				state.cleanQueueHistory()
			} else {
				console.log('[App] End of queue, stopping playback')
				state.setIsPlaying(false)
			}
		},
		[handleShowNotification, errorNotificationShown],
	)

	const audio = useAudioPlayer({ onError: handleAudioError, initialVolume: savedVolume })

	// Ref to track current time without causing re-renders
	const currentTimeRef = useRef(audio.currentTime)
	currentTimeRef.current = audio.currentTime

	// Save volume to settings when it changes
	useEffect(() => {
		saveVolume(audio.volume)
	}, [audio.volume, saveVolume])

	// Load queue from storage when app starts
	useEffect(() => {
		loadQueueFromStorage()

		// Listen for native menu settings event
		window.electronAPI.onOpenSettings(() => {
			console.log('[App] Received open-settings event from native menu')
			setIsSettingsOpen(true)
		})

		// Listen for queue songs removed event
		const handleQueueSongsRemoved = (event: any) => {
			const count = event.detail
			handleShowNotification(`${count} song${count > 1 ? 's were' : ' was'} removed from queue (files not found in library)`, 'info')
		}
		window.addEventListener('queue-songs-removed', handleQueueSongsRemoved)

		return () => {
			window.removeEventListener('queue-songs-removed', handleQueueSongsRemoved)
		}
	}, [loadQueueFromStorage, handleShowNotification])

	// Sync Store -> Audio Player
	const { handlePlay, handleResume, handlePause, playingPath: audioPlayingPath } = audio
	const lastPlayedIndex = useRef<number | null>(null)

	useEffect(() => {
		const song = queue[currentIndex]
		if (!song) return

		// Initialize ref on first run if null (to avoid re-triggering current song on reload if unwanted,
		// though we usually want to sync state. But let's check basic logic:
		// If index changed => we MUST load/play that song.

		if (lastPlayedIndex.current !== currentIndex) {
			lastPlayedIndex.current = currentIndex
			// Index changed. If we are supposed to be playing, play.
			if (isPlaying) {
				console.log(`[App] Index changed to ${currentIndex}. Playing ${song.path}`)
				handlePlay(song.path)
			} else {
				// If we changed track but are paused, we might want to load it?
				// For now, let's assume we expect handlePlay to be called when we resume or if interaction drove this.
			}
		} else {
			// Index is SAME. Check play status.
			if (isPlaying && !audio.isPlaying) {
				// Store = Play, Audio = Pause. -> Resume.
				console.log('[App] Resuming playback')
				// Check if we have the correct path loaded just in case (e.g. startup)
				if (audioPlayingPath === song.path) {
					handleResume()
				} else {
					handlePlay(song.path)
				}
			} else if (!isPlaying && audio.isPlaying) {
				// Store = Pause, Audio = Play -> Pause.
				console.log('[App] Pausing playback')
				handlePause()
			}

			// Safety check: specific case where path mismatch happens but index same?
			// (e.g. externally replaced queue item?)
			if (isPlaying && audioPlayingPath !== song.path) {
				console.log('[App] Path mismatch fix. Playing', song.path)
				handlePlay(song.path)
			}
		}
	}, [currentIndex, isPlaying, audio.isPlaying, audioPlayingPath, queue, handlePlay, handleResume, handlePause])

	const handleNext = useCallback(() => {
		if (currentIndex + 1 < queue.length) {
			setCurrentIndex(currentIndex + 1)
			setIsPlaying(true)
			cleanQueueHistory()
		} else if (repeat && queue.length > 0) {
			setCurrentIndex(0)
			setIsPlaying(true)
			cleanQueueHistory()
			return
		} else {
			audio.handleStop()
			setIsPlaying(false)
		}
	}, [currentIndex, queue.length, repeat, audio.handleStop, cleanQueueHistory])

	const handlePrevious = useCallback(() => {
		// If > 3 seconds in, restart song
		if (currentTimeRef.current > 3) {
			audio.setCurrentTime(0)
			return
		}

		if (currentIndex > 0) {
			setCurrentIndex(currentIndex - 1)
			setIsPlaying(true)
		} else {
			audio.setCurrentTime(0)
		}
	}, [audio.setCurrentTime, currentIndex])

	const handleSongEnd = () => {
		handleNext()
	}

	// Refs for MediaSession action handlers (stable references)
	const handleNextRef = useRef(handleNext)
	const handlePreviousRef = useRef(handlePrevious)
	handleNextRef.current = handleNext
	handlePreviousRef.current = handlePrevious

	// Media Session API - set up action handlers once
	useEffect(() => {
		if (!('mediaSession' in navigator)) return

		navigator.mediaSession.setActionHandler('play', () => audio.handleResume())
		navigator.mediaSession.setActionHandler('pause', () => audio.handlePause())
		navigator.mediaSession.setActionHandler('previoustrack', () => handlePreviousRef.current())
		navigator.mediaSession.setActionHandler('nexttrack', () => handleNextRef.current())
	}, [audio.handleResume, audio.handlePause])

	// Media Session API - update metadata only when song changes
	const currentSong = queue[currentIndex]
	const currentSongPath = currentSong?.path
	const currentSongCover = currentSong?.cover

	useEffect(() => {
		if (!('mediaSession' in navigator) || !currentSong) return

		let objectUrl: string | null = null

		const updateMetadata = async () => {
			let artwork: MediaImage[] = []
			if (currentSongCover) {
				try {
					const response = await fetch(currentSongCover)
					const blob = await response.blob()
					objectUrl = URL.createObjectURL(blob)
					artwork = [{ src: objectUrl, sizes: '512x512', type: 'image/jpeg' }]
				} catch (e) {
					console.warn('[App] Failed to load cover for MediaSession', e)
				}
			}

			navigator.mediaSession.metadata = new MediaMetadata({
				title: currentSong.title || 'Unknown Title',
				artist: currentSong.artist || 'Unknown Artist',
				album: currentSong.album || 'Unknown Album',
				artwork: artwork,
			})
		}

		updateMetadata()

		return () => {
			if (objectUrl) URL.revokeObjectURL(objectUrl)
		}
	}, [currentSongPath, currentSongCover, currentSong])

	const filteredSongs = useMemo(() => {
		return activeTab === 'songs' ? filterSongs(songs, debouncedSearch) : songs
	}, [activeTab, songs, debouncedSearch])

	const allAlbums = useMemo(() => groupAlbums(songs), [songs])

	const albums = useMemo(() => {
		return activeTab === 'albums' ? filterAlbums(allAlbums, debouncedSearch) : allAlbums
	}, [activeTab, allAlbums, debouncedSearch])

	const searchPlaceholder = activeTab === 'albums' ? 'Search albums or artists...' : 'Search songs, albums, artists, genre or year...'

	// Function to set queue and start playing
	const handleSetQueue = (songs: Array<any>) => {
		setQueue(songs)
		setCurrentIndex(0)
	}

	const { updateSongMetadata } = usePlayerStore()

	const handleUpdateAlbumCover = (albumName: string, artistName: string, newCover: string) => {
		const cacheBustedCover = `${newCover}${newCover.includes('?') ? '&' : '?'}t=${Date.now()}`

		console.log(`[App] Updating cover for Album="${albumName}", Artist="${artistName}"`)
		const updatedPaths: string[] = []

		setSongs((prevSongs) => {
			const nextSongs = prevSongs.map((song) => {
				if (song.album === albumName && song.artist === artistName) {
					updatedPaths.push(song.path)
					return { ...song, cover: cacheBustedCover }
				}
				return song
			})
			console.log(`[App] Updated ${updatedPaths.length} songs. Triggering setSongs...`)
			return nextSongs
		})

		// Also update queue/player metadata so the playing song refreshes its cover
		updatedPaths.forEach((path) => updateSongMetadata(path, { cover: cacheBustedCover }))
	}

	const handleAlbumDeleted = (albumPath: string) => {
		console.log(`[App] Removing songs from album path: ${albumPath}`)

		// First, identify which song paths belong to this album
		const deletedPaths = songs.filter((song) => song.path.startsWith(albumPath)).map((song) => song.path)

		// Remove songs that start with the album path from the songs state
		setSongs((prevSongs) => {
			const remainingSongs = prevSongs.filter((song) => !song.path.startsWith(albumPath))
			console.log(`[App] Removed ${prevSongs.length - remainingSongs.length} songs from library`)
			return remainingSongs
		})

		// Remove songs from queue that belong to the deleted album
		if (deletedPaths.length > 0) {
			const newQueue = queue.filter((song) => !deletedPaths.includes(song.path))
			if (newQueue.length !== queue.length) {
				console.log(`[App] Removed ${queue.length - newQueue.length} songs from queue`)
				setQueue(newQueue)

				// Adjust current index if needed
				if (currentIndex >= newQueue.length) {
					setCurrentIndex(Math.max(0, newQueue.length - 1))
					if (newQueue.length === 0) {
						audio.handleStop()
						setIsPlaying(false)
					}
				}
			}
		}

		handleShowNotification('Album deleted successfully', 'success')
	}

	return (
		<div className="container">
			{/* PLAYER */}
			<div className="container__player">
				<Player audio={audio} songs={songs} onOpenSettings={() => setIsSettingsOpen(true)} />
			</div>

			{/* QUEUE */}
			<div className="container__queue">
				<Queue audio={audio} failedSongPaths={failedSongPaths} />
			</div>

			{/* LIBRARY */}
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
						<SearchBar value={search} onChange={(e) => setSearch(e.target.value)} placeholder={searchPlaceholder} />
					</div>

					{/* TAB CONTENT */}
					<div className="library__body">
						{activeTab === 'albums' && (
							<AlbumsGrid
								albums={albums}
								setQueue={handleSetQueue}
								audio={audio}
								onUpdateCover={handleUpdateAlbumCover}
								onAlbumDeleted={handleAlbumDeleted}
								onOpenSettings={() => setIsSettingsOpen(true)}
								onShowNotification={handleShowNotification}
							/>
						)}
						{activeTab === 'songs' && <SongsList songs={filteredSongs} addToQueue={addToQueue} folderPath={folderPath} />}
					</div>
				</div>
			</div>
			{/* Settings Modal */}
			<Settings
				isOpen={isSettingsOpen}
				onClose={() => setIsSettingsOpen(false)}
				folderPath={folderPath}
				lastUpdated={lastUpdated}
				onSelectFolder={handleSelectFolder}
				onRescanFolder={handleRescanFolder}
				onCleanupMissingFiles={handleCleanupMissingFiles}
				theme={theme}
				onSetTheme={useSettingsStore.getState().setTheme}
				isScanning={isScanning}
				scanProgress={scanProgress}
			/>

			{/* Audio player (hidden) */}
			<audio
				ref={audio.audioRef}
				src={audio.audioUrl || undefined}
				style={{ display: 'none' }}
				onEnded={handleSongEnd}
				onCanPlay={audio.handleCanPlay}
				onPlay={() => {
					audio.setIsPlaying(true)
					setIsPlaying(true)
				}}
				onPause={() => {
					audio.setIsPlaying(false)
					setIsPlaying(false)
				}}
				onTimeUpdate={() => audio.setCurrentTimeOnly(audio.audioRef.current?.currentTime || 0)}
				onLoadedMetadata={() => audio.setDuration(audio.audioRef.current?.duration || 0)}
			/>

			{/* Scan Progress Bar (only show when Settings is closed) */}
			{isScanning && !isSettingsOpen && <ScanProgress current={scanProgress.current} total={scanProgress.total} />}

			{/* Notifications */}
			{notification && (
				<Notification
					message={notification.message}
					type={notification.type}
					onClose={() => {
						setNotification(null)
						setErrorNotificationShown(false)
					}}
				/>
			)}
		</div>
	)
}

export default App
