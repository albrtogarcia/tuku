import { useTranslation } from 'react-i18next'
import { usePlayerStore } from '../../store/player'
import { XIcon, WarningIcon } from '@phosphor-icons/react'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { formatTime } from '@/utils'
import './_queue.scss'

interface QueueProps {
	audio: ReturnType<typeof import('../../hooks/useAudioPlayer').useAudioPlayer>
	failedSongPaths: Set<string>
}

// Sortable Queue Item Component
interface SortableQueueItemProps {
	song: any
	index: number
	isPlaying: boolean
	isPlayed: boolean
	hasFailed: boolean
	removeTitle: string
	onRemove: (idx: number) => void
	onDoubleClick: (idx: number) => void
}

function SortableQueueItem({ song, index, isPlaying, isPlayed, hasFailed, removeTitle, onRemove, onDoubleClick }: SortableQueueItemProps) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: `${song.path}-${index}` })

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
	}

	return (
		<li
			ref={setNodeRef}
			style={style}
			className={`queue__item${isPlaying ? ' playing' : ''}${isPlayed ? ' played' : ''}${isDragging ? ' dragging' : ''}${hasFailed ? ' failed' : ''}`}
		>
			<div {...attributes} {...listeners} className="queue__item-content" onDoubleClick={() => onDoubleClick(index)}>
				<span>
					{song.title}
					{hasFailed && <WarningIcon size={12} weight="fill" className="queue__item-warning" />}
				</span>
				<small>{song.artist}</small>
				<small>{song.album}</small>
				<small>{formatTime(song.duration)}</small>
			</div>
			<button className="btn btn--ghost" onClick={() => onRemove(index)} title={removeTitle}>
				<XIcon size={16} weight="bold" />
			</button>
		</li>
	)
}

const Queue = ({ audio, failedSongPaths }: QueueProps) => {
	const { t } = useTranslation()
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
				// Save reference to next song BEFORE removing current
				const nextSong = queue[idx + 1]
				removeFromQueue(idx)
				setCurrentIndex(idx) // the index of the next song after removing
				handlePlay(nextSong.path)
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
			const activeIndex = queue.findIndex((_, idx) => `${queue[idx].path}-${idx}` === active.id)
			const overIndex = queue.findIndex((_, idx) => `${queue[idx].path}-${idx}` === over?.id)

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
					{t('queue.title')} <small>({Math.max(queue.length - (currentIndex + 1), 0)})</small>
				</h2>
				{queue.length != 0 && (
					<button className="btn" onClick={clearQueue} title={t('queue.clearTitle')}>
						{t('queue.clear')}
					</button>
				)}
			</header>
			<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
				<SortableContext items={queue.map((song, idx) => `${song.path}-${idx}`)} strategy={verticalListSortingStrategy}>
					<ol className="queue__list">
						{queue.length === 0 ? (
							<li className="queue__empty">
								<div className="queue__empty-content">
									<span className="queue__empty-text">{t('queue.emptyTitle')}</span>
									<small className="queue__empty-subtitle">{t('queue.emptySubtitle')}</small>
								</div>
							</li>
						) : (
							queue.map((song, idx) => (
								<SortableQueueItem
									key={`${song.path}-${idx}`}
									song={song}
									index={idx}
									isPlaying={idx === currentIndex}
									isPlayed={idx < currentIndex}
									hasFailed={failedSongPaths.has(song.path)}
									removeTitle={t('queue.removeTitle')}
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
