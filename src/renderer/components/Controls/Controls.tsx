import { SpeakerHigh, Play, Pause, Rewind, FastForward, Repeat, Shuffle } from '@phosphor-icons/react/dist/ssr'
import { usePlayerStore } from '../../store/player'
import './_controls.scss'
import { Sliders } from '@phosphor-icons/react'

interface ControlsProps {
	audio: ReturnType<typeof import('../../hooks/useAudioPlayer').useAudioPlayer>
}

const Controls = ({ audio }: ControlsProps) => {
	const { queue, currentIndex, setCurrentIndex, cleanQueueHistory, repeat, setRepeat, shuffle, setShuffle } = usePlayerStore()
	const { volume, setVolume, handlePause, isPlaying, handlePlay } = audio

	// Calculate rotation angle (-120 to 120 degrees based on volume 0-1)
	const rotationAngle = volume * 240 - 120

	const handleVolumeWheel = (e: React.WheelEvent) => {
		e.preventDefault()
		const delta = e.deltaY < 0 ? 0.05 : -0.05
		setVolume((v) => Math.max(0, Math.min(1, v + delta)))
	}

	const playPrev = () => {
		if (currentIndex > 0) {
			setCurrentIndex(currentIndex - 1)
			cleanQueueHistory()
			handlePlay(queue[currentIndex - 1].path)
		}
	}

	const playNext = () => {
		if (currentIndex + 1 < queue.length) {
			setCurrentIndex(currentIndex + 1)
			cleanQueueHistory()
			handlePlay(queue[currentIndex + 1].path)
		}
	}

	return (
		<div className="controls">
			<div className="controls__settings">
				<button className="btn" onClick={() => setVolume(1)} title="Volume">
					<Sliders size={20} />
				</button>
			</div>

			<div className="controls__playback">
				<button className={`btn btn--secondary${shuffle ? ' active' : ''}`} onClick={() => setShuffle(!shuffle)} title="Shuffle queue">
					<Shuffle size={20} weight="fill" />
				</button>

				<button className="btn" onClick={playPrev} title="Previous song" disabled={currentIndex <= 0}>
					<Rewind size={20} weight="fill" />
				</button>

				{isPlaying ? (
					<button className="btn btn--lg active" onClick={handlePause} title="Pause" disabled={currentIndex === -1}>
						<Pause size={28} weight="fill" />
					</button>
				) : (
					<button
						className="btn btn--lg"
						onClick={() => {
							if (queue[currentIndex]) {
								handlePlay(queue[currentIndex].path)
							}
						}}
						title="Play"
						disabled={currentIndex === -1}
					>
						<Play size={28} weight="fill" />
					</button>
				)}

				<button className="btn" onClick={playNext} title="Next song" disabled={currentIndex === -1 || currentIndex >= queue.length - 1}>
					<FastForward size={20} weight="fill" />
				</button>

				<button className={`btn btn--secondary${repeat ? ' active' : ''}`} onClick={() => setRepeat(!repeat)} title="Repeat queue">
					<Repeat size={20} weight="fill" />
				</button>
			</div>

			<div className="controls__volume">
				<div className="volume-knob" onWheel={handleVolumeWheel} title={`Volume: ${Math.round(volume * 100)}%`}>
					<div className="volume-knob__indicator" style={{ transform: `rotate(${rotationAngle}deg)` }} />
				</div>
			</div>
		</div>
	)
}

export default Controls
