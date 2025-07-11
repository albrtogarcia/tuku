import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import '@testing-library/jest-dom'
import Queue from './Queue'
import { usePlayerStore } from '../../store/player'
import type { Song } from '../../../types/song'

// Mock the player store
vi.mock('../../store/player', () => ({
	usePlayerStore: vi.fn(),
}))

// Mock @dnd-kit/core and related packages
vi.mock('@dnd-kit/core', () => ({
	DndContext: ({ children }: any) => <div data-testid="dnd-context">{children}</div>,
	closestCenter: vi.fn(),
	KeyboardSensor: vi.fn(),
	PointerSensor: vi.fn(),
	useSensor: vi.fn(),
	useSensors: vi.fn(() => []),
}))

vi.mock('@dnd-kit/sortable', () => ({
	SortableContext: ({ children }: any) => <div data-testid="sortable-context">{children}</div>,
	arrayMove: vi.fn((arr, from, to) => {
		const result = [...arr]
		const [removed] = result.splice(from, 1)
		result.splice(to, 0, removed)
		return result
	}),
	sortableKeyboardCoordinates: vi.fn(),
	verticalListSortingStrategy: vi.fn(),
	useSortable: vi.fn(() => ({
		attributes: {},
		listeners: {},
		setNodeRef: vi.fn(),
		transform: null,
		transition: null,
		isDragging: false,
	})),
}))

vi.mock('@dnd-kit/utilities', () => ({
	CSS: {
		Transform: {
			toString: vi.fn(() => ''),
		},
	},
}))

describe('Queue Component', () => {
	const createMockAudio = (overrides = {}) => ({
		audioRef: { current: null },
		audioUrl: null,
		isPlaying: true,
		pendingPlay: false,
		currentTime: 60,
		duration: 180,
		playingPath: '/path/to/song.mp3',
		volume: 1,
		setCurrentTime: vi.fn(),
		setCurrentTimeOnly: vi.fn(),
		setDuration: vi.fn(),
		setPlayingPath: vi.fn(),
		handlePlay: vi.fn(),
		handlePause: vi.fn(),
		handleResume: vi.fn(),
		handleCanPlay: vi.fn(),
		handleStop: vi.fn(),
		setVolume: vi.fn(),
		...overrides,
	})

	const mockSongs: Song[] = [
		{
			path: '/path/to/song1.mp3',
			title: 'Test Song 1',
			artist: 'Test Artist 1',
			album: 'Test Album 1',
			duration: 180,
			cover: null,
			genre: 'Rock',
			track: '1',
		},
		{
			path: '/path/to/song2.mp3',
			title: 'Test Song 2',
			artist: 'Test Artist 2',
			album: 'Test Album 2',
			duration: 200,
			cover: '/path/to/cover.jpg',
			genre: 'Pop',
			track: '2',
		},
		{
			path: '/path/to/song3.mp3',
			title: 'Test Song 3',
			artist: 'Test Artist 3',
			album: 'Test Album 3',
			duration: 220,
			cover: null,
			genre: 'Jazz',
			track: '3',
		},
	]

	const mockPlayerStore = {
		queue: mockSongs,
		currentIndex: 0,
		setQueue: vi.fn(),
		setCurrentIndex: vi.fn(),
		clearQueue: vi.fn(),
		removeFromQueue: vi.fn(),
	}

	beforeEach(() => {
		vi.clearAllMocks()
		;(usePlayerStore as any).mockReturnValue(mockPlayerStore)
	})

	describe('Empty State', () => {
		it('should render empty state when queue is empty', () => {
			const emptyPlayerStore = {
				...mockPlayerStore,
				queue: [],
			}
			;(usePlayerStore as any).mockReturnValue(emptyPlayerStore)

			const mockAudio = createMockAudio()
			render(<Queue audio={mockAudio} />)

			expect(screen.getByText('No upcoming songs')).toBeInTheDocument()
			expect(screen.getByText('Add songs to start listening')).toBeInTheDocument()
		})

		it('should not show clear button when queue is empty', () => {
			const emptyPlayerStore = {
				...mockPlayerStore,
				queue: [],
			}
			;(usePlayerStore as any).mockReturnValue(emptyPlayerStore)

			const mockAudio = createMockAudio()
			render(<Queue audio={mockAudio} />)

			expect(screen.queryByTitle('Clear queue')).not.toBeInTheDocument()
		})

		it('should show correct remaining count when queue is empty', () => {
			const emptyPlayerStore = {
				...mockPlayerStore,
				queue: [],
				currentIndex: 0,
			}
			;(usePlayerStore as any).mockReturnValue(emptyPlayerStore)

			const mockAudio = createMockAudio()
			render(<Queue audio={mockAudio} />)

			expect(screen.getByText('Queue')).toBeInTheDocument()
			expect(screen.getByText('(0)')).toBeInTheDocument()
		})
	})

	describe('Queue with Songs', () => {
		it('should render all songs in the queue', () => {
			const mockAudio = createMockAudio()
			render(<Queue audio={mockAudio} />)

			expect(screen.getByText('Test Song 1')).toBeInTheDocument()
			expect(screen.getByText('(Test Artist 1)')).toBeInTheDocument()
			expect(screen.getByText('Test Song 2')).toBeInTheDocument()
			expect(screen.getByText('(Test Artist 2)')).toBeInTheDocument()
			expect(screen.getByText('Test Song 3')).toBeInTheDocument()
			expect(screen.getByText('(Test Artist 3)')).toBeInTheDocument()
		})

		it('should show correct remaining songs count', () => {
			const storeWithCurrentIndex = {
				...mockPlayerStore,
				currentIndex: 1, // Currently playing song 2 (index 1)
			}
			;(usePlayerStore as any).mockReturnValue(storeWithCurrentIndex)

			const mockAudio = createMockAudio()
			render(<Queue audio={mockAudio} />)

			// Remaining songs = total - (currentIndex + 1) = 3 - (1 + 1) = 1
			expect(screen.getByText('Queue')).toBeInTheDocument()
			expect(screen.getByText('(1)')).toBeInTheDocument()
		})

		it('should highlight currently playing song', () => {
			const mockAudio = createMockAudio()
			render(<Queue audio={mockAudio} />)

			const queueItems = document.querySelectorAll('.queue__item')
			expect(queueItems[0]).toHaveClass('playing')
			expect(queueItems[1]).not.toHaveClass('playing')
			expect(queueItems[2]).not.toHaveClass('playing')
		})

		it('should mark played songs', () => {
			const storeWithCurrentIndex = {
				...mockPlayerStore,
				currentIndex: 2, // Currently playing song 3 (index 2)
			}
			;(usePlayerStore as any).mockReturnValue(storeWithCurrentIndex)

			const mockAudio = createMockAudio()
			render(<Queue audio={mockAudio} />)

			const queueItems = document.querySelectorAll('.queue__item')
			expect(queueItems[0]).toHaveClass('played')
			expect(queueItems[1]).toHaveClass('played')
			expect(queueItems[2]).toHaveClass('playing')
			expect(queueItems[2]).not.toHaveClass('played')
		})

		it('should show clear button when queue has songs', () => {
			const mockAudio = createMockAudio()
			render(<Queue audio={mockAudio} />)

			expect(screen.getByTitle('Clear queue')).toBeInTheDocument()
		})
	})

	describe('Queue Actions', () => {
		it('should clear queue when clear button is clicked', () => {
			const mockAudio = createMockAudio()
			render(<Queue audio={mockAudio} />)

			const clearButton = screen.getByTitle('Clear queue')
			fireEvent.click(clearButton)

			expect(mockPlayerStore.clearQueue).toHaveBeenCalled()
		})

		it('should remove song from queue when remove button is clicked', () => {
			const mockAudio = createMockAudio()
			render(<Queue audio={mockAudio} />)

			const removeButtons = screen.getAllByTitle('Remove from queue')
			fireEvent.click(removeButtons[1]) // Remove second song

			expect(mockPlayerStore.removeFromQueue).toHaveBeenCalledWith(1)
		})

		it('should handle removing current song and play next', () => {
			const mockAudio = createMockAudio()
			render(<Queue audio={mockAudio} />)

			const removeButtons = screen.getAllByTitle('Remove from queue')
			fireEvent.click(removeButtons[0]) // Remove currently playing song (index 0)

			expect(mockPlayerStore.setCurrentIndex).toHaveBeenCalledWith(0)
			expect(mockPlayerStore.removeFromQueue).toHaveBeenCalledWith(0)
			expect(mockAudio.handlePlay).toHaveBeenCalledWith('/path/to/song2.mp3')
		})

		it('should pause when removing last song in queue', () => {
			const storeWithLastSong = {
				...mockPlayerStore,
				queue: [mockSongs[0]], // Only one song
				currentIndex: 0,
			}
			;(usePlayerStore as any).mockReturnValue(storeWithLastSong)

			const mockAudio = createMockAudio()
			render(<Queue audio={mockAudio} />)

			const removeButton = screen.getByTitle('Remove from queue')
			fireEvent.click(removeButton)

			expect(mockPlayerStore.removeFromQueue).toHaveBeenCalledWith(0)
			expect(mockAudio.handlePause).toHaveBeenCalled()
		})
	})

	describe('Song Interaction', () => {
		it('should restart current song when double-clicking playing song', () => {
			const mockAudio = createMockAudio()
			render(<Queue audio={mockAudio} />)

			const firstSongContent = screen.getByText('Test Song 1').closest('.queue__item-content')
			fireEvent.doubleClick(firstSongContent!)

			expect(mockAudio.handlePlay).toHaveBeenCalledWith('/path/to/song1.mp3')
		})

		it('should move song to next position and play when double-clicking non-current song', () => {
			const mockAudio = createMockAudio()
			render(<Queue audio={mockAudio} />)

			const thirdSongContent = screen.getByText('Test Song 3').closest('.queue__item-content')
			fireEvent.doubleClick(thirdSongContent!)

			// Should create new queue with song 3 moved to position 1 (after current song)
			expect(mockPlayerStore.setQueue).toHaveBeenCalled()
			expect(mockPlayerStore.setCurrentIndex).toHaveBeenCalledWith(1)
			expect(mockAudio.handlePlay).toHaveBeenCalledWith('/path/to/song3.mp3')
		})
	})

	describe('Drag and Drop', () => {
		it('should render DndContext and SortableContext', () => {
			const mockAudio = createMockAudio()
			render(<Queue audio={mockAudio} />)

			expect(screen.getByTestId('dnd-context')).toBeInTheDocument()
			expect(screen.getByTestId('sortable-context')).toBeInTheDocument()
		})

		it('should render sortable queue items', () => {
			const mockAudio = createMockAudio()
			render(<Queue audio={mockAudio} />)

			const queueItems = document.querySelectorAll('.queue__item')
			expect(queueItems).toHaveLength(3)

			// Each item should have the sortable structure
			queueItems.forEach((item, index) => {
				expect(item).toHaveClass('queue__item')
				expect(item.querySelector('.queue__item-content')).toBeInTheDocument()
				expect(item.querySelector('button')).toBeInTheDocument()
			})
		})
	})

	describe('Edge Cases', () => {
		it('should handle zero remaining songs correctly', () => {
			const storeAtEnd = {
				...mockPlayerStore,
				currentIndex: 2, // Last song (index 2)
			}
			;(usePlayerStore as any).mockReturnValue(storeAtEnd)

			const mockAudio = createMockAudio()
			render(<Queue audio={mockAudio} />)

			expect(screen.getByText('Queue')).toBeInTheDocument()
			expect(screen.getByText('(0)')).toBeInTheDocument()
		})

		it('should handle removing song when currentIndex is at the end', () => {
			const storeAtEnd = {
				...mockPlayerStore,
				currentIndex: 2, // Last song
			}
			;(usePlayerStore as any).mockReturnValue(storeAtEnd)

			const mockAudio = createMockAudio()
			render(<Queue audio={mockAudio} />)

			const removeButtons = screen.getAllByTitle('Remove from queue')
			fireEvent.click(removeButtons[2]) // Remove last song (current)

			expect(mockPlayerStore.removeFromQueue).toHaveBeenCalledWith(2)
			expect(mockAudio.handlePause).toHaveBeenCalled()
		})

		it('should handle queue with single song', () => {
			const singleSongStore = {
				...mockPlayerStore,
				queue: [mockSongs[0]],
				currentIndex: 0,
			}
			;(usePlayerStore as any).mockReturnValue(singleSongStore)

			const mockAudio = createMockAudio()
			render(<Queue audio={mockAudio} />)

			expect(screen.getByText('Test Song 1')).toBeInTheDocument()
			expect(screen.getByText('Queue')).toBeInTheDocument()
			expect(screen.getByText('(0)')).toBeInTheDocument()
			expect(screen.getByTitle('Clear queue')).toBeInTheDocument()
		})
	})
})
