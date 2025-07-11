import React from 'react'
import './_albums-grid.scss'
import { MusicNotesIcon, PlusIcon } from '@phosphor-icons/react'
import { usePlayerStore } from '../../store/player'

interface AlbumsGridProps {
	albums: Array<any>
	setQueue: (songs: any[]) => void
	audio: ReturnType<typeof import('../../hooks/useAudioPlayer').useAudioPlayer>
}

const AlbumsGrid: React.FC<AlbumsGridProps> = ({ albums, setQueue, audio }) => {
	const { addAlbumToQueue } = usePlayerStore()

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

	return (
		<div className="albums-grid">
			{albums.map((album, idx) => (
				<div className="album-card" key={album.id || idx} onClick={() => handleAlbumClick(album)} tabIndex={0} role="button">
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
						</div>
					)}

					{/* Add to Queue Button - visible on hover */}
					<button className="btn" onClick={(e) => handleAddToQueue(e, album)} title="Add to Queue">
						<PlusIcon size={24} weight="regular" />
					</button>
				</div>
			))}
		</div>
	)
}

export default AlbumsGrid
