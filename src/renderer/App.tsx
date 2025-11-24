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
	const { folderPath, songs, handleSelectFolder, lastUpdated, handleRescanFolder } = useSongs()
	const [search, setSearch] = useState('')
	const [activeTab, setActiveTab] = useState<'albums' | 'songs'>('albums')
	const [isSettingsOpen, setIsSettingsOpen] = useState(false)

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
	useEffect(() => {
		loadQueueFromStorage()
	}, [loadQueueFromStorage])

	function getNextShuffleIndex() {
		if (queue.length <= 1) return currentIndex
		const remaining = queue.map((_, idx) => idx).filter((idx) => idx !== currentIndex && idx > currentIndex)
		if (remaining.length === 0) return -1
		const randomIdx = remaining[Math.floor(Math.random() * remaining.length)]
		return randomIdx
	}

	const handleSongEnd = () => {
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
		} else {
			audio.handleStop()
		}
	}

	const filteredSongs = filterSongs(songs, search)
	const albums = groupAlbums(songs)

	// Function to set queue and start playing
	const handleSetQueue = (songs: Array<any>) => {
		setQueue(songs)
		setCurrentIndex(0)
	}

	return (
		<>
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
					<div className="library-header">
						{/* TABS */}
						<div className="library-tabs">
							<button className={`library-tabs__button ${activeTab === 'albums' ? 'active' : ''}`} onClick={() => setActiveTab('albums')}>
								Albums <small>({albums.length})</small>
							</button>
							<button className={`library-tabs__button ${activeTab === 'songs' ? 'active' : ''}`} onClick={() => setActiveTab('songs')}>
								Songs <small>({songs.length})</small>
							</button>
						</div>

						{/* SEARCH */}
						<SearchBar value={search} onChange={(e) => setSearch(e.target.value)} />
					</div>

					{/* TAB CONTENT */}
					<div className="library-content">
						{activeTab === 'albums' && <AlbumsGrid albums={albums} setQueue={handleSetQueue} audio={audio} />}
						{activeTab === 'songs' && <SongsList songs={filteredSongs} audio={audio} addToQueue={addToQueue} folderPath={folderPath} />}
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
				/>
			</div>
			{/* Audio player (hidden) */}
			<audio
				ref={audio.audioRef}
				src={audio.audioUrl || undefined}
				style={{ display: 'none' }}
				onEnded={handleSongEnd}
				onCanPlay={audio.handleCanPlay}
				onTimeUpdate={() => audio.setCurrentTimeOnly(audio.audioRef.current?.currentTime || 0)}
				onLoadedMetadata={() => audio.setDuration(audio.audioRef.current?.duration || 0)}
			/>
		</>
	)
}

export default App
