import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import '@testing-library/jest-dom'
import SongsList from './SongsList'
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

// Mock SongsTable component to make testing simpler
vi.mock('../SongsTable/SongsTable', () => ({
	default: ({ songs, columns, onSort, onDoubleClick, onRightClick }: any) => (
		<div data-testid="songs-table">
			<div data-testid="songs-count">{songs.length}</div>
			{songs.map((song: any, index: number) => (
				<div key={song.path} data-testid={`song-item-${index}`} onDoubleClick={() => onDoubleClick?.(song)} onContextMenu={(e) => onRightClick?.(song, e)}>
					<span data-testid={`song-title-${index}`}>{song.title}</span>
					<span data-testid={`song-artist-${index}`}>{song.artist}</span>
					<span data-testid={`song-album-${index}`}>{song.album}</span>
				</div>
			))}
			{columns.map((col: any) => (
				<button key={col.key} data-testid={`sort-${col.key}`} onClick={() => onSort?.(col.key)}>
					Sort by {col.key}
				</button>
			))}
		</div>
	),
}))

describe('SongsList Component', () => {
	const mockSongs: Song[] = [
		{
			path: '/path/to/song1.mp3',
			title: 'Yesterday',
			artist: 'The Beatles',
			album: 'Help!',
			duration: 125,
			cover: null,
			genre: 'Rock',
			year: 1965,
			track: '1',
		},
		{
			path: '/path/to/song2.mp3',
			title: 'Bohemian Rhapsody',
			artist: 'Queen',
			album: 'A Night at the Opera',
			duration: 355,
			cover: '/path/to/cover2.jpg',
			genre: 'Rock',
			year: 1975,
			track: '11',
		},
		{
			path: '/path/to/song3.mp3',
			title: 'Imagine',
			artist: 'John Lennon',
			album: 'Imagine',
			duration: 183,
			cover: null,
			genre: 'Pop',
			year: 1971,
			track: '1',
		},
	]

	const mockPlayerStore = {
		playNow: vi.fn(),
	}

	const mockAddToQueue = vi.fn()

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
			; (formatTime as any).mockImplementation((seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`)
	})

	describe('Empty State', () => {
		it('should render empty state when no songs provided', () => {
			render(<SongsList songs={[]} addToQueue={mockAddToQueue} folderPath="/music" />)

			expect(screen.getByText('No songs found.')).toBeInTheDocument()
		})
	})

	describe('Songs Display', () => {
		it('should render songs table when songs are provided', () => {
			render(<SongsList songs={mockSongs} addToQueue={mockAddToQueue} folderPath="/music" />)

			expect(screen.getByTestId('songs-table')).toBeInTheDocument()
			expect(screen.getByTestId('songs-count')).toHaveTextContent('3')
		})

		it('should display all songs with correct information', () => {
			render(<SongsList songs={mockSongs} addToQueue={mockAddToQueue} folderPath="/music" />)

			// Check first song (sorted by title: "Bohemian Rhapsody")
			expect(screen.getByTestId('song-title-0')).toHaveTextContent('Bohemian Rhapsody')
			expect(screen.getByTestId('song-artist-0')).toHaveTextContent('Queen')
			expect(screen.getByTestId('song-album-0')).toHaveTextContent('A Night at the Opera')

			// Check second song (sorted by title: "Imagine")
			expect(screen.getByTestId('song-title-1')).toHaveTextContent('Imagine')
			expect(screen.getByTestId('song-artist-1')).toHaveTextContent('John Lennon')
			expect(screen.getByTestId('song-album-1')).toHaveTextContent('Imagine')

			// Check third song (sorted by title: "Yesterday")
			expect(screen.getByTestId('song-title-2')).toHaveTextContent('Yesterday')
			expect(screen.getByTestId('song-artist-2')).toHaveTextContent('The Beatles')
			expect(screen.getByTestId('song-album-2')).toHaveTextContent('Help!')
		})

		it('should render all sortable columns', () => {
			render(<SongsList songs={mockSongs} addToQueue={mockAddToQueue} folderPath="/music" />)

			expect(screen.getByTestId('sort-title')).toBeInTheDocument()
			expect(screen.getByTestId('sort-artist')).toBeInTheDocument()
			expect(screen.getByTestId('sort-album')).toBeInTheDocument()
			expect(screen.getByTestId('sort-duration')).toBeInTheDocument()
			expect(screen.getByTestId('sort-year')).toBeInTheDocument()
			expect(screen.getByTestId('sort-genre')).toBeInTheDocument()
		})
	})

	describe('Sorting Functionality', () => {
		it('should sort by title in ascending order by default', () => {
			render(<SongsList songs={mockSongs} addToQueue={mockAddToQueue} folderPath="/music" />)

			// Default sort is by title ascending: "Bohemian Rhapsody", "Imagine", "Yesterday"
			expect(screen.getByTestId('song-title-0')).toHaveTextContent('Bohemian Rhapsody')
			expect(screen.getByTestId('song-title-1')).toHaveTextContent('Imagine')
			expect(screen.getByTestId('song-title-2')).toHaveTextContent('Yesterday')
		})

		it('should toggle sort direction when clicking same column', () => {
			render(<SongsList songs={mockSongs} addToQueue={mockAddToQueue} folderPath="/music" />)

			// Click title sort button to reverse order
			const titleSortButton = screen.getByTestId('sort-title')
			fireEvent.click(titleSortButton)

			// Should now be descending: "Yesterday", "Imagine", "Bohemian Rhapsody"
			expect(screen.getByTestId('song-title-0')).toHaveTextContent('Yesterday')
			expect(screen.getByTestId('song-title-1')).toHaveTextContent('Imagine')
			expect(screen.getByTestId('song-title-2')).toHaveTextContent('Bohemian Rhapsody')
		})

		it('should sort by artist when clicking artist column', () => {
			render(<SongsList songs={mockSongs} addToQueue={mockAddToQueue} folderPath="/music" />)

			const artistSortButton = screen.getByTestId('sort-artist')
			fireEvent.click(artistSortButton)

			// Should be sorted by artist: "John Lennon", "Queen", "The Beatles"
			expect(screen.getByTestId('song-artist-0')).toHaveTextContent('John Lennon')
			expect(screen.getByTestId('song-artist-1')).toHaveTextContent('Queen')
			expect(screen.getByTestId('song-artist-2')).toHaveTextContent('The Beatles')
		})

		it('should sort by year numerically', () => {
			render(<SongsList songs={mockSongs} addToQueue={mockAddToQueue} folderPath="/music" />)

			const yearSortButton = screen.getByTestId('sort-year')
			fireEvent.click(yearSortButton)

			// Should be sorted by year: 1965, 1971, 1975
			expect(screen.getByTestId('song-title-0')).toHaveTextContent('Yesterday') // 1965
			expect(screen.getByTestId('song-title-1')).toHaveTextContent('Imagine') // 1971
			expect(screen.getByTestId('song-title-2')).toHaveTextContent('Bohemian Rhapsody') // 1975
		})

		it('should sort by duration numerically', () => {
			render(<SongsList songs={mockSongs} addToQueue={mockAddToQueue} folderPath="/music" />)

			const durationSortButton = screen.getByTestId('sort-duration')
			fireEvent.click(durationSortButton)

			// Should be sorted by duration: 125, 183, 355
			expect(screen.getByTestId('song-title-0')).toHaveTextContent('Yesterday') // 125
			expect(screen.getByTestId('song-title-1')).toHaveTextContent('Imagine') // 183
			expect(screen.getByTestId('song-title-2')).toHaveTextContent('Bohemian Rhapsody') // 355
		})
	})

	describe('Song Interactions', () => {
		it('should call playNow when double-clicking a song', () => {
			render(<SongsList songs={mockSongs} addToQueue={mockAddToQueue} folderPath="/music" />)

			const firstSong = screen.getByTestId('song-item-0')
			fireEvent.doubleClick(firstSong)

			// First song in sorted order is "Bohemian Rhapsody"
			const expectedSong = mockSongs.find((song) => song.title === 'Bohemian Rhapsody')
			expect(mockPlayerStore.playNow).toHaveBeenCalledWith(expectedSong)
		})

		it('should call addToQueue when right-clicking a song and selecting Add to Queue', () => {
			render(<SongsList songs={mockSongs} addToQueue={mockAddToQueue} folderPath="/music" />)

			const firstSong = screen.getByTestId('song-item-0')
			fireEvent.contextMenu(firstSong)

			// Click "Add to Queue" in the context menu
			const addToQueueOption = screen.getByText('Add to Queue')
			fireEvent.click(addToQueueOption)

			// First song in sorted order is "Bohemian Rhapsody"
			const expectedSong = mockSongs.find((song) => song.title === 'Bohemian Rhapsody')
			expect(mockAddToQueue).toHaveBeenCalledWith(expectedSong)
		})

		it('should prevent default context menu on right click', () => {
			render(<SongsList songs={mockSongs} addToQueue={mockAddToQueue} folderPath="/music" />)

			const firstSong = screen.getByTestId('song-item-0')
			const contextMenuEvent = new MouseEvent('contextmenu', { bubbles: true })
			const preventDefaultSpy = vi.spyOn(contextMenuEvent, 'preventDefault')

			firstSong.dispatchEvent(contextMenuEvent)

			expect(preventDefaultSpy).toHaveBeenCalled()
		})
	})

	describe('Edge Cases', () => {
		it('should handle songs with missing properties', () => {
			const songsWithMissingData: any[] = [
				{
					path: '/path/to/song.mp3',
					title: 'Song with missing data',
					artist: undefined,
					album: undefined,
					duration: 180,
					cover: null,
					genre: undefined,
					track: undefined,
					year: undefined,
				},
			]

			render(<SongsList songs={songsWithMissingData} addToQueue={mockAddToQueue} folderPath="/music" />)

			expect(screen.getByTestId('songs-table')).toBeInTheDocument()
			expect(screen.getByTestId('song-title-0')).toHaveTextContent('Song with missing data')
		})

		it('should handle empty arrays gracefully in sorting', () => {
			render(<SongsList songs={[]} addToQueue={mockAddToQueue} folderPath="/music" />)

			expect(screen.getByText('No songs found.')).toBeInTheDocument()
		})

		it('should handle single song', () => {
			const singleSong = [mockSongs[0]]
			render(<SongsList songs={singleSong} addToQueue={mockAddToQueue} folderPath="/music" />)

			expect(screen.getByTestId('songs-table')).toBeInTheDocument()
			expect(screen.getByTestId('songs-count')).toHaveTextContent('1')
			expect(screen.getByTestId('song-title-0')).toHaveTextContent('Yesterday')
		})

		it('should handle songs with undefined sort values', () => {
			const songsWithUndefined: any[] = [
				{
					path: '/path/to/song1.mp3',
					title: 'Song 1',
					artist: undefined,
					album: 'Album 1',
					duration: 120,
					genre: 'Rock',
					year: 2020,
				},
				{
					path: '/path/to/song2.mp3',
					title: 'Song 2',
					artist: 'Artist 2',
					album: undefined,
					duration: 150,
					genre: 'Pop',
					year: 2021,
				},
			]

			render(<SongsList songs={songsWithUndefined} addToQueue={mockAddToQueue} folderPath="/music" />)

			expect(screen.getByTestId('songs-table')).toBeInTheDocument()
			expect(screen.getByTestId('songs-count')).toHaveTextContent('2')

			// Should not crash when sorting by artist (with undefined value)
			const artistSortButton = screen.getByTestId('sort-artist')
			fireEvent.click(artistSortButton)

			expect(screen.getByTestId('songs-table')).toBeInTheDocument()
		})
	})

	describe('Integration', () => {
		it('should pass correct props to SongsTable', () => {
			render(<SongsList songs={mockSongs} addToQueue={mockAddToQueue} folderPath="/music" />)

			// Verify that SongsTable receives sorted songs
			expect(screen.getByTestId('songs-table')).toBeInTheDocument()
			expect(screen.getByTestId('songs-count')).toHaveTextContent('3')

			// Verify all sort buttons are available (indicating columns were passed)
			expect(screen.getByTestId('sort-title')).toBeInTheDocument()
			expect(screen.getByTestId('sort-artist')).toBeInTheDocument()
			expect(screen.getByTestId('sort-album')).toBeInTheDocument()
			expect(screen.getByTestId('sort-duration')).toBeInTheDocument()
			expect(screen.getByTestId('sort-year')).toBeInTheDocument()
			expect(screen.getByTestId('sort-genre')).toBeInTheDocument()
		})

		it('should work with null folderPath', () => {
			render(<SongsList songs={mockSongs} addToQueue={mockAddToQueue} folderPath={null} />)

			expect(screen.getByTestId('songs-table')).toBeInTheDocument()
			expect(screen.getByTestId('songs-count')).toHaveTextContent('3')
		})
	})
})
