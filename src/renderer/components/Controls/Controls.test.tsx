import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import '@testing-library/jest-dom'
import Controls from './Controls'
import { usePlayerStore } from '../../store/player'
import type { Song } from '../../../types/song'

// Mock the player store
vi.mock('../../store/player', () => ({
	usePlayerStore: vi.fn(),
}))

describe('Controls Component', () => {
	const createMockAudio = (overrides = {}) => ({
		audioRef: { current: null },
		audioUrl: null,
		isPlaying: true,
		pendingPlay: false,
		currentTime: 60,
		duration: 180,
		playingPath: '/path/to/song.mp3',
		volume: 0.8,
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
		setIsPlaying: vi.fn(),
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
		currentIndex: 1, // Middle song by default
		setCurrentIndex: vi.fn(),
		cleanQueueHistory: vi.fn(),
		repeat: false,
		setRepeat: vi.fn(),
		shuffle: false,
		setShuffle: vi.fn(),
		setIsPlaying: vi.fn(),
		shuffleQueue: vi.fn(),
		toggleShuffle: vi.fn(),
	}

	const mockOnOpenSettings = vi.fn()

	beforeEach(() => {
		vi.clearAllMocks()
			; (usePlayerStore as any).mockReturnValue(mockPlayerStore)
	})

	describe('Playback Controls', () => {
		it('should render all playback control buttons', () => {
			const mockAudio = createMockAudio()
			render(<Controls audio={mockAudio} onOpenSettings={mockOnOpenSettings} />)

			expect(screen.getByTitle('Shuffle queue')).toBeInTheDocument()
			expect(screen.getByTitle('Previous song')).toBeInTheDocument()
			expect(screen.getByTitle('Play')).toBeInTheDocument()
			expect(screen.getByTitle('Next song')).toBeInTheDocument()
			expect(screen.getByTitle('Repeat queue')).toBeInTheDocument()
		})

		it('should show pause button when playing', () => {
			const playingStore = {
				...mockPlayerStore,
				isPlaying: true,
			}
				; (usePlayerStore as any).mockReturnValue(playingStore)

			const mockAudio = createMockAudio()
			render(<Controls audio={mockAudio} onOpenSettings={mockOnOpenSettings} />)

			expect(screen.getByTitle('Pause')).toBeInTheDocument()
			expect(screen.queryByTitle('Play')).not.toBeInTheDocument()
		})

		it('should show play button when not playing', () => {
			const pausedStore = {
				...mockPlayerStore,
				isPlaying: false,
			}
				; (usePlayerStore as any).mockReturnValue(pausedStore)

			const mockAudio = createMockAudio()
			render(<Controls audio={mockAudio} onOpenSettings={mockOnOpenSettings} />)

			expect(screen.getByTitle('Play')).toBeInTheDocument()
			expect(screen.queryByTitle('Pause')).not.toBeInTheDocument()
		})

		it('should handle pause button click', () => {
			const playingStore = {
				...mockPlayerStore,
				isPlaying: true,
			}
				; (usePlayerStore as any).mockReturnValue(playingStore)

			const mockAudio = createMockAudio()
			render(<Controls audio={mockAudio} onOpenSettings={mockOnOpenSettings} />)

			const pauseButton = screen.getByTitle('Pause')
			fireEvent.click(pauseButton)

			// Should toggle isPlaying via store
			expect(mockPlayerStore.setIsPlaying).toHaveBeenCalledWith(false)
		})

		it('should handle play button click', () => {
			const pausedStore = {
				...mockPlayerStore,
				isPlaying: false,
			}
				; (usePlayerStore as any).mockReturnValue(pausedStore)

			const mockAudio = createMockAudio()
			render(<Controls audio={mockAudio} onOpenSettings={mockOnOpenSettings} />)

			const playButton = screen.getByTitle('Play')
			fireEvent.click(playButton)

			// Should toggle isPlaying via store
			expect(mockPlayerStore.setIsPlaying).toHaveBeenCalledWith(true)
		})
	})

	describe('Navigation Controls', () => {
		it('should handle previous song click', () => {
			const mockAudio = createMockAudio()
			render(<Controls audio={mockAudio} onOpenSettings={mockOnOpenSettings} />)

			const prevButton = screen.getByTitle('Previous song')
			fireEvent.click(prevButton)

			expect(mockPlayerStore.setCurrentIndex).toHaveBeenCalledWith(0)
			expect(mockPlayerStore.cleanQueueHistory).toHaveBeenCalled()
			// Should enable playing via store
			expect(mockPlayerStore.setIsPlaying).toHaveBeenCalledWith(true)
		})

		it('should handle next song click', () => {
			const mockAudio = createMockAudio()
			render(<Controls audio={mockAudio} onOpenSettings={mockOnOpenSettings} />)

			const nextButton = screen.getByTitle('Next song')
			fireEvent.click(nextButton)

			expect(mockPlayerStore.setCurrentIndex).toHaveBeenCalledWith(2)
			expect(mockPlayerStore.cleanQueueHistory).toHaveBeenCalled()
			// Should enable playing via store
			expect(mockPlayerStore.setIsPlaying).toHaveBeenCalledWith(true)
		})

		it('should disable previous button when at first song', () => {
			const storeAtFirst = {
				...mockPlayerStore,
				currentIndex: 0,
			}
				; (usePlayerStore as any).mockReturnValue(storeAtFirst)

			const mockAudio = createMockAudio()
			render(<Controls audio={mockAudio} onOpenSettings={mockOnOpenSettings} />)

			const prevButton = screen.getByTitle('Previous song')
			expect(prevButton).toBeDisabled()
		})

		it('should disable next button when at last song', () => {
			const storeAtLast = {
				...mockPlayerStore,
				currentIndex: 2, // Last song index
			}
				; (usePlayerStore as any).mockReturnValue(storeAtLast)

			const mockAudio = createMockAudio()
			render(<Controls audio={mockAudio} onOpenSettings={mockOnOpenSettings} />)

			const nextButton = screen.getByTitle('Next song')
			expect(nextButton).toBeDisabled()
		})

		it('should disable navigation when currentIndex is -1', () => {
			const storeWithNoIndex = {
				...mockPlayerStore,
				currentIndex: -1,
			}
				; (usePlayerStore as any).mockReturnValue(storeWithNoIndex)

			const mockAudio = createMockAudio()
			render(<Controls audio={mockAudio} onOpenSettings={mockOnOpenSettings} />)

			expect(screen.getByTitle('Play')).toBeDisabled()
			expect(screen.getByTitle('Next song')).toBeDisabled()
		})
	})

	describe('Toggle Controls', () => {
		it('should handle shuffle toggle', () => {
			const mockAudio = createMockAudio()
			render(<Controls audio={mockAudio} onOpenSettings={mockOnOpenSettings} />)

			const shuffleButton = screen.getByTitle('Shuffle queue')
			fireEvent.click(shuffleButton)

			expect(mockPlayerStore.shuffleQueue).toHaveBeenCalled()
		})

		it('should handle repeat toggle', () => {
			const mockAudio = createMockAudio()
			render(<Controls audio={mockAudio} onOpenSettings={mockOnOpenSettings} />)

			const repeatButton = screen.getByTitle('Repeat queue')
			fireEvent.click(repeatButton)

			expect(mockPlayerStore.setRepeat).toHaveBeenCalledWith(true)
		})

		// Shuffle button doesn't have visual active state in current implementation
		/*
		it('should show active state for shuffle when enabled', () => {
			const storeWithShuffle = {
				...mockPlayerStore,
				shuffle: true,
			}
			;(usePlayerStore as any).mockReturnValue(storeWithShuffle)

			const mockAudio = createMockAudio()
			render(<Controls audio={mockAudio} onOpenSettings={mockOnOpenSettings} />)

			const shuffleButton = screen.getByTitle('Shuffle queue')
			expect(shuffleButton).toHaveClass('active')
		})
		*/

		it('should show active state for repeat when enabled', () => {
			const storeWithRepeat = {
				...mockPlayerStore,
				repeat: true,
			}
				; (usePlayerStore as any).mockReturnValue(storeWithRepeat)

			const mockAudio = createMockAudio()
			render(<Controls audio={mockAudio} onOpenSettings={mockOnOpenSettings} />)

			const repeatButton = screen.getByTitle('Repeat queue')
			expect(repeatButton).toHaveClass('active')
		})

		// Shuffle is an action (shuffleQueue), not a toggle state currently
		/*
		it('should toggle shuffle off when already enabled', () => {
			const storeWithShuffle = {
				...mockPlayerStore,
				shuffle: true,
			}
			;(usePlayerStore as any).mockReturnValue(storeWithShuffle)

			const mockAudio = createMockAudio()
			render(<Controls audio={mockAudio} onOpenSettings={mockOnOpenSettings} />)

			const shuffleButton = screen.getByTitle('Shuffle queue')
			fireEvent.click(shuffleButton)

			expect(mockPlayerStore.setShuffle).toHaveBeenCalledWith(false)
		})
		*/

		it('should toggle repeat off when already enabled', () => {
			const storeWithRepeat = {
				...mockPlayerStore,
				repeat: true,
			}
				; (usePlayerStore as any).mockReturnValue(storeWithRepeat)

			const mockAudio = createMockAudio()
			render(<Controls audio={mockAudio} onOpenSettings={mockOnOpenSettings} />)

			const repeatButton = screen.getByTitle('Repeat queue')
			fireEvent.click(repeatButton)

			expect(mockPlayerStore.setRepeat).toHaveBeenCalledWith(false)
		})
	})

	describe('Volume Control', () => {
		it('should render volume knob', () => {
			const mockAudio = createMockAudio({ volume: 0.8 })
			render(<Controls audio={mockAudio} onOpenSettings={mockOnOpenSettings} />)

			const volumeKnob = document.querySelector('.knob__container')
			expect(volumeKnob).toBeInTheDocument()
		})

		it('should display correct volume percentage in title', () => {
			const mockAudio = createMockAudio({ volume: 0.75 })
			render(<Controls audio={mockAudio} onOpenSettings={mockOnOpenSettings} />)

			const volumeKnob = screen.getByTitle('Volume: 75%')
			expect(volumeKnob).toBeInTheDocument()
		})

		it('should set correct rotation angle for volume indicator', () => {
			const mockAudio = createMockAudio({ volume: 0.5 })
			render(<Controls audio={mockAudio} onOpenSettings={mockOnOpenSettings} />)

			const indicator = document.querySelector('.knob__indicator')
			// volume 0.5 * 240 - 120 = 0 degrees
			expect(indicator).toHaveStyle('transform: rotate(0deg)')
		})

		it('should handle wheel scroll up to increase volume', () => {
			const mockAudio = createMockAudio({ volume: 0.5, setVolume: vi.fn() })
			render(<Controls audio={mockAudio} onOpenSettings={mockOnOpenSettings} />)

			const volumeKnob = document.querySelector('.knob__outer')!
			fireEvent.wheel(volumeKnob, { deltaY: -100 })

			expect(mockAudio.setVolume).toHaveBeenCalled()
			// Check if the function was called with a function that increases volume
			const setVolumeCall = mockAudio.setVolume.mock.calls[0][0]
			expect(setVolumeCall(0.5)).toBe(0.55) // 0.5 + 0.05
		})

		it('should handle wheel scroll down to decrease volume', () => {
			const mockAudio = createMockAudio({ volume: 0.5, setVolume: vi.fn() })
			render(<Controls audio={mockAudio} onOpenSettings={mockOnOpenSettings} />)

			const volumeKnob = document.querySelector('.knob__outer')!
			fireEvent.wheel(volumeKnob, { deltaY: 100 })

			expect(mockAudio.setVolume).toHaveBeenCalled()
			// Check if the function was called with a function that decreases volume
			const setVolumeCall = mockAudio.setVolume.mock.calls[0][0]
			expect(setVolumeCall(0.5)).toBe(0.45) // 0.5 - 0.05
		})

		it('should handle wheel event on volume knob', () => {
			const mockAudio = createMockAudio()
			render(<Controls audio={mockAudio} onOpenSettings={mockOnOpenSettings} />)

			const volumeKnob = document.querySelector('.knob__outer')!

			// Just test that the wheel event can be fired without errors
			fireEvent.wheel(volumeKnob, { deltaY: 100 })

			// Volume change should be called
			expect(mockAudio.setVolume).toHaveBeenCalled()
		})

		it('should not allow volume to exceed 1', () => {
			const mockAudio = createMockAudio({ volume: 1, setVolume: vi.fn() })
			render(<Controls audio={mockAudio} onOpenSettings={mockOnOpenSettings} />)

			const volumeKnob = document.querySelector('.knob__outer')!
			fireEvent.wheel(volumeKnob, { deltaY: -100 })

			expect(mockAudio.setVolume).toHaveBeenCalled()
			const setVolumeCall = mockAudio.setVolume.mock.calls[0][0]
			expect(setVolumeCall(1)).toBe(1) // Should stay at 1
		})

		it('should not allow volume to go below 0', () => {
			const mockAudio = createMockAudio({ volume: 0, setVolume: vi.fn() })
			render(<Controls audio={mockAudio} onOpenSettings={mockOnOpenSettings} />)

			const volumeKnob = document.querySelector('.knob__outer')!
			fireEvent.wheel(volumeKnob, { deltaY: 100 })

			expect(mockAudio.setVolume).toHaveBeenCalled()
			const setVolumeCall = mockAudio.setVolume.mock.calls[0][0]
			expect(setVolumeCall(0)).toBe(0) // Should stay at 0
		})
	})

	describe('Edge Cases', () => {
		it('should handle empty queue', () => {
			const emptyStore = {
				...mockPlayerStore,
				queue: [],
				currentIndex: -1,
			}
				; (usePlayerStore as any).mockReturnValue(emptyStore)

			const mockAudio = createMockAudio({ isPlaying: false })
			render(<Controls audio={mockAudio} onOpenSettings={mockOnOpenSettings} />)

			expect(screen.getByTitle('Play')).toBeDisabled()
			expect(screen.getByTitle('Next song')).toBeDisabled()
		})

		it('should handle single song in queue', () => {
			const singleSongStore = {
				...mockPlayerStore,
				queue: [mockSongs[0]],
				currentIndex: 0,
			}
				; (usePlayerStore as any).mockReturnValue(singleSongStore)

			const mockAudio = createMockAudio()
			render(<Controls audio={mockAudio} onOpenSettings={mockOnOpenSettings} />)

			expect(screen.getByTitle('Previous song')).toBeDisabled()
			expect(screen.getByTitle('Next song')).toBeDisabled()
		})

		it('should handle play button when no current song', () => {
			const storeWithNoCurrentSong = {
				...mockPlayerStore,
				queue: mockSongs,
				currentIndex: -1,
			}
				; (usePlayerStore as any).mockReturnValue(storeWithNoCurrentSong)

			const mockAudio = createMockAudio({ isPlaying: false })
			render(<Controls audio={mockAudio} onOpenSettings={mockOnOpenSettings} />)

			const playButton = screen.getByTitle('Play')
			fireEvent.click(playButton)

			// Should not call handlePlay when no current song
			expect(mockAudio.handlePlay).not.toHaveBeenCalled()
		})

		it('should handle volume at extreme values', () => {
			const mockAudio = createMockAudio({ volume: 0 })
			render(<Controls audio={mockAudio} onOpenSettings={mockOnOpenSettings} />)

			const indicator = document.querySelector('.knob__indicator')
			// volume 0 * 240 - 120 = -120 degrees
			expect(indicator).toHaveStyle('transform: rotate(-120deg)')
		})

		it('should handle volume at maximum', () => {
			const mockAudio = createMockAudio({ volume: 1 })
			render(<Controls audio={mockAudio} onOpenSettings={mockOnOpenSettings} />)

			const indicator = document.querySelector('.knob__indicator')
			// volume 1 * 240 - 120 = 120 degrees
			expect(indicator).toHaveStyle('transform: rotate(120deg)')
		})
	})
})

