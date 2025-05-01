import React, { useState } from 'react'

interface AlbumsListCollapsibleProps {
	albums: Array<any> // Reemplaza 'any' por el tipo de álbum si lo tienes tipado
}

const AlbumsListCollapsible: React.FC<AlbumsListCollapsibleProps> = ({ albums }) => {
	const [openAlbum, setOpenAlbum] = useState<string | null>(null)

	return (
		<div className="albums-list-collapsible">
			{albums.map((album, idx) => (
				<div className="album-list-item" key={album.id || idx}>
					<button onClick={() => setOpenAlbum(openAlbum === album.id ? null : album.id)}>{openAlbum === album.id ? '−' : '+'}</button>
					<span>{album.title}</span>
					{openAlbum === album.id && (
						<ul className="album-songs">{album.songs?.map((song: any, sidx: number) => <li key={song.id || sidx}>{song.title}</li>)}</ul>
					)}
				</div>
			))}
		</div>
	)
}

export default AlbumsListCollapsible
