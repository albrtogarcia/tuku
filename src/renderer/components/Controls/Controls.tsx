import { PlayIcon, PauseIcon, RewindIcon, FastForwardIcon, RepeatIcon, ShuffleIcon } from '@phosphor-icons/react/dist/ssr'
import { useTranslation } from 'react-i18next'
import { usePlayerStore } from '../../store/player'
import './_controls.scss'
import { SlidersIcon } from '@phosphor-icons/react'
import { useEffect, useRef } from 'react'

interface ControlsProps {
	audio: ReturnType<typeof import('../../hooks/useAudioPlayer').useAudioPlayer>
	onOpenSettings: () => void
}

const Controls = ({ audio, onOpenSettings }: ControlsProps) => {
	const { t } = useTranslation()
	const { queue, currentIndex, setCurrentIndex, cleanQueueHistory, repeat, setRepeat, shuffleQueue, isPlaying, setIsPlaying } = usePlayerStore()
	const { volume, setVolume } = audio

	const handlePlayPause = () => {
		setIsPlaying(!isPlaying)
	}
	// Calculate rotation angle (-120 to 120 degrees based on volume 0-1)
	const rotationAngle = volume * 240 - 120

	const handleVolumeWheel = (e: React.WheelEvent) => {
		// e.preventDefault()
		const delta = e.deltaY < 0 ? 0.05 : -0.05
		setVolume((v) => Math.max(0, Math.min(1, v + delta)))
	}

	const playPrev = () => {
		if (currentIndex > 0) {
			setCurrentIndex(currentIndex - 1)
			cleanQueueHistory()
			setIsPlaying(true)
		}
	}

	const playNext = () => {
		if (currentIndex + 1 < queue.length) {
			setCurrentIndex(currentIndex + 1)
			cleanQueueHistory()
			setIsPlaying(true)
		}
	}

	return (
		<div className="controls">
			<div className="controls__playback">
				<div className="btn-holder">
					<button className="btn btn--secondary" onClick={() => shuffleQueue()} title={t('controls.shuffle')}>
						<ShuffleIcon size={18} weight="fill" />
					</button>
				</div>

				<div className="btn-holder">
					<button className="btn" onClick={playPrev} title={t('controls.previous')} disabled={currentIndex <= 0}>
						<RewindIcon size={18} weight="fill" />
					</button>
				</div>

				<div className="btn-holder btn-holder--big">
					{isPlaying && currentIndex !== -1 ? (
						<button className="btn btn--lg active" onClick={handlePlayPause} title={t('controls.pause')}>
							<PauseIcon size={24} weight="fill" />
						</button>
					) : (
						<button
							className="btn btn--lg"
							onClick={handlePlayPause}
							title={t('controls.play')}
							disabled={currentIndex === -1}
						>
							<PlayIcon size={24} weight="fill" />
						</button>
					)}
				</div>

				<div className="btn-holder">
					<button className="btn" onClick={playNext} title={t('controls.next')} disabled={currentIndex === -1 || currentIndex >= queue.length - 1}>
						<FastForwardIcon size={18} weight="fill" />
					</button>
				</div>

				<div className="btn-holder">
					<button className={`btn btn--secondary${repeat ? ' active' : ''}`} onClick={() => setRepeat(!repeat)} title={t('controls.repeat')}>
						<RepeatIcon size={18} weight="fill" />
					</button>
				</div>
			</div>

			<div className="controls__volume">
				<div className="knob__container" title={t('controls.volume', { percent: Math.round(volume * 100) })}>
					<div className="knob__outer" onWheel={handleVolumeWheel}>
						<div className="knob__shadow"></div>
						<div className="knob__inner">
							<div className="knob__indicator" style={{ transform: `rotate(${rotationAngle}deg)` }}></div>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}

export default Controls
