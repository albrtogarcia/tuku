import { MusicNotes } from '@phosphor-icons/react/dist/ssr'
import { usePlayerStore } from '../../store/player'
import { formatTime } from '../../utils'
import Controls from '../Controls/Controls'
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
		<>
			<div className="player">
				{song.cover ? (
					<img className="player__cover" src={song.cover} alt="cover" />
				) : (
					<div className="player__cover default">
						<MusicNotes size={48} weight="fill" />
					</div>
				)}
				<div className="player__info">
					<h4 className="song__title">{song.title || ''}</h4>
					<p className="song__metadata">
						<span className="song__artist">{song.artist}</span>
						<span className="song__album">{song.album}</span>
					</p>

					<div className="player__progress-container">
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
					</div>
					<div className="player__time">
						<span>{formatTime(currentTime)}</span>
						<span>{formatTime(duration)}</span>
					</div>
				</div>
			</div>

			<Controls audio={audio} />
		</>
	)
}

export default Player
