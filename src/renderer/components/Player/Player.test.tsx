import React from 'react'
import { render } from '@testing-library/react'
import { screen, fireEvent } from '@testing-library/dom'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import '@testing-library/jest-dom'
import Player from './Player'
import { usePlayerStore } from '../../store/player'
import { formatTime } from '../../utils'
import type { Song } from '../../../types/song'

// Mock the player store
vi.mock('../../store/player', () => ({
	usePlayerStore: vi.fn(),
}))

// Mock the formatTime utility
vi.mock('../../utils', () => ({
	formatTime: vi.fn(),
}))

// Mock the Controls component
vi.mock('../Controls/Controls', () => ({
	default: ({ onOpenSettings }: any) => (
		<div data-testid="controls">
			<button onClick={onOpenSettings}>Settings</button>
		</div>
	),
}))

describe('Player Component', () => {
	const createMockAudio = (overrides = {}) => ({
		isPlaying: true,
		currentTime: 60,
		duration: 180,
		playingPath: '/path/to/song.mp3',
		volume: 1,
		setCurrentTime: vi.fn(),
		handlePlay: vi.fn(),
		handlePause: vi.fn(),
		handleResume: vi.fn(),
		handleStop: vi.fn(),
		setVolume: vi.fn(),
		preloadNext: vi.fn(),
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
	]

	const mockPlayerStore = {
		queue: [mockSongs[0]],
		currentIndex: 0,
		setQueue: vi.fn(),
		setCurrentIndex: vi.fn(),
	}

	const mockOnOpenSettings = vi.fn()

	beforeEach(() => {
		vi.clearAllMocks()
			; (usePlayerStore as any).mockReturnValue(mockPlayerStore)
			; (formatTime as any).mockImplementation((time: number) => `${Math.floor(time / 60)}:${(time % 60).toString().padStart(2, '0')}`)
	})

	describe('Empty State', () => {
		it('should render empty state when no song is in queue and nothing is playing', () => {
			const emptyPlayerStore = {
				...mockPlayerStore,
				queue: [],
				currentIndex: 0,
			}
				; (usePlayerStore as any).mockReturnValue(emptyPlayerStore)

			const emptyAudio = createMockAudio({
				isPlaying: false,
				playingPath: null,
			})

			render(<Player audio={emptyAudio} songs={mockSongs} onOpenSettings={mockOnOpenSettings} />)

			expect(screen.getByText('Ready to play')).toBeInTheDocument()
			expect(screen.getByText('Add songs to your queue or let me pick for you')).toBeInTheDocument()
			expect(screen.getByText('Surprise me!')).toBeInTheDocument()
		})

		it('should handle surprise me button click', () => {
			const emptyPlayerStore = {
				...mockPlayerStore,
				queue: [],
				currentIndex: 0,
			}
				; (usePlayerStore as any).mockReturnValue(emptyPlayerStore)

			const emptyAudio = createMockAudio({
				isPlaying: false,
				playingPath: null,
			})

			render(<Player audio={emptyAudio} songs={mockSongs} onOpenSettings={mockOnOpenSettings} />)

			const surpriseButton = screen.getByText('Surprise me!')
			fireEvent.click(surpriseButton)

			expect(mockPlayerStore.setQueue).toHaveBeenCalledWith([expect.any(Object)])
			expect(mockPlayerStore.setCurrentIndex).toHaveBeenCalledWith(0)

		})

		it('should disable surprise me button when no songs available', () => {
			const emptyPlayerStore = {
				...mockPlayerStore,
				queue: [],
				currentIndex: 0,
			}
				; (usePlayerStore as any).mockReturnValue(emptyPlayerStore)

			const emptyAudio = createMockAudio({
				isPlaying: false,
				playingPath: null,
			})

			render(<Player audio={emptyAudio} songs={[]} onOpenSettings={mockOnOpenSettings} />)

			const surpriseButton = screen.getByText('Surprise me!')
			expect(surpriseButton).toBeDisabled()
		})
	})

	describe('Playing State', () => {
		it('should render song information when a song is playing', () => {
			const mockAudio = createMockAudio()
			render(<Player audio={mockAudio} songs={mockSongs} onOpenSettings={mockOnOpenSettings} />)

			expect(screen.getByText('Test Song 1')).toBeInTheDocument()
			expect(screen.getByText('Test Artist 1')).toBeInTheDocument()
			expect(screen.getByText('Test Album 1')).toBeInTheDocument()
		})

		it('should display default cover when no cover is available', () => {
			const mockAudio = createMockAudio()
			render(<Player audio={mockAudio} songs={mockSongs} onOpenSettings={mockOnOpenSettings} />)

			// Check for the default cover container by class name
			const defaultCover = document.querySelector('.player__cover.default')
			expect(defaultCover).toBeInTheDocument()
		})

		it('should display actual cover when available', () => {
			const storeWithCover = {
				...mockPlayerStore,
				queue: [mockSongs[1]], // Song with cover
			}
				; (usePlayerStore as any).mockReturnValue(storeWithCover)

			const mockAudio = createMockAudio()
			render(<Player audio={mockAudio} songs={mockSongs} onOpenSettings={mockOnOpenSettings} />)

			const cover = screen.getByAltText('cover')
			expect(cover).toHaveAttribute('src', '/path/to/cover.jpg')
		})

		it('should display time information', () => {
			const mockAudio = createMockAudio()
			render(<Player audio={mockAudio} songs={mockSongs} onOpenSettings={mockOnOpenSettings} />)

			expect(formatTime).toHaveBeenCalledWith(60) // current time
			expect(formatTime).toHaveBeenCalledWith(180) // duration
		})
	})

	describe('Progress Bar', () => {
		it('should render progress bar with correct values', () => {
			const mockAudio = createMockAudio()
			render(<Player audio={mockAudio} songs={mockSongs} onOpenSettings={mockOnOpenSettings} />)

			const progressBar = screen.getByRole('slider')
			expect(progressBar).toHaveAttribute('min', '0')
			expect(progressBar).toHaveAttribute('max', '180')
			expect(progressBar).toHaveAttribute('value', '60')
		})

		it('should call setCurrentTime when progress bar changes', () => {
			const mockAudio = createMockAudio()
			render(<Player audio={mockAudio} songs={mockSongs} onOpenSettings={mockOnOpenSettings} />)

			const progressBar = screen.getByRole('slider')
			fireEvent.change(progressBar, { target: { value: '90' } })

			expect(mockAudio.setCurrentTime).toHaveBeenCalledWith(90)
		})
	})

	describe('Fallback Behavior', () => {
		it('should show basic info when song is not in library but something is playing', () => {
			const storeWithoutSong = {
				...mockPlayerStore,
				queue: [],
				currentIndex: 0,
			}
				; (usePlayerStore as any).mockReturnValue(storeWithoutSong)

			const audioWithUnknownSong = createMockAudio({
				isPlaying: true,
				playingPath: '/unknown/path/song.mp3',
			})

			render(<Player audio={audioWithUnknownSong} songs={[]} onOpenSettings={mockOnOpenSettings} />)

			expect(screen.getByText('song.mp3')).toBeInTheDocument()
			// Verify both artist and album show Unknown
			const unknownElements = screen.getAllByText('Unknown')
			expect(unknownElements).toHaveLength(2) // artist and album
		})

		it('should find song in library when not in queue but playing', () => {
			const storeWithoutSong = {
				...mockPlayerStore,
				queue: [],
				currentIndex: 0,
			}
				; (usePlayerStore as any).mockReturnValue(storeWithoutSong)

			const audioWithKnownSong = createMockAudio({
				isPlaying: true,
				playingPath: '/path/to/song2.mp3',
			})

			render(<Player audio={audioWithKnownSong} songs={mockSongs} onOpenSettings={mockOnOpenSettings} />)

			expect(screen.getByText('Test Song 2')).toBeInTheDocument()
			expect(screen.getByText('Test Artist 2')).toBeInTheDocument()
		})
	})

	describe('Controls Integration', () => {
		it('should render Controls component', () => {
			const mockAudio = createMockAudio()
			render(<Player audio={mockAudio} songs={mockSongs} onOpenSettings={mockOnOpenSettings} />)

			expect(screen.getByTestId('controls')).toBeInTheDocument()
		})

		it('should pass onOpenSettings to Controls', () => {
			const mockAudio = createMockAudio()
			render(<Player audio={mockAudio} songs={mockSongs} onOpenSettings={mockOnOpenSettings} />)

			const settingsButton = screen.getByText('Settings')
			fireEvent.click(settingsButton)

			expect(mockOnOpenSettings).toHaveBeenCalled()
		})
	})

	describe('Progress Percentage Calculation', () => {
		it('should calculate progress percentage correctly', () => {
			const mockAudio = createMockAudio()
			render(<Player audio={mockAudio} songs={mockSongs} onOpenSettings={mockOnOpenSettings} />)

			const progressBar = screen.getByRole('slider')
			const style = progressBar.style.getPropertyValue('--progress-fill')

			// 60 seconds out of 180 seconds = 33.33%
			expect(style).toContain('33.33')
		})

		it('should handle zero duration gracefully', () => {
			const audioWithZeroDuration = createMockAudio({
				duration: 0,
			})

			render(<Player audio={audioWithZeroDuration} songs={mockSongs} onOpenSettings={mockOnOpenSettings} />)

			const progressBar = screen.getByRole('slider')
			const style = progressBar.style.getPropertyValue('--progress-fill')

			expect(style).toBe('0%')
		})
	})
})
