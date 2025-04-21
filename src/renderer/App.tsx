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

	const { queue, currentIndex, isPlaying, playingPath, addToQueue, clearQueue } = usePlayerStore()

	const filteredSongs = filterSongs(songs, search)

	return (
		<div className="app">
			{/* QUEUE */}
			{queue.length > 0 && <Queue audio={audio} />}

			{/* PLAYER */}
			{isPlaying && <Player audio={audio} />}

			{/* SEARCH */}
			<SearchBar value={search} onChange={(e) => setSearch(e.target.value)} />

			{/* SONGS LIST */}
			<SongsList songs={filteredSongs} audio={audio} addToQueue={addToQueue} handleSelectFolder={handleSelectFolder} folderPath={folderPath} />

			{/* Audio player (hidden) */}
			<audio
				ref={audio.audioRef}
				src={audio.audioUrl || undefined}
				style={{ display: 'none' }}
				onEnded={audio.handleStop}
				onCanPlay={audio.handleCanPlay}
				onTimeUpdate={() => audio.setCurrentTime(audio.audioRef.current?.currentTime || 0)}
				onLoadedMetadata={() => audio.setDuration(audio.audioRef.current?.duration || 0)}
			/>
		</div>
	)
}

export default App
