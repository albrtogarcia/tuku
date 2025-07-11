import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import SongsTable, { SongsTableColumn } from './SongsTable'

// Mock the utils
vi.mock('../../utils', () => ({
	formatTime: vi.fn((sec: number) => {
		const m = Math.floor(sec / 60)
		const s = Math.floor(sec % 60)
		return `${m}:${s.toString().padStart(2, '0')}`
	}),
}))

describe('SongsTable Component', () => {
	const mockSongs = [
		{
			id: 'song1',
			title: 'Come Together',
			artist: 'The Beatles',
			album: 'Abbey Road',
			duration: 260,
			genre: 'Rock',
			path: '/path/to/come-together.mp3',
		},
		{
			id: 'song2',
			title: 'Bohemian Rhapsody',
			artist: 'Queen',
			album: 'A Night at the Opera',
			duration: 355,
			genre: 'Rock',
			path: '/path/to/bohemian-rhapsody.mp3',
		},
		{
			id: 'song3',
			title: 'Hotel California',
			artist: 'Eagles',
			album: 'Hotel California',
			duration: 391,
			genre: 'Rock',
			path: '/path/to/hotel-california.mp3',
		},
	]

	const basicColumns: SongsTableColumn[] = [
		{ key: 'title', label: 'Title', sortable: true },
		{ key: 'artist', label: 'Artist', sortable: true },
		{ key: 'album', label: 'Album', sortable: false },
		{ key: 'duration', label: 'Duration', sortable: true },
	]

	const editableColumns: SongsTableColumn[] = [
		{ key: 'title', label: 'Title', sortable: true, editable: true },
		{ key: 'artist', label: 'Artist', sortable: true, editable: true },
		{ key: 'album', label: 'Album', sortable: false, editable: false },
		{ key: 'duration', label: 'Duration', sortable: true, editable: false },
	]

	const mockOnSort = vi.fn()
	const mockOnEdit = vi.fn()
	const mockOnDoubleClick = vi.fn()
	const mockOnRightClick = vi.fn()

	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe('Rendering', () => {
		it('should render table with correct structure', () => {
			const { container } = render(<SongsTable songs={mockSongs} columns={basicColumns} />)

			const tableContainer = container.querySelector('.table-container')
			expect(tableContainer).toBeInTheDocument()

			const table = screen.getByRole('table')
			expect(table).toBeInTheDocument()
			expect(table).toHaveClass('songs-table')
		})

		it('should render table headers correctly', () => {
			render(<SongsTable songs={mockSongs} columns={basicColumns} />)

			expect(screen.getByRole('columnheader', { name: /title/i })).toBeInTheDocument()
			expect(screen.getByRole('columnheader', { name: /artist/i })).toBeInTheDocument()
			expect(screen.getByRole('columnheader', { name: /album/i })).toBeInTheDocument()
			expect(screen.getByRole('columnheader', { name: /duration/i })).toBeInTheDocument()
		})

		it('should render sortable indicators for sortable columns', () => {
			render(<SongsTable songs={mockSongs} columns={basicColumns} onSort={mockOnSort} />)

			const titleHeader = screen.getByRole('columnheader', { name: /title/i })
			const artistHeader = screen.getByRole('columnheader', { name: /artist/i })
			const albumHeader = screen.getByRole('columnheader', { name: /album/i })
			const durationHeader = screen.getByRole('columnheader', { name: /duration/i })

			// Sortable columns should have indicators
			expect(titleHeader).toHaveTextContent('⇅')
			expect(artistHeader).toHaveTextContent('⇅')
			expect(durationHeader).toHaveTextContent('⇅')

			// Non-sortable column should not have indicator
			expect(albumHeader).not.toHaveTextContent('⇅')
		})

		it('should render all song rows', () => {
			render(<SongsTable songs={mockSongs} columns={basicColumns} />)

			expect(screen.getByText('Come Together')).toBeInTheDocument()
			expect(screen.getByText('Bohemian Rhapsody')).toBeInTheDocument()
			expect(screen.getAllByText('Hotel California')).toHaveLength(2) // Title and Album

			expect(screen.getByText('The Beatles')).toBeInTheDocument()
			expect(screen.getByText('Queen')).toBeInTheDocument()
			expect(screen.getByText('Eagles')).toBeInTheDocument()
		})

		it('should format duration correctly', () => {
			render(<SongsTable songs={mockSongs} columns={basicColumns} />)

			expect(screen.getByText('4:20')).toBeInTheDocument() // 260 seconds
			expect(screen.getByText('5:55')).toBeInTheDocument() // 355 seconds
			expect(screen.getByText('6:31')).toBeInTheDocument() // 391 seconds
		})

		it('should render empty table when no songs provided', () => {
			render(<SongsTable songs={[]} columns={basicColumns} />)

			const table = screen.getByRole('table')
			expect(table).toBeInTheDocument()

			// Should have headers but no rows
			expect(screen.getByRole('columnheader', { name: /title/i })).toBeInTheDocument()
			expect(screen.queryByText('Come Together')).not.toBeInTheDocument()
		})

		it('should render table rows with correct class', () => {
			const { container } = render(<SongsTable songs={mockSongs} columns={basicColumns} />)

			const rows = container.querySelectorAll('.songs-table__row')
			expect(rows).toHaveLength(mockSongs.length)
		})
	})

	describe('Sorting Functionality', () => {
		it('should call onSort when clicking sortable column header', () => {
			render(<SongsTable songs={mockSongs} columns={basicColumns} onSort={mockOnSort} />)

			const titleHeader = screen.getByRole('columnheader', { name: /title/i })
			fireEvent.click(titleHeader)

			expect(mockOnSort).toHaveBeenCalledTimes(1)
			expect(mockOnSort).toHaveBeenCalledWith('title')
		})

		it('should not call onSort when clicking non-sortable column header', () => {
			render(<SongsTable songs={mockSongs} columns={basicColumns} onSort={mockOnSort} />)

			const albumHeader = screen.getByRole('columnheader', { name: /album/i })
			fireEvent.click(albumHeader)

			expect(mockOnSort).not.toHaveBeenCalled()
		})

		it('should not call onSort when onSort is not provided', () => {
			render(<SongsTable songs={mockSongs} columns={basicColumns} />)

			const titleHeader = screen.getByRole('columnheader', { name: /title/i })
			expect(() => fireEvent.click(titleHeader)).not.toThrow()
		})

		it('should call onSort with correct column keys', () => {
			render(<SongsTable songs={mockSongs} columns={basicColumns} onSort={mockOnSort} />)

			const titleHeader = screen.getByRole('columnheader', { name: /title/i })
			const artistHeader = screen.getByRole('columnheader', { name: /artist/i })
			const durationHeader = screen.getByRole('columnheader', { name: /duration/i })

			fireEvent.click(titleHeader)
			expect(mockOnSort).toHaveBeenCalledWith('title')

			fireEvent.click(artistHeader)
			expect(mockOnSort).toHaveBeenCalledWith('artist')

			fireEvent.click(durationHeader)
			expect(mockOnSort).toHaveBeenCalledWith('duration')
		})
	})

	describe('Editing Functionality', () => {
		it('should render input fields for editable columns', () => {
			render(<SongsTable songs={mockSongs} columns={editableColumns} onEdit={mockOnEdit} />)

			// Title and artist should be editable (inputs)
			const titleInputs = screen.getAllByDisplayValue('Come Together')
			const artistInputs = screen.getAllByDisplayValue('The Beatles')

			expect(titleInputs[0]).toBeInstanceOf(HTMLInputElement)
			expect(artistInputs[0]).toBeInstanceOf(HTMLInputElement)

			// Album should not be editable (text)
			expect(screen.getByText('Abbey Road')).not.toBeInstanceOf(HTMLInputElement)
		})

		it('should call onEdit when input value changes', async () => {
			const user = userEvent.setup()
			render(<SongsTable songs={mockSongs} columns={editableColumns} onEdit={mockOnEdit} />)

			const titleInput = screen.getAllByDisplayValue('Come Together')[0] as HTMLInputElement

			await user.type(titleInput, 'x')

			expect(mockOnEdit).toHaveBeenCalled()
			// Check that it was called with some value
			expect(mockOnEdit).toHaveBeenCalledWith('song1', 'title', expect.stringContaining('Come Together'))
		})

		it('should not render inputs for non-editable columns', () => {
			render(<SongsTable songs={mockSongs} columns={editableColumns} onEdit={mockOnEdit} />)

			// Duration should not be editable
			expect(screen.getByText('4:20')).not.toBeInstanceOf(HTMLInputElement)
			expect(screen.getByText('Abbey Road')).not.toBeInstanceOf(HTMLInputElement)
		})

		it('should handle edit when onEdit is not provided', async () => {
			const user = userEvent.setup()
			render(<SongsTable songs={mockSongs} columns={editableColumns} />)

			const titleInput = screen.getAllByDisplayValue('Come Together')[0] as HTMLInputElement

			expect(() => user.type(titleInput, 'New Title')).not.toThrow()
		})
	})

	describe('Row Interactions', () => {
		it('should call onDoubleClick when row is double-clicked', () => {
			render(<SongsTable songs={mockSongs} columns={basicColumns} onDoubleClick={mockOnDoubleClick} />)

			const firstRow = screen.getByText('Come Together').closest('tr')
			fireEvent.doubleClick(firstRow!)

			expect(mockOnDoubleClick).toHaveBeenCalledTimes(1)
			expect(mockOnDoubleClick).toHaveBeenCalledWith(mockSongs[0])
		})

		it('should call onRightClick when row is right-clicked', () => {
			render(<SongsTable songs={mockSongs} columns={basicColumns} onRightClick={mockOnRightClick} />)

			const firstRow = screen.getByText('Come Together').closest('tr')
			fireEvent.contextMenu(firstRow!)

			expect(mockOnRightClick).toHaveBeenCalledTimes(1)
			expect(mockOnRightClick).toHaveBeenCalledWith(mockSongs[0], expect.any(Object))
		})

		it('should not break when interaction handlers are not provided', () => {
			render(<SongsTable songs={mockSongs} columns={basicColumns} />)

			const firstRow = screen.getByText('Come Together').closest('tr')

			expect(() => fireEvent.doubleClick(firstRow!)).not.toThrow()
			expect(() => fireEvent.contextMenu(firstRow!)).not.toThrow()
		})

		it('should handle clicks on different rows', () => {
			render(<SongsTable songs={mockSongs} columns={basicColumns} onDoubleClick={mockOnDoubleClick} />)

			const firstRow = screen.getByText('Come Together').closest('tr')
			const secondRow = screen.getByText('Bohemian Rhapsody').closest('tr')

			fireEvent.doubleClick(firstRow!)
			expect(mockOnDoubleClick).toHaveBeenCalledWith(mockSongs[0])

			fireEvent.doubleClick(secondRow!)
			expect(mockOnDoubleClick).toHaveBeenCalledWith(mockSongs[1])
		})
	})

	describe('Edge Cases', () => {
		it('should handle songs without id using index as key', () => {
			const songsWithoutId = mockSongs.map((song) => {
				const { id, ...songWithoutId } = song
				return songWithoutId
			})

			expect(() => {
				render(<SongsTable songs={songsWithoutId} columns={basicColumns} />)
			}).not.toThrow()

			expect(screen.getByText('Come Together')).toBeInTheDocument()
		})

		it('should handle missing song properties gracefully', () => {
			const songsWithMissingProps = [
				{
					id: 'incomplete1',
					title: 'Incomplete Song',
					// missing artist, album, duration
				},
				{
					id: 'incomplete2',
					artist: 'Unknown Artist',
					// missing title, album, duration
				},
			]

			expect(() => {
				render(<SongsTable songs={songsWithMissingProps} columns={basicColumns} />)
			}).not.toThrow()

			expect(screen.getByText('Incomplete Song')).toBeInTheDocument()
			expect(screen.getByText('Unknown Artist')).toBeInTheDocument()
		})

		it('should handle columns with keys that do not exist in songs', () => {
			const columnsWithMissingKeys: SongsTableColumn[] = [
				{ key: 'title', label: 'Title' },
				{ key: 'nonexistent', label: 'Non-existent' },
			]

			expect(() => {
				render(<SongsTable songs={mockSongs} columns={columnsWithMissingKeys} />)
			}).not.toThrow()
		})

		it('should handle zero duration', () => {
			const songWithZeroDuration = [
				{
					...mockSongs[0],
					duration: 0,
				},
			]

			render(<SongsTable songs={songWithZeroDuration} columns={basicColumns} />)
			expect(screen.getByText('0:00')).toBeInTheDocument()
		})

		it('should handle very long duration', () => {
			const songWithLongDuration = [
				{
					...mockSongs[0],
					duration: 7323, // 2 hours, 2 minutes, 3 seconds
				},
			]

			render(<SongsTable songs={songWithLongDuration} columns={basicColumns} />)
			expect(screen.getByText('122:03')).toBeInTheDocument()
		})
	})

	describe('Custom Columns Configuration', () => {
		it('should render only specified columns', () => {
			const limitedColumns: SongsTableColumn[] = [
				{ key: 'title', label: 'Song Title' },
				{ key: 'artist', label: 'Artist Name' },
			]

			render(<SongsTable songs={mockSongs} columns={limitedColumns} />)

			expect(screen.getByRole('columnheader', { name: /song title/i })).toBeInTheDocument()
			expect(screen.getByRole('columnheader', { name: /artist name/i })).toBeInTheDocument()
			expect(screen.queryByRole('columnheader', { name: /album/i })).not.toBeInTheDocument()
			expect(screen.queryByRole('columnheader', { name: /duration/i })).not.toBeInTheDocument()
		})

		it('should handle custom column labels', () => {
			const customColumns: SongsTableColumn[] = [
				{ key: 'title', label: 'Track Name', sortable: true },
				{ key: 'artist', label: 'Performer', sortable: true },
				{ key: 'duration', label: 'Length', sortable: false },
			]

			render(<SongsTable songs={mockSongs} columns={customColumns} />)

			expect(screen.getByRole('columnheader', { name: /track name/i })).toBeInTheDocument()
			expect(screen.getByRole('columnheader', { name: /performer/i })).toBeInTheDocument()
			expect(screen.getByRole('columnheader', { name: /length/i })).toBeInTheDocument()
		})

		it('should handle different sortable configurations', () => {
			const mixedSortableColumns: SongsTableColumn[] = [
				{ key: 'title', label: 'Title', sortable: true },
				{ key: 'artist', label: 'Artist', sortable: false },
				{ key: 'album', label: 'Album', sortable: true },
				{ key: 'duration', label: 'Duration', sortable: false },
			]

			render(<SongsTable songs={mockSongs} columns={mixedSortableColumns} onSort={mockOnSort} />)

			const titleHeader = screen.getByRole('columnheader', { name: /title/i })
			const artistHeader = screen.getByRole('columnheader', { name: /artist/i })
			const albumHeader = screen.getByRole('columnheader', { name: /album/i })
			const durationHeader = screen.getByRole('columnheader', { name: /duration/i })

			expect(titleHeader).toHaveTextContent('⇅')
			expect(artistHeader).not.toHaveTextContent('⇅')
			expect(albumHeader).toHaveTextContent('⇅')
			expect(durationHeader).not.toHaveTextContent('⇅')

			fireEvent.click(titleHeader)
			expect(mockOnSort).toHaveBeenCalledWith('title')

			fireEvent.click(artistHeader)
			expect(mockOnSort).toHaveBeenCalledTimes(1) // Should not increase

			fireEvent.click(albumHeader)
			expect(mockOnSort).toHaveBeenCalledWith('album')
		})
	})

	describe('Integration Tests', () => {
		it('should work with all props provided', async () => {
			const user = userEvent.setup()
			render(
				<SongsTable
					songs={mockSongs}
					columns={editableColumns}
					onSort={mockOnSort}
					onEdit={mockOnEdit}
					onDoubleClick={mockOnDoubleClick}
					onRightClick={mockOnRightClick}
				/>,
			)

			// Test sorting
			const titleHeader = screen.getByRole('columnheader', { name: /title/i })
			fireEvent.click(titleHeader)
			expect(mockOnSort).toHaveBeenCalledWith('title')

			// Test editing
			const titleInput = screen.getAllByDisplayValue('Come Together')[0] as HTMLInputElement
			await user.type(titleInput, ' Edited')
			expect(mockOnEdit).toHaveBeenCalled()

			// Test double click - find row by input value instead of text
			const firstRow = titleInput.closest('tr')
			fireEvent.doubleClick(firstRow!)
			expect(mockOnDoubleClick).toHaveBeenCalledWith(mockSongs[0])

			// Test right click
			fireEvent.contextMenu(firstRow!)
			expect(mockOnRightClick).toHaveBeenCalledWith(mockSongs[0], expect.any(Object))
		})

		it('should maintain table structure with dynamic data', () => {
			const { rerender } = render(<SongsTable songs={mockSongs} columns={basicColumns} />)

			expect(screen.getAllByRole('row')).toHaveLength(mockSongs.length + 1) // +1 for header

			// Update with fewer songs
			const fewerSongs = mockSongs.slice(0, 1)
			rerender(<SongsTable songs={fewerSongs} columns={basicColumns} />)

			expect(screen.getAllByRole('row')).toHaveLength(fewerSongs.length + 1)
			expect(screen.getByText('Come Together')).toBeInTheDocument()
			expect(screen.queryByText('Bohemian Rhapsody')).not.toBeInTheDocument()
		})

		it('should reflect prop changes when songs are updated', async () => {
			const user = userEvent.setup()
			const updatedSongs = [...mockSongs]
			updatedSongs[0] = { ...mockSongs[0], title: 'Updated Title' }

			const { rerender } = render(<SongsTable songs={mockSongs} columns={editableColumns} onEdit={mockOnEdit} />)

			// Initially shows original title
			expect(screen.getByDisplayValue('Come Together')).toBeInTheDocument()

			// Simulate editing by typing
			const titleInput = screen.getAllByDisplayValue('Come Together')[0] as HTMLInputElement
			await user.type(titleInput, 'x')

			// onEdit should be called
			expect(mockOnEdit).toHaveBeenCalled()

			// Simulate parent component updating the songs prop
			rerender(<SongsTable songs={updatedSongs} columns={editableColumns} onEdit={mockOnEdit} />)

			// Now should show updated title
			expect(screen.getByDisplayValue('Updated Title')).toBeInTheDocument()
			expect(screen.queryByDisplayValue('Come Together')).not.toBeInTheDocument()
		})
	})
})
