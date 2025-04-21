import { usePlayerStore } from '../../store/player'
import { Play, Pause, Rewind, Trash, X, FastForward, Repeat, Shuffle } from '@phosphor-icons/react'
import './_queue.scss'

interface QueueProps {
	audio: ReturnType<typeof import('../../hooks/useAudioPlayer').useAudioPlayer>
}

const Queue = ({ audio }: QueueProps) => {
	const { queue, currentIndex, clearQueue, removeFromQueue, setCurrentIndex, cleanQueueHistory, repeat, setRepeat, shuffle, setShuffle } = usePlayerStore()
	const { handlePause, handleResume, isPlaying, handlePlay } = audio

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
		<>
			<div className="queue__actions">
				<button className={`btn${shuffle ? ' active' : ''}`} onClick={() => setShuffle(!shuffle)} title="Shuffle queue">
					<Shuffle size={16} weight="fill" />
				</button>

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

				<button className={`btn${repeat ? ' active' : ''}`} onClick={() => setRepeat(!repeat)} title="Repeat queue">
					<Repeat size={16} weight="fill" />
				</button>
			</div>

			<div className="queue">
				<header className="queue__header">
					<h2 className="queue__title">
						Queue <small>({Math.max(queue.length - (currentIndex + 1), 0)})</small>
					</h2>
					<button className="btn" onClick={clearQueue} title="Clear queue">
						<Trash size={16} weight="fill" />
					</button>
				</header>
				{queue.length === 0 && <p className="queue__empty">No songs in queue</p>}
				{queue.length > 0 && (
					<ol className="queue__list">
						{queue.map((song, idx) => (
							<li key={song.path + '-' + idx} className={`queue__item${idx === currentIndex ? ' playing' : ''}${idx < currentIndex ? ' played' : ''}`}>
								<span>{song.title}</span>
								<small>({song.artist})</small>
								<button className="btn" onClick={() => handleRemoveFromQueue(idx)} title="Remove from queue">
									<X size={16} weight="bold" />
								</button>
							</li>
						))}
					</ol>
				)}
			</div>
		</>
	)
}

export default Queue
