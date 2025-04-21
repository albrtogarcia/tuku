import { useState } from 'react'
import './styles/app.scss'
import Queue from './components/Queue/Queue'
import Player from './components/Player/Player'
import SongsList from './components/SongsList/SongsList'
import SearchBar from './components/SearchBar/SearchBar'
import { useAudioPlayer } from './hooks/useAudioPlayer'
import { useSongs } from './hooks/useSongs'
import { formatTime, filterSongs } from './utils'
import { usePlayerStore } from './store/player'

function App() {
	const { folderPath, songs, handleSelectFolder } = useSongs()
	const [search, setSearch] = useState('')

	const audio = useAudioPlayer()

	const { queue, currentIndex, isPlaying, playingPath, addToQueue, clearQueue, setCurrentIndex, cleanQueueHistory, repeat, shuffle } = usePlayerStore()

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

	return (
		<div className="app">
			{/* PLAYER */}
			{currentIndex !== -1 && queue[currentIndex] && <Player audio={audio} />}

			{/* QUEUE */}
			{queue.length > 0 && <Queue audio={audio} />}

			{/* SEARCH */}
			<SearchBar value={search} onChange={(e) => setSearch(e.target.value)} />

			{/* SONGS LIST */}
			<SongsList songs={filteredSongs} audio={audio} addToQueue={addToQueue} handleSelectFolder={handleSelectFolder} folderPath={folderPath} />

			{/* Audio player (hidden) */}
			<audio
				ref={audio.audioRef}
				src={audio.audioUrl || undefined}
				style={{ display: 'none' }}
				onEnded={handleSongEnd}
				onCanPlay={audio.handleCanPlay}
				onTimeUpdate={() => audio.setCurrentTime(audio.audioRef.current?.currentTime || 0)}
				onLoadedMetadata={() => audio.setDuration(audio.audioRef.current?.duration || 0)}
			/>
		</div>
	)
}

export default App
