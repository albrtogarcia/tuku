import { usePlayerStore } from '../../store/player'
import { formatTime } from '../../utils'
import './_player.scss'

interface PlayerProps {
	audio: ReturnType<typeof import('../../hooks/useAudioPlayer').useAudioPlayer>
}

const Player = ({ audio }: PlayerProps) => {
	const { queue, currentIndex } = usePlayerStore()
	const { duration, currentTime, setCurrentTime } = audio
	const song = queue[currentIndex]
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
					<input
						className="player__progress"
						type="range"
						min={0}
						max={duration}
						value={currentTime}
						onChange={(e) => {
							const time = Number(e.target.value)
							setCurrentTime(time)
						}}
					/>
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
