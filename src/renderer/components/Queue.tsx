import { Song } from '../../types/song'
import { Play, Pause, Rewind, Trash, X, FastForward } from '@phosphor-icons/react'

interface QueueProps {
	queue: Song[]
	currentIndex: number
	isPlaying: boolean
	playPrev: () => void
	playNext: () => void
	handlePause: () => void
	handleResume: () => void
	clearQueue: () => void
	removeFromQueue: (index: number) => void
}

const Queue = ({ queue, currentIndex, isPlaying, playPrev, playNext, handlePause, handleResume, clearQueue, removeFromQueue }: QueueProps) => {
	return (
		<div className="queue">
			<h3 className="queue__title">Queue</h3>
			<ol className="queue__list">
				{queue.map((song, idx) => (
					<li key={song.path + '-' + idx} className={`queue__item ${idx === currentIndex ? 'active' : ''}`}>
						<span>{song.title}</span>
						<small>({song.artist})</small>
						{idx === currentIndex && '🎶'}
						<button className="btn" onClick={() => removeFromQueue(idx)} title="Remove from queue">
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
					<button className="btn" onClick={handleResume} title="Play" disabled={currentIndex === -1}>
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
