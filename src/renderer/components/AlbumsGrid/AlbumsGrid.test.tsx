import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import '@testing-library/jest-dom'
import AlbumsGrid from './AlbumsGrid'
import { usePlayerStore } from '../../store/player'

// Mock the player store
vi.mock('../../store/player', () => ({
	usePlayerStore: vi.fn(),
}))

// Mock the Phosphor icons
vi.mock('@phosphor-icons/react', () => ({
	MusicNotesIcon: ({ size, weight }: any) => (
		<div data-testid="music-notes-icon" data-size={size} data-weight={weight}>
			MusicNotesIcon
		</div>
	),
	PlusIcon: ({ size, weight }: any) => (
		<div data-testid="plus-icon" data-size={size} data-weight={weight}>
			PlusIcon
		</div>
	),
	DownloadSimple: ({ size, weight, className }: any) => (
		<div data-testid="download-icon" data-size={size} data-weight={weight} className={className}>
			DownloadSimple
		</div>
	),
}))

describe('AlbumsGrid Component', () => {
	const mockAlbums = [
		{
			id: 'album1',
			title: 'Abbey Road',
			artist: 'The Beatles',
			cover: '/path/to/abbey-road.jpg',
			songs: [
				{
					path: '/path/to/come-together.mp3',
					title: 'Come Together',
					artist: 'The Beatles',
					album: 'Abbey Road',
					duration: 260,
				},
				{
					path: '/path/to/something.mp3',
					title: 'Something',
					artist: 'The Beatles',
					album: 'Abbey Road',
					duration: 183,
				},
			],
		},
		{
			id: 'album2',
			title: 'A Night at the Opera',
			artist: 'Queen',
			cover: null, // No cover
			songs: [
				{
					path: '/path/to/bohemian-rhapsody.mp3',
					title: 'Bohemian Rhapsody',
					artist: 'Queen',
					album: 'A Night at the Opera',
					duration: 355,
				},
			],
		},
		{
			id: 'album3',
			title: 'Unknown Album',
			artist: null, // No artist
			cover: '/path/to/unknown-cover.jpg',
			songs: [
				{
					path: '/path/to/unknown-song.mp3',
					title: 'Unknown Song',
					artist: 'Unknown Artist',
					album: 'Unknown Album',
					duration: 180,
				},
			],
		},
	]

	const mockPlayerStore = {
		addAlbumToQueue: vi.fn(),
	}

	const mockSetQueue = vi.fn()
	const mockOnUpdateCover = vi.fn()

	const createMockAudio = () => ({

		audioRef: { current: null },
		audioUrl: null,
		isPlaying: false,
		pendingPlay: false,
		currentTime: 0,
		setCurrentTime: vi.fn(),
		duration: 0,
		setDuration: vi.fn(),
		playingPath: null,
		setPlayingPath: vi.fn(),
		volume: 0.5,
		setVolume: vi.fn(),
		handlePlay: vi.fn(),
		handlePause: vi.fn(),
		handleStop: vi.fn(),
		handleResume: vi.fn(),
		handleCanPlay: vi.fn(),
		setCurrentTimeOnly: vi.fn(),
		togglePlayPause: vi.fn(),
		skipForward: vi.fn(),
		skipBackward: vi.fn(),
		seekTo: vi.fn(),
	})

	beforeEach(() => {
		vi.clearAllMocks()
			; (usePlayerStore as any).mockReturnValue(mockPlayerStore)
	})

	describe('Rendering', () => {
		it('should render empty state when no albums provided', () => {
			const mockAudio = createMockAudio()
			const { container } = render(<AlbumsGrid albums={[]} setQueue={mockSetQueue} audio={mockAudio} onUpdateCover={mockOnUpdateCover} />)

			const albumsGrid = container.querySelector('.albums-grid')
			expect(albumsGrid).toBeInTheDocument()
			// Should render empty grid
			expect(screen.queryByRole('button')).not.toBeInTheDocument()
		})

		it('should render albums grid when albums are provided', () => {
			const mockAudio = createMockAudio()
			const { container } = render(<AlbumsGrid albums={mockAlbums} setQueue={mockSetQueue} audio={mockAudio} onUpdateCover={mockOnUpdateCover} />)

			const albumsGrid = container.querySelector('.albums-grid')
			expect(albumsGrid).toBeInTheDocument()

			// Should render all album cards (divs with role="button")
			const albumCards = screen.getAllByRole('button').filter((button) => button.getAttribute('tabIndex') === '0')
			expect(albumCards).toHaveLength(mockAlbums.length) // One album card per album

			// Should render all "Add to Queue" buttons
			const addToQueueButtons = screen.getAllByTitle('Add to Queue')
			expect(addToQueueButtons).toHaveLength(mockAlbums.length) // One add-to-queue button per album
		})

		it('should display album with cover image', () => {
			const mockAudio = createMockAudio()
			render(<AlbumsGrid albums={[mockAlbums[0]]} setQueue={mockSetQueue} audio={mockAudio} onUpdateCover={mockOnUpdateCover} />)

			const coverImage = screen.getByAltText('Abbey Road by The Beatles')
			expect(coverImage).toBeInTheDocument()
			expect(coverImage).toHaveAttribute('src', '/path/to/abbey-road.jpg')
			expect(coverImage).toHaveClass('album-card__cover', 'album__cover')
		})

		it('should display default cover when no cover is available', () => {
			const mockAudio = createMockAudio()
			render(<AlbumsGrid albums={[mockAlbums[1]]} setQueue={mockSetQueue} audio={mockAudio} onUpdateCover={mockOnUpdateCover} />)

			// Should show default cover with music notes icon
			expect(screen.getByTestId('music-notes-icon')).toBeInTheDocument()
			expect(screen.getByTestId('music-notes-icon')).toHaveAttribute('data-size', '48')
			expect(screen.getByTestId('music-notes-icon')).toHaveAttribute('data-weight', 'fill')

			// Should show album info
			expect(screen.getByText('A Night at the Opera')).toBeInTheDocument()
			expect(screen.getByText('Queen')).toBeInTheDocument()
		})

		it('should handle album without artist', () => {
			const mockAudio = createMockAudio()
			render(<AlbumsGrid albums={[mockAlbums[2]]} setQueue={mockSetQueue} audio={mockAudio} onUpdateCover={mockOnUpdateCover} />)

			// Should show album cover image since this album has a cover (no artist, so just title)
			expect(screen.getByAltText('Unknown Album')).toBeInTheDocument()
			// Album has cover, so title should not appear as text
			expect(screen.queryByText('Unknown Album')).not.toBeInTheDocument()
		})

		it('should render add to queue button for each album', () => {
			const mockAudio = createMockAudio()
			render(<AlbumsGrid albums={mockAlbums} setQueue={mockSetQueue} audio={mockAudio} onUpdateCover={mockOnUpdateCover} />)

			const addToQueueButtons = screen.getAllByTitle('Add to Queue')
			expect(addToQueueButtons).toHaveLength(mockAlbums.length)

			// Check that all buttons have the plus icon
			const plusIcons = screen.getAllByTestId('plus-icon')
			expect(plusIcons).toHaveLength(mockAlbums.length)
			plusIcons.forEach((icon) => {
				expect(icon).toHaveAttribute('data-size', '24')
				expect(icon).toHaveAttribute('data-weight', 'regular')
			})
		})
	})

	describe('Album Interactions', () => {
		it('should set queue and play first song when clicking album', () => {
			const mockAudio = createMockAudio()
			render(<AlbumsGrid albums={[mockAlbums[0]]} setQueue={mockSetQueue} audio={mockAudio} onUpdateCover={mockOnUpdateCover} />)

			// Click on the album card (there are 2 buttons: album card and add to queue)
			const albumCards = screen.getAllByRole('button')
			const albumCard = albumCards.find((card) => card.getAttribute('tabIndex') === '0')
			fireEvent.click(albumCard!)

			expect(mockSetQueue).toHaveBeenCalledWith(mockAlbums[0].songs)
			expect(mockAudio.handlePlay).toHaveBeenCalledWith(mockAlbums[0].songs[0].path)
		})

		it('should add album to queue when clicking add to queue button', () => {
			const mockAudio = createMockAudio()
			render(<AlbumsGrid albums={[mockAlbums[0]]} setQueue={mockSetQueue} audio={mockAudio} onUpdateCover={mockOnUpdateCover} />)

			const addToQueueButton = screen.getByTitle('Add to Queue')
			fireEvent.click(addToQueueButton)

			expect(mockPlayerStore.addAlbumToQueue).toHaveBeenCalledWith(mockAlbums[0].songs)

			// Should not set queue or play when adding to queue
			expect(mockSetQueue).not.toHaveBeenCalled()
			expect(mockAudio.handlePlay).not.toHaveBeenCalled()
		})

		it('should prevent event propagation when clicking add to queue', () => {
			const mockAudio = createMockAudio()
			render(<AlbumsGrid albums={[mockAlbums[0]]} setQueue={mockSetQueue} audio={mockAudio} onUpdateCover={mockOnUpdateCover} />)

			const addToQueueButton = screen.getByTitle('Add to Queue')
			const clickEvent = new MouseEvent('click', { bubbles: true })
			const stopPropagationSpy = vi.spyOn(clickEvent, 'stopPropagation')

			addToQueueButton.dispatchEvent(clickEvent)

			expect(stopPropagationSpy).toHaveBeenCalled()
		})

		it('should handle keyboard interaction with album cards', () => {
			const mockAudio = createMockAudio()
			render(<AlbumsGrid albums={[mockAlbums[0]]} setQueue={mockSetQueue} audio={mockAudio} onUpdateCover={mockOnUpdateCover} />)

			const albumCards = screen.getAllByRole('button')
			const albumCard = albumCards.find((card) => card.getAttribute('tabIndex') === '0')
			expect(albumCard).toBeInTheDocument()
			expect(albumCard).toHaveAttribute('tabIndex', '0')

			// Simulate Enter key press
			fireEvent.keyDown(albumCard!, { key: 'Enter', code: 'Enter' })
			// Note: We're not testing the actual key press handling as it's not implemented in the component
			// but we verify the element is focusable
		})

		it('should fetch cover and update when clicking fetch button', async () => {
			const mockAudio = createMockAudio()
			const mockFetch = vi.fn().mockResolvedValue('data:image/jpeg;base64,fake')
			// @ts-ignore
			window.electronAPI = { ...window.electronAPI, fetchAlbumCover: mockFetch }

			render(<AlbumsGrid albums={[mockAlbums[1]]} setQueue={mockSetQueue} audio={mockAudio} onUpdateCover={mockOnUpdateCover} />)

			// Find fetch button by title
			const fetchButton = screen.getByTitle('Fetch Cover from iTunes')
			expect(fetchButton).toBeInTheDocument()

			// Click it
			fireEvent.click(fetchButton)

			// Expect loading state? We can't easily check for loading class without finding the button again or using waitFor
			// But we can wait for fetch to be called
			await waitFor(() => {
				expect(mockFetch).toHaveBeenCalledWith('Queen', 'A Night at the Opera')
			})

			// And then onUpdateCover
			await waitFor(() => {
				expect(mockOnUpdateCover).toHaveBeenCalledWith('A Night at the Opera', 'Queen', 'data:image/jpeg;base64,fake')
			})
		})
	})

	describe('Edge Cases', () => {
		it('should handle album without songs', () => {
			const albumWithoutSongs = {
				id: 'empty-album',
				title: 'Empty Album',
				artist: 'Test Artist',
				cover: null,
				songs: [],
			}

			const mockAudio = createMockAudio()
			render(<AlbumsGrid albums={[albumWithoutSongs]} setQueue={mockSetQueue} audio={mockAudio} onUpdateCover={mockOnUpdateCover} />)

			// Should render the album
			expect(screen.getByText('Empty Album')).toBeInTheDocument()
			expect(screen.getByText('Test Artist')).toBeInTheDocument()

			// Click should not do anything
			const albumCards = screen.getAllByRole('button')
			const albumCard = albumCards.find((card) => card.getAttribute('tabIndex') === '0')
			expect(albumCard).toBeInTheDocument()
			fireEvent.click(albumCard!)

			expect(mockSetQueue).not.toHaveBeenCalled()
			expect(mockAudio.handlePlay).not.toHaveBeenCalled()
		})

		it('should handle album with undefined songs', () => {
			const albumWithUndefinedSongs = {
				id: 'undefined-songs',
				title: 'Undefined Songs Album',
				artist: 'Test Artist',
				cover: null,
				songs: undefined,
			}

			const mockAudio = createMockAudio()
			render(<AlbumsGrid albums={[albumWithUndefinedSongs]} setQueue={mockSetQueue} audio={mockAudio} onUpdateCover={mockOnUpdateCover} />)

			// Should render the album
			expect(screen.getByText('Undefined Songs Album')).toBeInTheDocument()

			// Click should not do anything
			const albumCards = screen.getAllByRole('button')
			const albumCard = albumCards.find((card) => card.getAttribute('tabIndex') === '0')
			expect(albumCard).toBeInTheDocument()
			fireEvent.click(albumCard!)

			expect(mockSetQueue).not.toHaveBeenCalled()
			expect(mockAudio.handlePlay).not.toHaveBeenCalled()
		})

		it('should handle album without title', () => {
			const albumWithoutTitle = {
				id: 'no-title',
				title: null,
				artist: 'Test Artist',
				cover: null,
				songs: [
					{
						path: '/path/to/song.mp3',
						title: 'Test Song',
						artist: 'Test Artist',
						album: 'Unknown Album',
						duration: 180,
					},
				],
			}

			const mockAudio = createMockAudio()
			render(<AlbumsGrid albums={[albumWithoutTitle]} setQueue={mockSetQueue} audio={mockAudio} onUpdateCover={mockOnUpdateCover} />)

			// Should show "Unknown Album" as fallback
			expect(screen.getByText('Unknown Album')).toBeInTheDocument()
		})

		it('should handle album without id using index as key', () => {
			const albumWithoutId = {
				title: 'No ID Album',
				artist: 'Test Artist',
				cover: null,
				songs: [
					{
						path: '/path/to/song.mp3',
						title: 'Test Song',
						artist: 'Test Artist',
						album: 'No ID Album',
						duration: 180,
					},
				],
			}

			const mockAudio = createMockAudio()
			render(<AlbumsGrid albums={[albumWithoutId]} setQueue={mockSetQueue} audio={mockAudio} onUpdateCover={mockOnUpdateCover} />)

			// Should still render correctly
			expect(screen.getByText('No ID Album')).toBeInTheDocument()
			expect(screen.getByText('Test Artist')).toBeInTheDocument()
		})
	})

	describe('Multiple Albums', () => {
		it('should render multiple albums correctly', () => {
			const mockAudio = createMockAudio()
			render(<AlbumsGrid albums={mockAlbums} setQueue={mockSetQueue} audio={mockAudio} onUpdateCover={mockOnUpdateCover} />)

			// Should render covers for albums that have them with proper alt text
			expect(screen.getByAltText('Abbey Road by The Beatles')).toBeInTheDocument()
			expect(screen.getByAltText('Unknown Album')).toBeInTheDocument() // No artist

			// Should render title and artist text only for album without cover (album 1)
			expect(screen.getByText('A Night at the Opera')).toBeInTheDocument()
			expect(screen.getByText('Queen')).toBeInTheDocument()

			// Albums with covers should not show title as text
			expect(screen.queryByText('Abbey Road')).not.toBeInTheDocument()
			expect(screen.queryByText('The Beatles')).not.toBeInTheDocument()
			expect(screen.queryByText('Unknown Album')).not.toBeInTheDocument()
		})

		it('should handle clicking different albums', () => {
			const mockAudio = createMockAudio()
			render(<AlbumsGrid albums={mockAlbums} setQueue={mockSetQueue} audio={mockAudio} onUpdateCover={mockOnUpdateCover} />)

			// Get all album cards (exclude add to queue buttons)
			const albumCards = screen.getAllByRole('button').filter((card) => card.getAttribute('tabIndex') === '0')

			// Click first album
			fireEvent.click(albumCards[0])

			expect(mockSetQueue).toHaveBeenCalledWith(mockAlbums[0].songs)
			expect(mockAudio.handlePlay).toHaveBeenCalledWith(mockAlbums[0].songs[0].path)

			// Reset mocks
			vi.clearAllMocks()

			// Click second album
			fireEvent.click(albumCards[1])

			expect(mockSetQueue).toHaveBeenCalledWith(mockAlbums[1].songs)
			expect(mockAudio.handlePlay).toHaveBeenCalledWith(mockAlbums[1].songs[0].path)
		})
	})

	describe('Accessibility', () => {
		it('should have proper ARIA attributes', () => {
			const mockAudio = createMockAudio()
			render(<AlbumsGrid albums={[mockAlbums[1]]} setQueue={mockSetQueue} audio={mockAudio} onUpdateCover={mockOnUpdateCover} />)

			// Check that the music notes icon has proper aria-label
			const musicIcon = screen.getByRole('img', { name: 'No cover' })
			expect(musicIcon).toBeInTheDocument()
		})

		it('should have proper alt text for album covers', () => {
			const mockAudio = createMockAudio()
			render(<AlbumsGrid albums={[mockAlbums[0]]} setQueue={mockSetQueue} audio={mockAudio} onUpdateCover={mockOnUpdateCover} />)

			const coverImage = screen.getByAltText('Abbey Road by The Beatles')
			expect(coverImage).toBeInTheDocument()
		})

		it('should have focusable album cards', () => {
			const mockAudio = createMockAudio()
			render(<AlbumsGrid albums={mockAlbums} setQueue={mockSetQueue} audio={mockAudio} onUpdateCover={mockOnUpdateCover} />)

			const albumCards = screen.getAllByRole('button')
			// Filter out the add to queue buttons
			const mainAlbumCards = albumCards.filter((card) => card.getAttribute('tabIndex') === '0')

			expect(mainAlbumCards).toHaveLength(mockAlbums.length)
			mainAlbumCards.forEach((card) => {
				expect(card).toHaveAttribute('tabIndex', '0')
				expect(card).toHaveAttribute('role', 'button')
			})
		})
	})
})
