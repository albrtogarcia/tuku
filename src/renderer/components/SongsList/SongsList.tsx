import { useTranslation } from 'react-i18next'
import { usePlayerStore } from '../../store/player'
import { useState, useMemo, memo } from 'react'
import SongsTable, { SongsTableColumn } from '../SongsTable/SongsTable'
import ContextMenu, { ContextMenuOption } from '../ContextMenu/ContextMenu'
import './_songslist.scss'

import { Song } from '../../../types/song'

interface SongsListProps {
	songs: Song[]
	addToQueue: (song: Song) => void
	folderPath: string | null
	onSongDeleted?: (songPath: string) => void
	onShowNotification?: (message: string, type: 'error' | 'success' | 'info') => void
}

type SortKey = 'title' | 'artist' | 'album' | 'duration' | 'year' | 'genre'

const SongsList = ({ songs, addToQueue, folderPath, onSongDeleted, onShowNotification }: SongsListProps) => {
	const { t } = useTranslation()
	const { playNow } = usePlayerStore()

	const columns: SongsTableColumn[] = useMemo(() => [
		{ key: 'title', label: t('songs.title'), sortable: true },
		{ key: 'artist', label: t('songs.artist'), sortable: true },
		{ key: 'album', label: t('songs.album'), sortable: true },
		{ key: 'duration', label: t('songs.time'), sortable: true },
		{ key: 'year', label: t('songs.year'), sortable: true },
		{ key: 'genre', label: t('songs.genre'), sortable: true },
	], [t])
	const [sortKey, setSortKey] = useState<SortKey>('title')
	const [sortAsc, setSortAsc] = useState<boolean>(true)
	const [contextMenu, setContextMenu] = useState<{ isOpen: boolean; x: number; y: number; song: Song | null }>({
		isOpen: false,
		x: 0,
		y: 0,
		song: null,
	})

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

	// Handle right click: open context menu
	const handleSongRightClick = (partialSong: any, event: React.MouseEvent) => {
		event.preventDefault()
		const fullSong = songs.find(s => s.path === partialSong.path)
		if (fullSong) {
			setContextMenu({
				isOpen: true,
				x: event.clientX,
				y: event.clientY,
				song: fullSong,
			})
		}
	}

	const handleCloseContextMenu = () => {
		setContextMenu({ isOpen: false, x: 0, y: 0, song: null })
	}

	const handleDeleteSong = async (song: Song) => {
		if (confirm(t('songs.deleteConfirm', { title: song.title }))) {
			const success = await window.electronAPI.deleteSong(song.path)
			if (success) {
				onSongDeleted?.(song.path)
				onShowNotification?.(t('songs.deleteSuccess', { title: song.title }), 'success')
			} else {
				onShowNotification?.(t('songs.deleteFailed'), 'error')
			}
		}
	}

	const getMenuOptions = (): ContextMenuOption[] => {
		const { song } = contextMenu
		if (!song) return []

		return [
			{
				label: t('songs.playSong'),
				action: () => playNow(song),
			},
			{
				label: t('songs.addToQueue'),
				action: () => addToQueue(song),
			},
			{
				label: t('songs.showInFinder'),
				action: () => window.electronAPI.openInFinder(song.path),
			},
			{
				label: t('songs.deleteSong'),
				action: () => handleDeleteSong(song),
				danger: true,
			},
		]
	}

	return (
		<section className="songs" style={{ height: '100%' }}>
			{songs.length === 0 ? (
				<div className="empty-state">
					<p>{t('songs.noSongsFound')}</p>
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

			{contextMenu.isOpen && (
				<ContextMenu
					x={contextMenu.x}
					y={contextMenu.y}
					options={getMenuOptions()}
					onClose={handleCloseContextMenu}
				/>
			)}
		</section>
	)
}

export default memo(SongsList)
