import React, { useState } from 'react'
import './_albums-grid.scss'
import { MusicNotesIcon, PlusIcon, DownloadSimple } from '@phosphor-icons/react'
import { usePlayerStore } from '../../store/player'

interface AlbumsGridProps {
	albums: Array<any>
	setQueue: (songs: any[]) => void
	audio: ReturnType<typeof import('../../hooks/useAudioPlayer').useAudioPlayer>
	onUpdateCover: (albumName: string, artistName: string, newCover: string) => void
	onOpenSettings: () => void
}

const AlbumsGrid: React.FC<AlbumsGridProps> = ({ albums, setQueue, audio, onUpdateCover, onOpenSettings }) => {
	const { addAlbumToQueue } = usePlayerStore()
	const [loadingCovers, setLoadingCovers] = useState<Set<string>>(new Set())

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

	const handleAddToQueue = (event: React.MouseEvent, album: any) => {
		event.stopPropagation() // Prevent album click
		if (album.songs && album.songs.length > 0) {
			addAlbumToQueue(album.songs)
		}
	}

	const handleFetchCover = async (event: React.MouseEvent, album: any) => {
		// Log immediately to check if function is called
		console.log('[Renderer] handleFetchCover CALLED')
		event.stopPropagation()
		const albumId = album.id || `${album.title}-${album.artist}`

		console.log(`[Renderer] Clicked fetch for album: "${album.title}", artist: "${album.artist}", id: "${albumId}"`)

		if (loadingCovers.has(albumId)) {
			console.log('[Renderer] Album already loading, ignoring click')
			return
		}

		console.log(`[Renderer] Fetching cover for album: "${album.title}", artist: "${album.artist}"`)

		setLoadingCovers(prev => {
			const next = new Set(prev)
			next.add(albumId)
			return next
		})

		try {
			const cover = await window.electronAPI.fetchAlbumCover(album.artist, album.title)
			console.log(`[Renderer] Received cover from main process: ${cover ? 'Yes (base64)' : 'No (null)'}`)
			if (cover) {
				onUpdateCover(album.title, album.artist, cover)
			}
		} catch (error) {
			console.error('[Renderer] Failed to fetch cover', error)
		} finally {
			setLoadingCovers(prev => {
				const next = new Set(prev)
				next.delete(albumId)
				return next
			})
		}
	}

	return (
		<div className="albums-grid">
			{albums.map((album, idx) => {
				const albumId = album.id || `${album.title}-${album.artist}`
				const isLoading = loadingCovers.has(albumId)

				return (
					<div className="album-card" key={albumId} onClick={() => handleAlbumClick(album)} tabIndex={0} role="button">
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

								{/* Fetch Cover Button - visible on hover or if no cover */}
								<button
									className={`btn btn-cover ${isLoading ? 'loading' : ''}`}
									onClick={(e) => {
										console.log('[Renderer] Button clicked!')
										handleFetchCover(e, album)
									}}
									title="Fetch Cover from iTunes"
									disabled={isLoading}
								>
									<DownloadSimple size={20} weight="bold" className={isLoading ? 'spin' : ''} />
								</button>
							</div>
						)}

						{/* Add to Queue Button - visible on hover */}
						<button className="btn" onClick={(e) => handleAddToQueue(e, album)} title="Add to Queue">
							<PlusIcon size={24} weight="regular" />
						</button>
					</div>
				)
			})}
		</div>
	)
}

export default AlbumsGrid
