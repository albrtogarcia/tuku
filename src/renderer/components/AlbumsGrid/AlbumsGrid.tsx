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
	const { addAlbumToQueue } = usePlayerStore()
	const [loadingCovers, setLoadingCovers] = useState<Set<string>>(new Set())
	const [contextMenu, setContextMenu] = useState<{ isOpen: boolean; x: number; y: number; album: any | null }>({
		isOpen: false,
		x: 0,
		y: 0,
		album: null,
	})

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

	const handleAlbumClick = (album: any) => {
		if (album.songs && album.songs.length > 0) {
			setQueue(album.songs)
			audio.handlePlay(album.songs[0].path)
		}
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
				action: () => handleAlbumClick(album),
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
						onClick={() => handleAlbumClick(album)}
						onContextMenu={(e) => handleContextMenu(e, album)}
						tabIndex={0}
						role="button"
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
								{/* Spinner for loading state */}
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
				/>
			)}
		</div>
	)
}

export default AlbumsGrid
