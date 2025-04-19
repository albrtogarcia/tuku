import { Song } from '../../types/song'

interface PlayerProps {
	song: Song | undefined
	duration: number
	currentTime: number
	onSeek: (time: number) => void
	formatTime: (sec: number) => string
}

const Player = ({ song, duration, currentTime, onSeek, formatTime }: PlayerProps) => {
	if (!song) return null
	return (
		<div className="player">
			{song.cover ? <img className="player__cover" src={song.cover} alt="cover" /> : <div className="player__cover--default">🎵</div>}
			<div className="player__info">
				<h4 className="song__title">{song.title || ''}</h4>
				<p className="song__metadata">
					{song.artist} {song.album && <>— {song.album}</>}
				</p>
				<div className="player__controls">
					<input className="player__progress" type="range" min={0} max={duration} value={currentTime} onChange={(e) => onSeek(Number(e.target.value))} />
					<div className="player__time">
						<span>{formatTime(currentTime)}</span>
						<span>{formatTime(duration)}</span>
					</div>
				</div>
			</div>
		</div>
	)
}

export default Player
