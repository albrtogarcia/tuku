import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import './_albums-grid.scss'
import { MusicNotesIcon, PlayIcon, XIcon } from '@phosphor-icons/react'
import { usePlayerStore } from '../../store/player'
import ContextMenu, { ContextMenuOption } from '../ContextMenu/ContextMenu'
import { formatTime } from '@/utils'
import type { Song } from '../../../types/song'

interface AlbumsGridProps {
	albums: Array<any>
	setQueue: (songs: any[]) => void
	audio: ReturnType<typeof import('../../hooks/useAudioPlayer').useAudioPlayer>
	onUpdateCover: (albumName: string, artistName: string, newCover: string) => void
	onAlbumDeleted: (albumPath: string) => void
	onOpenSettings: () => void
	onShowNotification?: (message: string, type: 'error' | 'success' | 'info') => void
}

// ─── Album Expansion Panel ────────────────────────────────────────────────────

interface AlbumExpansionProps {
	album: any
	isClosing: boolean
	onClose: () => void
	onClosed: () => void
	onPlay: (songs: Song[]) => void
	onAddToQueue: (songs: Song[]) => void
}

function AlbumExpansion({ album, isClosing, onClose, onClosed, onPlay, onAddToQueue }: AlbumExpansionProps) {
	const { t } = useTranslation()
	const panelRef = useRef<HTMLDivElement>(null)

	const sortedSongs: Song[] = [...album.songs].sort((a, b) => (parseInt(a.track) || 0) - (parseInt(b.track) || 0))
	const totalDuration = sortedSongs.reduce((acc, s) => acc + (s.duration || 0), 0)
	const genre = album.songs[0]?.genre || ''
	const meta = [album.year || null, genre || null, `${sortedSongs.length} ${t('albums.songs')}`, formatTime(totalDuration)]
		.filter(Boolean)
		.join(' · ')

	useEffect(() => {
		panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
	}, [])

	return (
		<div
			ref={panelRef}
			className={`albums-grid__expansion${isClosing ? ' albums-grid__expansion--closing' : ''}`}
			onAnimationEnd={() => { if (isClosing) onClosed() }}
			onClick={(e) => e.stopPropagation()}
		>
			<div className="album-expansion">
				<div className="album-expansion__cover-col">
					{album.cover ? (
						<img src={album.cover} className="album-expansion__cover" alt={album.title} />
					) : (
						<div className="album-expansion__cover album-expansion__cover--default">
							<MusicNotesIcon size={64} weight="fill" />
						</div>
					)}
				</div>

				<div className="album-expansion__body">
					<div className="album-expansion__meta">
						<h2 className="album-expansion__title">{album.title}</h2>
						<p className="album-expansion__artist">{album.artist}</p>
						<p className="album-expansion__info">{meta}</p>
						<div className="album-expansion__actions">
							<button className="btn" onClick={() => onPlay(album.songs)}>
								<PlayIcon size={14} weight="fill" />
								{t('albums.playAlbum')}
							</button>
							<button className="btn btn--secondary" onClick={() => onAddToQueue(album.songs)}>
								{t('albums.addToQueue')}
							</button>
						</div>
					</div>

					<ol className="album-expansion__tracklist">
						{sortedSongs.map((song, i) => (
							<li
								key={song.path}
								className="album-expansion__track"
								onDoubleClick={() => onPlay(sortedSongs.slice(i))}
								title={song.title}
							>
								<span className="album-expansion__track-num">{parseInt(song.track) || i + 1}</span>
								<span className="album-expansion__track-title">{song.title}</span>
								<span className="album-expansion__track-duration">{formatTime(song.duration)}</span>
								<button
									className="album-expansion__track-play btn btn--ghost"
									onClick={() => onPlay([song])}
									tabIndex={-1}
								>
									<PlayIcon size={12} weight="fill" />
								</button>
							</li>
						))}
					</ol>
				</div>

				<button className="album-expansion__close btn btn--ghost" onClick={onClose} title={t('settings.close')}>
					<XIcon size={16} weight="bold" />
				</button>
			</div>
		</div>
	)
}

// ─── Albums Grid ──────────────────────────────────────────────────────────────

const AlbumsGrid: React.FC<AlbumsGridProps> = ({ albums, setQueue, audio, onUpdateCover, onAlbumDeleted, onOpenSettings, onShowNotification }) => {
	const { t } = useTranslation()
	const { addAlbumToQueue, playAlbumImmediately } = usePlayerStore()

	const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null)
	const [isExpansionClosing, setIsExpansionClosing] = useState(false)
	const [colCount, setColCount] = useState(6)
	const gridRef = useRef<HTMLDivElement>(null)
	const selectedAlbumIdRef = useRef<string | null>(null)
	selectedAlbumIdRef.current = selectedAlbumId

	const [loadingCovers, setLoadingCovers] = useState<Set<string>>(new Set())
	const [dragOverAlbumId, setDragOverAlbumId] = useState<string | null>(null)
	const [contextMenu, setContextMenu] = useState<{ isOpen: boolean; x: number; y: number; album: any | null }>({
		isOpen: false, x: 0, y: 0, album: null,
	})

	const closeMenuTimeoutRef = useRef<NodeJS.Timeout | null>(null)

	// Derive column count from container width so it's always accurate,
	// independent of what items are currently in the grid.
	useEffect(() => {
		const grid = gridRef.current
		if (!grid) return
		const measure = () => {
			const style = getComputedStyle(grid)
			const paddingLeft = parseFloat(style.paddingLeft) || 0
			const paddingRight = parseFloat(style.paddingRight) || 0
			const gap = parseFloat(style.columnGap) || 8
			const contentWidth = grid.clientWidth - paddingLeft - paddingRight
			const minColWidth = window.matchMedia('(max-width: 960px) and (max-height: 600px)').matches ? 80 : 112
			const cols = Math.max(1, Math.floor((contentWidth + gap) / (minColWidth + gap)))
			setColCount(cols)
		}
		measure()
		const ro = new ResizeObserver(measure)
		ro.observe(grid)
		return () => ro.disconnect()
	}, [])

	// Close expansion if the selected album disappears from the filtered list
	useEffect(() => {
		if (selectedAlbumId && !albums.find((a) => (a.id || `${a.title}-${a.artist}`) === selectedAlbumId)) {
			setSelectedAlbumId(null)
			setIsExpansionClosing(false)
		}
	}, [albums, selectedAlbumId])

	// ─── Context menu handlers ─────────────────────────────────────────────

	const handleContextMenu = (e: React.MouseEvent, album: any) => {
		e.preventDefault()
		setContextMenu({ isOpen: true, x: e.clientX, y: e.clientY, album })
	}

	const handleCloseContextMenu = () => setContextMenu({ isOpen: false, x: 0, y: 0, album: null })

	const scheduleCloseMenu = () => {
		if (closeMenuTimeoutRef.current) clearTimeout(closeMenuTimeoutRef.current)
		closeMenuTimeoutRef.current = setTimeout(handleCloseContextMenu, 200)
	}

	const cancelCloseMenu = () => {
		if (closeMenuTimeoutRef.current) {
			clearTimeout(closeMenuTimeoutRef.current)
			closeMenuTimeoutRef.current = null
		}
	}

	// ─── Cover handlers ────────────────────────────────────────────────────

	const handleFetchCover = async (album: any) => {
		const albumId = album.id || `${album.title}-${album.artist}`
		setLoadingCovers((prev) => new Set(prev).add(albumId))
		try {
			const cover = await window.electronAPI.fetchAlbumCover(album.artist, album.title)
			if (cover) {
				onUpdateCover(album.title, album.artist, cover)
				onShowNotification?.(t('albums.coverUpdated', { title: album.title }), 'success')
			} else {
				onShowNotification?.(t('albums.coverNotFound', { title: album.title }), 'error')
			}
		} catch {
			onShowNotification?.(t('albums.coverFetchFailed'), 'error')
		} finally {
			setLoadingCovers((prev) => { const next = new Set(prev); next.delete(albumId); return next })
		}
	}

	const handleDeleteAlbum = async (album: any) => {
		if (!album.songs || album.songs.length === 0) return
		const albumPath = album.songs[0].path.substring(0, album.songs[0].path.lastIndexOf('/'))
		if (confirm(t('albums.deleteConfirm', { title: album.title }))) {
			const success = await window.electronAPI.deleteAlbum(albumPath)
			if (success) {
				onAlbumDeleted(albumPath)
			} else {
				onShowNotification?.(t('albums.deleteFailed'), 'error')
			}
		}
	}

	const handleDrop = async (e: React.DragEvent, album: any) => {
		e.preventDefault()
		e.stopPropagation()
		setDragOverAlbumId(null)
		const file = e.dataTransfer.files[0]
		if (!file) return
		if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
			onShowNotification?.(t('albums.dropImageHint'), 'error')
			return
		}
		const albumId = album.id || `${album.title}-${album.artist}`
		setLoadingCovers((prev) => new Set(prev).add(albumId))
		try {
			const cover = await window.electronAPI.uploadAlbumCover(album.artist, album.title, await file.arrayBuffer())
			if (cover) {
				onUpdateCover(album.title, album.artist, cover)
				onShowNotification?.(t('albums.coverUpdated', { title: album.title }), 'success')
			} else {
				onShowNotification?.(t('albums.coverSaveFailed'), 'error')
			}
		} catch {
			onShowNotification?.(t('albums.coverUploadFailed'), 'error')
		} finally {
			setLoadingCovers((prev) => { const next = new Set(prev); next.delete(albumId); return next })
		}
	}

	// ─── Context menu options ──────────────────────────────────────────────

	const getMenuOptions = (): ContextMenuOption[] => {
		const { album } = contextMenu
		if (!album) return []
		return [
			{ label: t('albums.playAlbum'), action: () => album.songs?.length && playAlbumImmediately(album.songs) },
			{ label: t('albums.addToQueue'), action: () => album.songs?.length && addAlbumToQueue(album.songs) },
			{ label: t('albums.getAlbumCover'), action: () => handleFetchCover(album) },
			{ label: t('albums.showInFinder'), action: () => album.songs?.length && window.electronAPI.openInFinder(album.songs[0].path) },
			{ label: t('albums.deleteAlbum'), action: () => handleDeleteAlbum(album), danger: true },
		]
	}

	// ─── Render ────────────────────────────────────────────────────────────

	const selectedIdx = selectedAlbumId
		? albums.findIndex((a) => (a.id || `${a.title}-${a.artist}`) === selectedAlbumId)
		: -1

	// Insert expansion after the last album in the selected album's row
	const expansionAfterIdx = selectedIdx >= 0
		? Math.min(Math.ceil((selectedIdx + 1) / colCount) * colCount - 1, albums.length - 1)
		: -1

	const handleAlbumClick = useCallback((albumId: string) => {
		if (selectedAlbumIdRef.current === albumId) {
			// Toggle off — animate the panel out
			setIsExpansionClosing(true)
		} else {
			// Switch to a different album — cut any in-progress close, open new panel
			setIsExpansionClosing(false)
			setSelectedAlbumId(albumId)
		}
	}, [])

	const handleCloseExpansion = useCallback(() => setIsExpansionClosing(true), [])

	const handleExpansionClosed = useCallback(() => {
		setIsExpansionClosing(false)
		setSelectedAlbumId(null)
	}, [])

	if (albums.length === 0) {
		return (
			<div className="albums-grid--empty">
				<p>{t('albums.emptyState')}</p>
				<button className="btn-primary" onClick={onOpenSettings}>
					{t('albums.configureLibrary')}
				</button>
			</div>
		)
	}

	const items: React.ReactNode[] = []
	albums.forEach((album, i) => {
		const albumId = album.id || `${album.title}-${album.artist}`
		const isSelected = albumId === selectedAlbumId
		const isLoading = loadingCovers.has(albumId)
		items.push(
			<div
				key={albumId}
				className={`album-card${isSelected ? ' album-card--selected' : ''}${dragOverAlbumId === albumId ? ' album-card--drag-over' : ''}`}
				onClick={() => handleAlbumClick(albumId)}
				onContextMenu={(e) => handleContextMenu(e, album)}
				onMouseEnter={() => contextMenu.isOpen && contextMenu.album === album && cancelCloseMenu()}
				onMouseLeave={() => contextMenu.isOpen && contextMenu.album === album && scheduleCloseMenu()}
				onDragOver={(e) => { e.preventDefault(); setDragOverAlbumId(albumId) }}
				onDragLeave={() => setDragOverAlbumId(null)}
				onDrop={(e) => handleDrop(e, album)}
				tabIndex={0}
				role="button"
				aria-expanded={isSelected}
			>
				{album.cover ? (
					<img
						src={album.cover}
						alt={`${album.title}${album.artist ? ` by ${album.artist}` : ''}`}
						className="album-card__cover album__cover"
					/>
				) : (
					<div className="album-card__cover album__cover default">
						<span role="img" aria-label={t('albums.noCover')}>
							<MusicNotesIcon size={48} weight="fill" />
						</span>
						<div className="album-card__info">
							<strong>{album.title || t('albums.unknownAlbum')}</strong>
							{album.artist && <div className="album-card__artist">{album.artist}</div>}
						</div>
						{isLoading && <div className="spinner"></div>}
					</div>
				)}
			</div>
		)
		if (i === expansionAfterIdx) {
			items.push(
				<AlbumExpansion
					key="__expansion__"
					album={albums[selectedIdx]}
					isClosing={isExpansionClosing}
					onClose={handleCloseExpansion}
					onClosed={handleExpansionClosed}
					onPlay={playAlbumImmediately}
					onAddToQueue={addAlbumToQueue}
				/>
			)
		}
	})

	return (
		<>
			<div ref={gridRef} className="albums-grid" style={{ gridTemplateColumns: `repeat(${colCount}, 1fr)` }}>
				{items}
			</div>

			{contextMenu.isOpen && (
				<ContextMenu
					x={contextMenu.x}
					y={contextMenu.y}
					options={getMenuOptions()}
					onClose={handleCloseContextMenu}
					onMouseEnter={cancelCloseMenu}
					onMouseLeave={scheduleCloseMenu}
				/>
			)}
		</>
	)
}

export default AlbumsGrid
