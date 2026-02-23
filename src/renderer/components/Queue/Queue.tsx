import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { usePlayerStore } from '../../store/player'
import { XIcon, WarningIcon } from '@phosphor-icons/react'
import ContextMenu from '../ContextMenu/ContextMenu'
import type { Song } from '../../../types/song'
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
	const { queue, currentIndex, clearQueue, removeFromQueue, setCurrentIndex, setQueue, playHistory, addToQueue } = usePlayerStore()
	const { handlePause, handlePlay } = audio

	const [activeTab, setActiveTab] = useState<'queue' | 'history'>('queue')
	const [contextMenu, setContextMenu] = useState<{ x: number; y: number; song: Song | null }>({ x: 0, y: 0, song: null })

	const start = Math.max(currentIndex, 0)
	const historyItems = playHistory

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
				<div className="tabs">
					<button
						className={`tabs__button${activeTab === 'queue' ? ' active' : ''}`}
						onClick={() => setActiveTab('queue')}
					>
						{t('queue.title')} ({Math.max(queue.length - (currentIndex + 1), 0)})
					</button>
					<button
						className={`tabs__button${activeTab === 'history' ? ' active' : ''}`}
						onClick={() => setActiveTab('history')}
					>
						{t('queue.history')} ({historyItems.length})
					</button>
				</div>
				{activeTab === 'queue' && queue.length > 0 && (
					<button className="btn" onClick={clearQueue} title={t('queue.clearTitle')}>
						{t('queue.clear')}
					</button>
				)}
			</header>

			{activeTab === 'queue' && (
				<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
					<SortableContext
						items={queue.slice(start).map((_, i) => `${queue[start + i].path}-${start + i}`)}
						strategy={verticalListSortingStrategy}
					>
						<ol className="queue__list">
							{queue.length === 0 ? (
								<li className="queue__empty">
									<div className="queue__empty-content">
										<span className="queue__empty-text">{t('queue.emptyTitle')}</span>
										<small className="queue__empty-subtitle">{t('queue.emptySubtitle')}</small>
									</div>
								</li>
							) : (
								queue.slice(start).map((song, i) => {
									const idx = start + i
									return (
										<SortableQueueItem
											key={`${song.path}-${idx}`}
											song={song}
											index={idx}
											isPlaying={idx === currentIndex}
											isPlayed={false}
											hasFailed={failedSongPaths.has(song.path)}
											removeTitle={t('queue.removeTitle')}
											onRemove={handleRemoveFromQueue}
											onDoubleClick={handleQueueItemDoubleClick}
										/>
									)
								})
							)}
						</ol>
					</SortableContext>
				</DndContext>
			)}

			{activeTab === 'history' && (
				<ol className="queue__list">
					{historyItems.length === 0 ? (
						<li className="queue__empty">
							<div className="queue__empty-content">
								<span className="queue__empty-text">{t('queue.historyEmpty')}</span>
							</div>
						</li>
					) : (
						historyItems.map((song, idx) => (
							<li
								key={`${song.path}-${idx}`}
								className="queue__item played"
								onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, song }) }}
							>
								<div className="queue__item-content">
									<span>{song.title}</span>
									<small>{song.artist}</small>
									<small>{song.album}</small>
									<small>{formatTime(song.duration)}</small>
								</div>
							</li>
						))
					)}
				</ol>
			)}
		{contextMenu.song && (
			<ContextMenu
				x={contextMenu.x}
				y={contextMenu.y}
				options={[{ label: t('songs.addToQueue'), action: () => addToQueue(contextMenu.song!) }]}
				onClose={() => setContextMenu({ x: 0, y: 0, song: null })}
			/>
		)}
		</div>
	)
}

export default Queue
