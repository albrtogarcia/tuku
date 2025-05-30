import { usePlayerStore } from '../../store/player'
import { Trash, X } from '@phosphor-icons/react'
import { DragDropContext, Droppable, Draggable, DropResult, DroppableProvided, DraggableProvided, DraggableStateSnapshot } from 'react-beautiful-dnd'
import './_queue.scss'

interface QueueProps {
	audio: ReturnType<typeof import('../../hooks/useAudioPlayer').useAudioPlayer>
}

const Queue = ({ audio }: QueueProps) => {
	const { queue, currentIndex, clearQueue, removeFromQueue, setCurrentIndex, setQueue } = usePlayerStore()
	const { handlePause, handlePlay } = audio

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

	// Función para reordenar la cola
	function onDragEnd(result: DropResult) {
		if (!result.destination) return
		const newQueue = Array.from(queue)
		const [removed] = newQueue.splice(result.source.index, 1)
		newQueue.splice(result.destination.index, 0, removed)
		setQueue(newQueue)
		// Si la canción actual se movió, actualiza el currentIndex
		if (result.source.index === currentIndex) {
			setCurrentIndex(result.destination.index)
		} else if (result.source.index < currentIndex && result.destination.index >= currentIndex) {
			setCurrentIndex(currentIndex - 1)
		} else if (result.source.index > currentIndex && result.destination.index <= currentIndex) {
			setCurrentIndex(currentIndex + 1)
		}
	}

	return (
		<DragDropContext onDragEnd={onDragEnd}>
			<div className="queue">
				<header className="queue__header">
					<h2 className="queue__title">
						Queue <small>({Math.max(queue.length - (currentIndex + 1), 0)})</small>
					</h2>
					<button className="btn" onClick={clearQueue} title="Clear queue">
						<Trash size={16} weight="fill" />
					</button>
				</header>
				<Droppable droppableId="queue-list" isDropDisabled={false} isCombineEnabled={false} ignoreContainerClipping={false as boolean} direction="vertical">
					{(provided: DroppableProvided) => (
						<ol className="queue__list" ref={provided.innerRef} {...provided.droppableProps}>
							{queue.length === 0 ? (
								<li className="queue__empty">No songs in queue</li>
							) : (
								queue.map((song, idx) => (
									<Draggable key={song.path + '-' + idx} draggableId={song.path + '-' + idx} index={idx}>
										{(provided: DraggableProvided, snapshot: DraggableStateSnapshot) => (
											<li
												ref={provided.innerRef}
												{...provided.draggableProps}
												{...provided.dragHandleProps}
												className={`queue__item${idx === currentIndex ? ' playing' : ''}${idx < currentIndex ? ' played' : ''}${snapshot.isDragging ? ' dragging' : ''}`}
											>
												<span style={{ cursor: 'grab', marginRight: 8 }}>☰</span>
												<span>{song.title}</span>
												<small>({song.artist})</small>
												<button className="btn" onClick={() => handleRemoveFromQueue(idx)} title="Remove from queue">
													<X size={16} weight="bold" />
												</button>
											</li>
										)}
									</Draggable>
								))
							)}
							{provided.placeholder}
						</ol>
					)}
				</Droppable>
			</div>
		</DragDropContext>
	)
}

export default Queue
