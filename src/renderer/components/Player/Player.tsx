import { MusicNotes, SpeakerHigh } from '@phosphor-icons/react/dist/ssr'
import { usePlayerStore } from '../../store/player'
import { formatTime } from '../../utils'
import './_player.scss'

interface PlayerProps {
	audio: ReturnType<typeof import('../../hooks/useAudioPlayer').useAudioPlayer>
}

const Player = ({ audio }: PlayerProps) => {
	const { queue, currentIndex } = usePlayerStore()
	const { duration, currentTime, setCurrentTime, volume, setVolume } = audio
	const song = queue[currentIndex]
	if (!song) return null

	return (
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
					<div className="player__volume" style={{ display: 'flex', alignItems: 'center', marginLeft: '1rem' }}>
						<SpeakerHigh size={20} style={{ marginRight: 4 }} />
						<input
							type="range"
							min={0}
							max={1}
							step={0.01}
							value={volume}
							onChange={(e) => setVolume(Number(e.target.value))}
							onWheel={(e) => {
								const delta = e.deltaY < 0 ? 0.05 : -0.05
								setVolume((v) => Math.max(0, Math.min(1, v + delta)))
							}}
							style={{ width: 80 }}
						/>
					</div>
				</div>
			</div>
		</div>
	)
}

export default Player
