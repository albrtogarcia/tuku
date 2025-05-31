import { usePlayerStore } from '../../store/player'
import { TrashIcon, X } from '@phosphor-icons/react'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import './_queue.scss'

interface QueueProps {
	audio: ReturnType<typeof import('../../hooks/useAudioPlayer').useAudioPlayer>
}

// Sortable Queue Item Component
interface SortableQueueItemProps {
	song: any
	index: number
	isPlaying: boolean
	isPlayed: boolean
	onRemove: (idx: number) => void
	onDoubleClick: (idx: number) => void
}

function SortableQueueItem({ song, index, isPlaying, isPlayed, onRemove, onDoubleClick }: SortableQueueItemProps) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: song.path })

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
	}

	return (
		<li ref={setNodeRef} style={style} className={`queue__item${isPlaying ? ' playing' : ''}${isPlayed ? ' played' : ''}${isDragging ? ' dragging' : ''}`}>
			<div {...attributes} {...listeners} className="queue__item-content" onDoubleClick={() => onDoubleClick(index)}>
				<span>{song.title}</span>
				<small>({song.artist})</small>
			</div>
			<button className="btn" onClick={() => onRemove(index)} title="Remove from queue">
				<X size={16} weight="bold" />
			</button>
		</li>
	)
}

const Queue = ({ audio }: QueueProps) => {
	const { queue, currentIndex, clearQueue, removeFromQueue, setCurrentIndex, setQueue } = usePlayerStore()
	const { handlePause, handlePlay } = audio

	const sensors = useSensors(
		useSensor(PointerSensor),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	)

	const handleRemoveFromQueue = (idx: number) => {
		if (idx === currentIndex) {
			// If there's a next song, play it
			if (idx < queue.length - 1) {
				setCurrentIndex(idx) // the index of the next song after removing
				removeFromQueue(idx)
				handlePlay(queue[idx + 1].path)
			} else {
				// If no more songs, stop everything
				removeFromQueue(idx)
				handlePause()
			}
		} else {
			removeFromQueue(idx)
		}
	}
	const handleQueueItemDoubleClick = (idx: number) => {
		if (idx === currentIndex) {
			// If it's the current song, just restart playback
			handlePlay(queue[idx].path)
			return
		}

		// Move the song to current position + 1 (next to play)
		const newQueue = [...queue]
		const [selectedSong] = newQueue.splice(idx, 1)

		// Insert after the current song
		newQueue.splice(currentIndex + 1, 0, selectedSong)

		setQueue(newQueue)
		// Advance to the next index (where we put the song)
		setCurrentIndex(currentIndex + 1)
		handlePlay(selectedSong.path)
	}

	// Function to reorder the queue
	function handleDragEnd(event: DragEndEvent) {
		const { active, over } = event

		if (active.id !== over?.id) {
			const activeIndex = queue.findIndex((song) => song.path === active.id)
			const overIndex = queue.findIndex((song) => song.path === over?.id)

			const newQueue = arrayMove(queue, activeIndex, overIndex)
			setQueue(newQueue)

			// If the current song moved, update the currentIndex
			if (activeIndex === currentIndex) {
				setCurrentIndex(overIndex)
			} else if (activeIndex < currentIndex && overIndex >= currentIndex) {
				setCurrentIndex(currentIndex - 1)
			} else if (activeIndex > currentIndex && overIndex <= currentIndex) {
				setCurrentIndex(currentIndex + 1)
			}
		}
	}

	return (
		<div className="queue">
			<header className="queue__header">
				<h2 className="queue__title">
					Queue <small>({Math.max(queue.length - (currentIndex + 1), 0)})</small>
				</h2>
				{queue.length != 0 && (
					<button className="btn" onClick={clearQueue} title="Clear queue">
						<TrashIcon size={16} weight="fill" />
					</button>
				)}
			</header>
			<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
				<SortableContext items={queue.map((song) => song.path)} strategy={verticalListSortingStrategy}>
					<ol className="queue__list">
						{queue.length === 0 ? (
							<li className="queue__empty">
								<div className="queue__empty-content">
									<span className="queue__empty-text">No upcoming songs</span>
									<small className="queue__empty-subtitle">Add songs to start listening</small>
								</div>
							</li>
						) : (
							queue.map((song, idx) => (
								<SortableQueueItem
									key={song.path}
									song={song}
									index={idx}
									isPlaying={idx === currentIndex}
									isPlayed={idx < currentIndex}
									onRemove={handleRemoveFromQueue}
									onDoubleClick={handleQueueItemDoubleClick}
								/>
							))
						)}
					</ol>
				</SortableContext>
			</DndContext>
		</div>
	)
}

export default Queue
