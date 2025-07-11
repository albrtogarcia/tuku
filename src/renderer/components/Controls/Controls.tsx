import { PlayIcon, PauseIcon, RewindIcon, FastForwardIcon, RepeatIcon, ShuffleIcon } from '@phosphor-icons/react/dist/ssr'
import { usePlayerStore } from '../../store/player'
import './_controls.scss'
import { SlidersIcon } from '@phosphor-icons/react'
import { useEffect, useRef } from 'react'

interface ControlsProps {
	audio: ReturnType<typeof import('../../hooks/useAudioPlayer').useAudioPlayer>
	onOpenSettings: () => void
}

const Controls = ({ audio, onOpenSettings }: ControlsProps) => {
	const { queue, currentIndex, setCurrentIndex, cleanQueueHistory, repeat, setRepeat, shuffle, setShuffle } = usePlayerStore()
	const { volume, setVolume, handlePause, isPlaying, handlePlay } = audio
	const volumeWheelRef = useRef<HTMLDivElement>(null)

	// Calculate rotation angle (-120 to 120 degrees based on volume 0-1)
	const rotationAngle = volume * 240 - 120

	// Use useEffect to register non-passive wheel event listener
	useEffect(() => {
		const element = volumeWheelRef.current
		if (element) {
			const handleVolumeWheel = (e: WheelEvent) => {
				e.preventDefault()
				const delta = e.deltaY < 0 ? 0.05 : -0.05
				setVolume((v) => Math.max(0, Math.min(1, v + delta)))
			}

			element.addEventListener('wheel', handleVolumeWheel, { passive: false })
			return () => {
				element.removeEventListener('wheel', handleVolumeWheel)
			}
		}
	}, [setVolume])

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
				<button className="btn" onClick={onOpenSettings} title="Settings">
					<SlidersIcon size={20} />
				</button>
			</div>

			<div className="controls__playback">
				<button className={`btn btn--secondary${shuffle ? ' active' : ''}`} onClick={() => setShuffle(!shuffle)} title="Shuffle queue">
					<ShuffleIcon size={20} weight="fill" />
				</button>

				<button className="btn" onClick={playPrev} title="Previous song" disabled={currentIndex <= 0}>
					<RewindIcon size={20} weight="fill" />
				</button>

				{isPlaying && currentIndex !== -1 ? (
					<button className="btn btn--lg active" onClick={handlePause} title="Pause">
						<PauseIcon size={28} weight="fill" />
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
						<PlayIcon size={28} weight="fill" />
					</button>
				)}

				<button className="btn" onClick={playNext} title="Next song" disabled={currentIndex === -1 || currentIndex >= queue.length - 1}>
					<FastForwardIcon size={20} weight="fill" />
				</button>

				<button className={`btn btn--secondary${repeat ? ' active' : ''}`} onClick={() => setRepeat(!repeat)} title="Repeat queue">
					<RepeatIcon size={20} weight="fill" />
				</button>
			</div>

			<div className="controls__volume">
				<div className="volume-knob" ref={volumeWheelRef} title={`Volume: ${Math.round(volume * 100)}%`}>
					<div className="volume-knob__indicator" style={{ transform: `rotate(${rotationAngle}deg)` }} />
				</div>
			</div>
		</div>
	)
}

export default Controls
