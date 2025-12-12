import { Song } from '../types/song'
import { Album } from '../types/album'

export function formatTime(sec: number) {
	const m = Math.floor(sec / 60)
	const s = Math.floor(sec % 60)
	return `${m}:${s.toString().padStart(2, '0')}`
}

export function filterSongs(songs: Song[], search: string): Song[] {
	const q = search.toLowerCase()
	return songs.filter(
		(song) =>
			song.title.toLowerCase().includes(q) ||
			song.artist.toLowerCase().includes(q) ||
			song.album.toLowerCase().includes(q) ||
			song.genre.toLowerCase().includes(q) ||
			(song.year && song.year.toString().includes(q)),
	)
}

export function filterAlbums(albums: Album[], search: string): Album[] {
	const q = search.toLowerCase()
	return albums.filter((album) => album.title.toLowerCase().includes(q) || album.artist.toLowerCase().includes(q))
}
