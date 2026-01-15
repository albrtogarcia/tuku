import React, { useState, forwardRef, useCallback } from 'react'
import { VirtuosoGrid } from 'react-virtuoso'
import './_albums-grid.scss'
import { MusicNotesIcon } from '@phosphor-icons/react'
import { usePlayerStore } from '../../store/player'
import ContextMenu, { ContextMenuOption } from '../ContextMenu/ContextMenu'

interface AlbumsGridProps {
	albums: Array<any>
	setQueue: (songs: any[]) => void
	audio: ReturnType<typeof import('../../hooks/useAudioPlayer').useAudioPlayer>
	onUpdateCover: (albumName: string, artistName: string, newCover: string) => void
	onAlbumDeleted: (albumPath: string) => void
	onOpenSettings: () => void
	onShowNotification?: (message: string, type: 'error' | 'success' | 'info') => void
}

// Grid container for Virtuoso
const GridList = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
	({ children, ...props }, ref) => (
		<div ref={ref} {...props} className="albums-grid">
			{children}
		</div>
	)
)

// Item wrapper for Virtuoso
const GridItem: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, ...props }) => (
	<div {...props} className="albums-grid__item">
		{children}
	</div>
)

const AlbumsGrid: React.FC<AlbumsGridProps> = ({ albums, setQueue, audio, onUpdateCover, onAlbumDeleted, onOpenSettings, onShowNotification }) => {
	const { addAlbumToQueue, playAlbumImmediately } = usePlayerStore()
	const [loadingCovers, setLoadingCovers] = useState<Set<string>>(new Set())
	const [dragOverAlbumId, setDragOverAlbumId] = useState<string | null>(null)
	const [contextMenu, setContextMenu] = useState<{ isOpen: boolean; x: number; y: number; album: any | null }>({
		isOpen: false,
		x: 0,
		y: 0,
		album: null,
	})

	const closeMenuTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)

	if (albums.length === 0) {
		return (
			<div className="albums-grid--empty">
				<p>No albums found in your library.</p>
				<button className="btn-primary" onClick={onOpenSettings}>
					Configure Library
				</button>
			</div>
		)
	}

	const handleContextMenu = (e: React.MouseEvent, album: any) => {
		e.preventDefault()
		setContextMenu({
			isOpen: true,
			x: e.clientX,
			y: e.clientY,
			album: album,
		})
	}

	const handleCloseContextMenu = () => {
		setContextMenu({ isOpen: false, x: 0, y: 0, album: null })
	}

	const scheduleCloseMenu = () => {
		if (closeMenuTimeoutRef.current) clearTimeout(closeMenuTimeoutRef.current)
		closeMenuTimeoutRef.current = setTimeout(() => {
			handleCloseContextMenu()
		}, 200)
	}

	const cancelCloseMenu = () => {
		if (closeMenuTimeoutRef.current) {
			clearTimeout(closeMenuTimeoutRef.current)
			closeMenuTimeoutRef.current = null
		}
	}

	const handleFetchCover = async (album: any) => {
		const albumId = album.id || `${album.title}-${album.artist}`

		setLoadingCovers(prev => {
			const next = new Set(prev)
			next.add(albumId)
			return next
		})

		try {
			const cover = await window.electronAPI.fetchAlbumCover(album.artist, album.title)
			if (cover) {
				onUpdateCover(album.title, album.artist, cover)
				onShowNotification?.(`Cover updated for "${album.title}"`, 'success')
			} else {
				onShowNotification?.(`Could not find cover for "${album.title}"`, 'error')
			}
		} catch (error) {
			console.error('[Renderer] Failed to fetch cover', error)
			onShowNotification?.('Failed to contact iTunes or save cover', 'error')
		} finally {
			setLoadingCovers(prev => {
				const next = new Set(prev)
				next.delete(albumId)
				return next
			})
		}
	}

	const handleDeleteAlbum = async (album: any) => {
		if (!album.songs || album.songs.length === 0) return

		const albumPath = album.songs[0].path.substring(0, album.songs[0].path.lastIndexOf('/'))

		if (confirm(`Are you sure you want to delete "${album.title}"?\nThis will move files to Trash.`)) {
			const success = await window.electronAPI.deleteAlbum(albumPath)
			if (success) {
				onAlbumDeleted(albumPath)
			} else {
				onShowNotification?.('Failed to delete album', 'error')
			}
		}
	}

	const handleDrop = async (e: React.DragEvent, album: any) => {
		e.preventDefault()
		e.stopPropagation()
		setDragOverAlbumId(null)

		const files = e.dataTransfer.files
		if (files.length === 0) return

		const file = files[0]
		const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

		if (!validTypes.includes(file.type)) {
			onShowNotification?.('Please drop an image file (JPG, PNG, WebP, or GIF)', 'error')
			return
		}

		const albumId = album.id || `${album.title}-${album.artist}`
		setLoadingCovers(prev => new Set(prev).add(albumId))

		try {
			const arrayBuffer = await file.arrayBuffer()
			const cover = await window.electronAPI.uploadAlbumCover(album.artist, album.title, arrayBuffer)

			if (cover) {
				onUpdateCover(album.title, album.artist, cover)
				onShowNotification?.(`Cover updated for "${album.title}"`, 'success')
			} else {
				onShowNotification?.('Failed to save cover', 'error')
			}
		} catch (error) {
			console.error('[Renderer] Failed to upload cover', error)
			onShowNotification?.('Failed to upload cover', 'error')
		} finally {
			setLoadingCovers(prev => {
				const next = new Set(prev)
				next.delete(albumId)
				return next
			})
		}
	}

	const getMenuOptions = (): ContextMenuOption[] => {
		const { album } = contextMenu
		if (!album) return []

		return [
			{
				label: 'Play Album',
				action: () => {
					if (album.songs && album.songs.length > 0) {
						playAlbumImmediately(album.songs)
					}
				},
			},
			{
				label: 'Add to Queue',
				action: () => {
					if (album.songs && album.songs.length > 0) {
						addAlbumToQueue(album.songs)
					}
				}
			},
			{
				label: 'Get Album Cover',
				action: () => handleFetchCover(album),
			},
			{
				label: 'Show in Finder',
				action: () => {
					if (album.songs && album.songs.length > 0) {
						const path = album.songs[0].path
						window.electronAPI.openInFinder(path)
					}
				},
			},
			{
				label: 'Delete Album',
				action: () => handleDeleteAlbum(album),
				danger: true,
			},
		]
	}

	const renderAlbumCard = useCallback((index: number) => {
		const album = albums[index]
		const albumId = album.id || `${album.title}-${album.artist}`
		const isLoading = loadingCovers.has(albumId)

		return (
			<div
				className={`album-card${dragOverAlbumId === albumId ? ' album-card--drag-over' : ''}`}
				onContextMenu={(e) => handleContextMenu(e, album)}
				onMouseEnter={() => {
					if (contextMenu.isOpen && contextMenu.album === album) {
						cancelCloseMenu()
					}
				}}
				onMouseLeave={() => {
					if (contextMenu.isOpen && contextMenu.album === album) {
						scheduleCloseMenu()
					}
				}}
				onDragOver={(e) => {
					e.preventDefault()
					setDragOverAlbumId(albumId)
				}}
				onDragLeave={() => setDragOverAlbumId(null)}
				onDrop={(e) => handleDrop(e, album)}
				tabIndex={0}
				role="button"
				onDoubleClick={() => {
					if (album.songs && album.songs.length > 0) {
						playAlbumImmediately(album.songs)
					}
				}}
			>
				{album.cover ? (
					<img src={album.cover} alt={`${album.title}${album.artist ? ` by ${album.artist}` : ''}`} className="album-card__cover album__cover" />
				) : (
					<div className="album-card__cover album__cover default">
						<span role="img" aria-label="No cover">
							<MusicNotesIcon size={48} weight="fill" />
						</span>
						<div className="album-card__info">
							<strong>{album.title || 'Unknown Album'}</strong>
							{album.artist && <div className="album-card__artist">{album.artist}</div>}
						</div>
						{isLoading && <div className="spinner"></div>}
					</div>
				)}
			</div>
		)
	}, [albums, loadingCovers, dragOverAlbumId, contextMenu, playAlbumImmediately])

	return (
		<>
			<VirtuosoGrid
				totalCount={albums.length}
				components={{
					List: GridList,
					Item: GridItem,
				}}
				itemContent={renderAlbumCard}
				overscan={200}
			/>

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
