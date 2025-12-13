import { usePlayerStore } from '../../store/player'
import { useState, useMemo } from 'react'
import SongsTable, { SongsTableColumn } from '../SongsTable/SongsTable'
import './_songslist.scss'

import { Song } from '../../../types/song'

interface SongsListProps {
	songs: Song[]
	audio: ReturnType<typeof import('../../hooks/useAudioPlayer').useAudioPlayer>
	addToQueue: (song: Song) => void
	folderPath: string | null
}

const columns: SongsTableColumn[] = [
	{ key: 'title', label: 'Title', sortable: true },
	{ key: 'artist', label: 'Artist', sortable: true },
	{ key: 'album', label: 'Album', sortable: true },
	{ key: 'duration', label: 'Time', sortable: true },
	{ key: 'year', label: 'Year', sortable: true },
	{ key: 'genre', label: 'Genre', sortable: true },
]

type SortKey = 'title' | 'artist' | 'album' | 'duration' | 'year' | 'genre'

const SongsList = ({ songs, audio, addToQueue, folderPath }: SongsListProps) => {
	const { playNow } = usePlayerStore()
	const [sortKey, setSortKey] = useState<SortKey>('title')
	const [sortAsc, setSortAsc] = useState<boolean>(true)

	const sortedSongs = useMemo(() => {
		const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })

		return [...songs].sort((a, b) => {
			const aValue = a[sortKey]
			const bValue = b[sortKey]

			if (aValue === undefined || bValue === undefined) return 0
			if (aValue === null || bValue === null) return 0

			if (typeof aValue === 'string' && typeof bValue === 'string') {
				return sortAsc
					? collator.compare(aValue, bValue)
					: collator.compare(bValue, aValue)
			}

			if (aValue < bValue) return sortAsc ? -1 : 1
			if (aValue > bValue) return sortAsc ? 1 : -1
			return 0
		})
	}, [songs, sortKey, sortAsc])

	// Create lightweight version for table rendering (crucial for performance/memory)
	// This prevents passing huge base64 strings to React DevTools/Virtualizer
	const displaySongs = useMemo(() => {
		return sortedSongs.map(({ cover, ...rest }) => rest)
	}, [sortedSongs])

	const handleSort = (key: string) => {
		if (sortKey === key) {
			setSortAsc(!sortAsc)
		} else {
			setSortKey(key as SortKey)
			setSortAsc(true)
		}
	}

	// Handle double click: find full song and play
	const handleSongDoubleClick = (partialSong: any) => {
		const fullSong = songs.find(s => s.path === partialSong.path)
		if (fullSong) playNow(fullSong)
	}

	// Handle right click: find full song and add to queue
	const handleSongRightClick = (partialSong: any, event: React.MouseEvent) => {
		event.preventDefault()
		const fullSong = songs.find(s => s.path === partialSong.path)
		if (fullSong) addToQueue(fullSong)
	}

	return (
		<section className="songs" style={{ height: '100%' }}>
			{songs.length === 0 ? (
				<div className="empty-state">
					<p>No songs found.</p>
				</div>
			) : (
				<SongsTable
					songs={displaySongs}
					columns={columns}
					sortKey={sortKey}
					sortAsc={sortAsc}
					onSort={handleSort}
					onDoubleClick={handleSongDoubleClick}
					onRightClick={handleSongRightClick}
				/>
			)}
		</section>
	)
}

export default SongsList
