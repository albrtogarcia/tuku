import { useState } from 'react'
import { Song } from '../../types/song'

export function useQueue(onPlay: (songPath: string) => void, onStop: () => void) {
	const [queue, setQueue] = useState<Song[]>([])
	const [currentIndex, setCurrentIndex] = useState<number>(-1)

	const addToQueue = (song: Song) => {
		setQueue((prev) => [...prev, song])
		if (currentIndex === -1) {
			setCurrentIndex(0)
			onPlay(song.path)
		}
	}

	const playNext = () => {
		if (currentIndex + 1 < queue.length) {
			setCurrentIndex(currentIndex + 1)
			onPlay(queue[currentIndex + 1].path)
		}
	}

	const playPrev = () => {
		if (currentIndex > 0) {
			setCurrentIndex(currentIndex - 1)
			onPlay(queue[currentIndex - 1].path)
		}
	}

	const removeFromQueue = (index: number) => {
		setQueue((prev) => prev.filter((_, i) => i !== index))
		if (index === currentIndex) {
			if (index < queue.length - 1) {
				setCurrentIndex(index)
				onPlay(queue[index + 1].path)
			} else {
				setCurrentIndex(-1)
				onStop()
			}
		} else if (index < currentIndex) {
			setCurrentIndex((prev) => prev - 1)
		}
	}

	const clearQueue = () => {
		setQueue([])
		setCurrentIndex(-1)
		onStop()
	}

	const handleEnded = () => {
		setQueue((prev) => {
			const newQueue = prev.filter((_, i) => i !== currentIndex)
			if (currentIndex < prev.length - 1) {
				setCurrentIndex(currentIndex)
				if (newQueue[currentIndex]) {
					onPlay(newQueue[currentIndex].path)
				}
			} else {
				setCurrentIndex(-1)
				onStop()
			}
			return newQueue
		})
	}

	return {
		queue,
		setQueue,
		currentIndex,
		setCurrentIndex,
		addToQueue,
		playNext,
		playPrev,
		removeFromQueue,
		clearQueue,
		handleEnded,
	}
}
