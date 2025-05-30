import React from 'react'
import './_albums-grid.scss'
import { MusicNotes } from '@phosphor-icons/react'

interface AlbumsGridProps {
	albums: Array<any>
	setQueue: (songs: any[]) => void
	audio: ReturnType<typeof import('../../hooks/useAudioPlayer').useAudioPlayer>
}

const AlbumsGrid: React.FC<AlbumsGridProps> = ({ albums, setQueue, audio }) => {
	const handleAlbumClick = (album: any) => {
		if (album.songs && album.songs.length > 0) {
			setQueue(album.songs)
			audio.handlePlay(album.songs[0].path)
		}
	}

	return (
		<div className="albums-grid">
			{albums.map((album, idx) => (
				<div className="album-card" key={album.id || idx} onClick={() => handleAlbumClick(album)} tabIndex={0} role="button">
					{album.cover ? (
						<img src={album.cover} alt={album.title} className="album-card__cover album__cover" />
					) : (
						<div className="album-card__cover album__cover default">
							<span role="img" aria-label="No cover">
								<MusicNotes size={48} weight="fill" />
							</span>
						</div>
					)}
					<div className="album-card__info">
						<strong>{album.title || 'Álbum desconocido'}</strong>
						{album.artist && <div className="album-card__artist">{album.artist}</div>}
					</div>
				</div>
			))}
		</div>
	)
}

export default AlbumsGrid
