import { Song } from '../../types/song'
import { Play, Pause, Plus } from '@phosphor-icons/react'

interface SongsListProps {
	songs: Song[]
	playingPath: string | null
	handlePause: () => void
	handleResume: () => void
	addToQueue: (song: Song) => void
	handleSelectFolder: () => void
	folderPath: string | null
}

const SongsList = ({ songs, playingPath, handlePause, handleResume, addToQueue, handleSelectFolder, folderPath }: SongsListProps) => {
	if (songs.length === 0) return null
	return (
		<section className="songs">
			<header className="songs__header">
				<h2>Library: {songs.length} songs</h2>
				<button className="btn btn-secondary" onClick={handleSelectFolder}>
					{folderPath ? folderPath : 'Select music folder'}
				</button>
			</header>
			<ul className="songs__list">
				{songs.map((song, idx) => (
					<li className="song" key={song.path + '-' + idx}>
						{!song.cover && <div className="song__cover--default" />}
						{song.cover && <img className="song__cover" src={song.cover} alt={song.album} width={32} />}
						<div className="song__info">
							<p className="song__title">{song.title}</p>
							<small className="song__metadata">
								{song.artist} ({song.album})
								{song.genre && (
									<span>
										{' '}
										— <em>{song.genre}</em>
									</span>
								)}
							</small>
						</div>
						<div className="song__actions">
							{playingPath === song.path ? (
								<button className="btn btn-icon" onClick={handlePause}>
									<Pause size={16} weight="fill" />
								</button>
							) : (
								<button className="btn btn-icon" onClick={handleResume}>
									<Play size={16} weight="fill" />
								</button>
							)}
							<button className="btn btn-icon" onClick={() => addToQueue(song)}>
								<Plus size={16} weight="bold" />
							</button>
						</div>
					</li>
				))}
			</ul>
		</section>
	)
}

export default SongsList
