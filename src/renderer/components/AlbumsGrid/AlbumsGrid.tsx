import React, { useState } from 'react'
import './_albums-grid.scss'
import { MusicNotesIcon } from '@phosphor-icons/react'
import { usePlayerStore } from '../../store/player'
import ContextMenu, { ContextMenuOption } from '../ContextMenu/ContextMenu'

interface AlbumsGridProps {
	albums: Array<any>
	setQueue: (songs: any[]) => void
	audio: ReturnType<typeof import('../../hooks/useAudioPlayer').useAudioPlayer>
	onUpdateCover: (albumName: string, artistName: string, newCover: string) => void
	onOpenSettings: () => void
	onShowNotification?: (message: string, type: 'error' | 'success' | 'info') => void
}

const AlbumsGrid: React.FC<AlbumsGridProps> = ({ albums, setQueue, audio, onUpdateCover, onOpenSettings, onShowNotification }) => {
	const { addAlbumToQueue, playAlbumImmediately } = usePlayerStore()
	const [loadingCovers, setLoadingCovers] = useState<Set<string>>(new Set())
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
		}, 200) // 200ms grace period
	}

	const cancelCloseMenu = () => {
		if (closeMenuTimeoutRef.current) {
			clearTimeout(closeMenuTimeoutRef.current)
			closeMenuTimeoutRef.current = null
		}
	}

	const handleFetchCover = async (album: any) => {
		const albumId = album.id || `${album.title}-${album.artist}`

		console.log(`[Renderer] Fetching cover for album: "${album.title}", artist: "${album.artist}"`)

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
				// Cover not found
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

		// Assume all songs in album share the same folder
		const albumPath = album.songs[0].path.substring(0, album.songs[0].path.lastIndexOf('/'))

		if (confirm(`Are you sure you want to delete "${album.title}"?\nThis will move files to Trash.`)) {
			const success = await window.electronAPI.deleteAlbum(albumPath)
			if (success) {
				// Force reload to update library state
				window.location.reload()
			} else {
				alert('Failed to delete album.')
			}
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
						// Remove filename to get folder logic is done by backend shell.showItemInFolder usually handles files too, revealing them.
						// But let's pass the file path, it usually selects it in the folder.
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

	return (
		<div className="albums-grid">
			{albums.map((album, idx) => {
				const albumId = album.id || `${album.title}-${album.artist}`
				const isLoading = loadingCovers.has(albumId)

				return (
					<div
						className="album-card"
						key={albumId}
						onContextMenu={(e) => handleContextMenu(e, album)}
						onMouseEnter={() => {
							// If we re-enter the album card that is effectively "open", cancel closing
							if (contextMenu.isOpen && contextMenu.album === album) {
								cancelCloseMenu()
							}
						}}
						onMouseLeave={() => {
							if (contextMenu.isOpen && contextMenu.album === album) {
								scheduleCloseMenu()
							}
						}}
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
			})}

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
		</div>
	)
}

export default AlbumsGrid
