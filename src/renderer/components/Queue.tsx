import { usePlayerStore } from '../store/player'
import { Play, Pause, Rewind, Trash, X, FastForward } from '@phosphor-icons/react'

interface QueueProps {
	audio: ReturnType<typeof import('../hooks/useAudioPlayer').useAudioPlayer>
}

const Queue = ({ audio }: QueueProps) => {
	const { queue, currentIndex, clearQueue, removeFromQueue, setCurrentIndex } = usePlayerStore()
	const { handlePause, handleResume, isPlaying, handlePlay } = audio

	const playPrev = () => {
		if (currentIndex > 0) {
			setCurrentIndex(currentIndex - 1)
			handlePlay(queue[currentIndex - 1].path)
		}
	}

	const playNext = () => {
		if (currentIndex + 1 < queue.length) {
			setCurrentIndex(currentIndex + 1)
			handlePlay(queue[currentIndex + 1].path)
		}
	}

	const handleRemoveFromQueue = (idx: number) => {
		if (idx === currentIndex) {
			// Si hay siguiente canción, reproducirla
			if (idx < queue.length - 1) {
				setCurrentIndex(idx) // el índice de la siguiente canción tras eliminar
				removeFromQueue(idx)
				handlePlay(queue[idx + 1].path)
			} else {
				// Si no hay más canciones, parar todo
				removeFromQueue(idx)
				handlePause()
			}
		} else {
			removeFromQueue(idx)
		}
	}

	return (
		<div className="queue">
			<h3 className="queue__title">Queue</h3>
			<ol className="queue__list">
				{queue.map((song, idx) => (
					<li key={song.path + '-' + idx} className={`queue__item ${idx === currentIndex ? 'active' : ''}`}>
						<span>{song.title}</span>
						<small>({song.artist})</small>
						{idx === currentIndex && '🎶'}
						<button className="btn" onClick={() => handleRemoveFromQueue(idx)} title="Remove from queue">
							<X size={16} weight="bold" />
						</button>
					</li>
				))}
			</ol>
			<div className="queue__actions">
				<button className="btn" onClick={playPrev} title="Previous song" disabled={currentIndex <= 0}>
					<Rewind size={16} weight="fill" />
				</button>
				{isPlaying ? (
					<button className="btn" onClick={handlePause} title="Pause" disabled={currentIndex === -1}>
						<Pause size={16} weight="fill" />
					</button>
				) : (
					<button
						className="btn"
						onClick={() => {
							if (queue[currentIndex]) {
								handlePlay(queue[currentIndex].path)
							}
						}}
						title="Play"
						disabled={currentIndex === -1}
					>
						<Play size={16} weight="fill" />
					</button>
				)}
				<button className="btn" onClick={playNext} title="Next song" disabled={currentIndex === -1 || currentIndex >= queue.length - 1}>
					<FastForward size={16} weight="fill" />
				</button>
				<button className="btn" onClick={clearQueue} title="Clear queue" disabled={queue.length === 0}>
					<Trash size={16} weight="fill" />
				</button>
			</div>
		</div>
	)
}

export default Queue
