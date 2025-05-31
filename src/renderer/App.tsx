import { useState } from 'react'
import './styles/app.scss'
import Queue from './components/Queue/Queue'
import Player from './components/Player/Player'
import SongsList from './components/SongsList/SongsList'
import SearchBar from './components/SearchBar/SearchBar'
import AlbumsGrid from './components/AlbumsGrid/AlbumsGrid'
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
	const { folderPath, songs, handleSelectFolder } = useSongs()
	const [search, setSearch] = useState('')

	const audio = useAudioPlayer()

	const { queue, currentIndex, isPlaying, playingPath, addToQueue, clearQueue, setCurrentIndex, cleanQueueHistory, repeat, shuffle, setQueue } =
		usePlayerStore()

	function getNextShuffleIndex() {
		if (queue.length <= 1) return currentIndex
		const remaining = queue.map((_, idx) => idx).filter((idx) => idx !== currentIndex && idx > currentIndex)
		if (remaining.length === 0) return -1
		const randomIdx = remaining[Math.floor(Math.random() * remaining.length)]
		return randomIdx
	}

	// Función para avanzar automáticamente a la siguiente canción y limpiar historial
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

	return (
		<div className="container">
			<div className="container__player">
				{/* PLAYER */}
				{currentIndex !== -1 && queue[currentIndex] && <Player audio={audio} />}
			</div>
			<div className="container__queue">
				{/* QUEUE */}
				{queue.length > 0 && <Queue audio={audio} />}
			</div>
			<div className="container__library">
				{/* SEARCH */}
				<SearchBar value={search} onChange={(e) => setSearch(e.target.value)} />
				{/* ALBUMS GRID */}
				<AlbumsGrid albums={albums} setQueue={setQueue} audio={audio} />

				{/* SONGS LIST */}
				<SongsList songs={filteredSongs} audio={audio} addToQueue={addToQueue} handleSelectFolder={handleSelectFolder} folderPath={folderPath} />
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
		</div>
	)
}

export default App
