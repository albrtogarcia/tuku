import { usePlayerStore } from '../../store/player'
import { useState } from 'react'
import SongsTable, { SongsTableColumn } from '../SongsTable/SongsTable'
import './_songslist.scss'

import { Song } from '../../../types/song'

interface SongsListProps {
	songs: Song[]
	audio: ReturnType<typeof import('../../hooks/useAudioPlayer').useAudioPlayer>
	addToQueue: (song: Song) => void
	handleSelectFolder: () => void
	folderPath: string | null
}

const columns: SongsTableColumn[] = [
	{ key: 'title', label: 'Título', sortable: true },
	{ key: 'artist', label: 'Artista', sortable: true },
	{ key: 'album', label: 'Álbum', sortable: true },
	{ key: 'duration', label: 'Duración', sortable: true },
	{ key: 'year', label: 'Año', sortable: true },
	{ key: 'genre', label: 'Género', sortable: true },
]

type SortKey = 'title' | 'artist' | 'album' | 'duration' | 'year' | 'genre'

const SongsList = ({ songs, audio, addToQueue, handleSelectFolder, folderPath }: SongsListProps) => {
	const { playNow } = usePlayerStore()
	const [sortKey, setSortKey] = useState<SortKey>('title')
	const [sortAsc, setSortAsc] = useState<boolean>(true)

	const sortedSongs = [...songs].sort((a, b) => {
		const aValue = a[sortKey]
		const bValue = b[sortKey]
		if (aValue === undefined || bValue === undefined) return 0
		if (aValue < bValue) return sortAsc ? -1 : 1
		if (aValue > bValue) return sortAsc ? 1 : -1
		return 0
	})

	const handleSort = (key: string) => {
		if (sortKey === key) {
			setSortAsc(!sortAsc)
		} else {
			setSortKey(key as SortKey)
			setSortAsc(true)
		}
	}

	// Handle double click: play song immediately and add to queue
	const handleSongDoubleClick = (song: Song) => {
		// Use playNow to handle adding to queue and setting as current
		playNow(song)
		// Start audio playback
		audio.handlePlay(song.path)
	}

	// Handle right click: add to queue
	const handleSongRightClick = (song: Song, event: React.MouseEvent) => {
		event.preventDefault() // Prevent default context menu
		addToQueue(song)
	}

	return (
		<section className="songs">
			<header className="songs__header">
				<h2>Library: {songs.length} songs</h2>
				<button className="btn btn-secondary" onClick={handleSelectFolder}>
					{folderPath ? folderPath : 'Select music folder'}
				</button>
			</header>
			{songs.length === 0 ? (
				<p>No songs found in this folder.</p>
			) : (
				<SongsTable 
					songs={sortedSongs} 
					columns={columns} 
					onSort={handleSort}
					onDoubleClick={handleSongDoubleClick}
					onRightClick={handleSongRightClick}
				/>
			)}
		</section>
	)
}

export default SongsList
