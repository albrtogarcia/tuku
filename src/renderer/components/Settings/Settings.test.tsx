import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import Settings from './Settings'

describe('Settings Component', () => {
	const mockProps = {
		isOpen: true,
		onClose: vi.fn(),
		folderPath: null,
		lastUpdated: null,
		onSelectFolder: vi.fn(),
		onRescanFolder: vi.fn(),
		onCleanupMissingFiles: vi.fn(),
		theme: 'system' as const,
		onSetTheme: vi.fn(),
		language: 'system' as const,
		onSetLanguage: vi.fn(),
	}

	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe('Rendering', () => {
		it('renders nothing when isOpen is false', () => {
			render(<Settings {...mockProps} isOpen={false} />)
			expect(screen.queryByText('Settings')).not.toBeInTheDocument()
		})

		it('renders settings modal when isOpen is true', () => {
			render(<Settings {...mockProps} />)
			expect(screen.getByText('Settings')).toBeInTheDocument()
		})

		it('renders correct title', () => {
			render(<Settings {...mockProps} />)
			expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument()
		})

		it('renders Music Library section', () => {
			render(<Settings {...mockProps} />)
			expect(screen.getByText('Music Library')).toBeInTheDocument()
		})

		it('renders Library Folder label', () => {
			render(<Settings {...mockProps} />)
			expect(screen.getByText('Library Folder')).toBeInTheDocument()
		})

		it('renders Last Updated label', () => {
			render(<Settings {...mockProps} />)
			expect(screen.getByText('Last Updated')).toBeInTheDocument()
		})
	})

	describe('Folder Path Display', () => {
		it('shows "No folder selected" when folderPath is null', () => {
			render(<Settings {...mockProps} folderPath={null} />)
			const input = screen.getByDisplayValue('No folder selected')
			expect(input).toBeInTheDocument()
			expect(input).toHaveAttribute('placeholder', 'No folder selected')
		})

		it('shows full path when folderPath is provided', () => {
			const folderPath = '/Users/test/Music'
			render(<Settings {...mockProps} folderPath={folderPath} />)
			const input = screen.getByDisplayValue(folderPath)
			expect(input).toBeInTheDocument()
			expect(input).toHaveAttribute('title', folderPath)
		})

		it('applies has-value class when folderPath exists', () => {
			const folderPath = '/Users/test/Music'
			render(<Settings {...mockProps} folderPath={folderPath} />)
			const input = screen.getByDisplayValue(folderPath)
			expect(input).toHaveClass('has-value')
		})

		it('does not apply has-value class when folderPath is null', () => {
			render(<Settings {...mockProps} folderPath={null} />)
			const input = screen.getByDisplayValue('No folder selected')
			expect(input).not.toHaveClass('has-value')
		})

		it('folder path input is read-only', () => {
			render(<Settings {...mockProps} />)
			const input = screen.getByDisplayValue('No folder selected')
			expect(input).toHaveAttribute('readOnly')
		})
	})

	describe('Button Interactions', () => {
		it('calls onClose when close button is clicked', () => {
			render(<Settings {...mockProps} />)
			const closeButton = screen.getByTitle('Close')
			fireEvent.click(closeButton)
			expect(mockProps.onClose).toHaveBeenCalledTimes(1)
		})

		it('calls onSelectFolder when folder button is clicked', () => {
			render(<Settings {...mockProps} />)
			const folderButton = screen.getByTitle('Select music folder')
			fireEvent.click(folderButton)
			expect(mockProps.onSelectFolder).toHaveBeenCalledTimes(1)
		})

		it('calls onRescanFolder when rescan button is clicked', () => {
			const folderPath = '/Users/test/Music'
			render(<Settings {...mockProps} folderPath={folderPath} />)
			const rescanButton = screen.getByTitle('Rescan current folder')
			fireEvent.click(rescanButton)
			expect(mockProps.onRescanFolder).toHaveBeenCalledTimes(1)
		})
	})

	describe('Button Text and States', () => {
		it('shows "Import Folder" text when no folder is selected', () => {
			render(<Settings {...mockProps} folderPath={null} />)
			expect(screen.getByText('Import Folder')).toBeInTheDocument()
		})

		it('shows "Change Folder" text when folder is selected', () => {
			const folderPath = '/Users/test/Music'
			render(<Settings {...mockProps} folderPath={folderPath} />)
			expect(screen.getByText('Change Folder')).toBeInTheDocument()
		})

		it('disables rescan button when no folder is selected', () => {
			render(<Settings {...mockProps} folderPath={null} />)
			const rescanButton = screen.getByTitle('Rescan current folder')
			expect(rescanButton).toBeDisabled()
		})

		it('enables rescan button when folder is selected', () => {
			const folderPath = '/Users/test/Music'
			render(<Settings {...mockProps} folderPath={folderPath} />)
			const rescanButton = screen.getByTitle('Rescan current folder')
			expect(rescanButton).toBeEnabled()
		})
	})

	describe('Date Formatting', () => {
		it('shows "Never" when lastUpdated is null', () => {
			render(<Settings {...mockProps} lastUpdated={null} />)
			expect(screen.getByText('Never')).toBeInTheDocument()
		})

		it('formats date correctly when lastUpdated is provided', () => {
			const lastUpdated = '2024-01-15T10:30:00.000Z'
			render(<Settings {...mockProps} lastUpdated={lastUpdated} />)
			// The exact format depends on locale, but we can check it's not "Never"
			expect(screen.queryByText('Never')).not.toBeInTheDocument()
			// Check that some date elements are present
			expect(screen.getByText(/Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/)).toBeInTheDocument()
		})

		it('handles invalid date strings gracefully', () => {
			const lastUpdated = 'invalid-date'
			render(<Settings {...mockProps} lastUpdated={lastUpdated} />)
			// Should show "Invalid Date" for invalid date strings
			expect(screen.getByText('Invalid Date')).toBeInTheDocument()
		})
	})

	describe('Accessibility', () => {
		it('has correct title attributes for buttons', () => {
			const folderPath = '/Users/test/Music'
			render(<Settings {...mockProps} folderPath={folderPath} />)
			
			expect(screen.getByTitle('Close')).toBeInTheDocument()
			expect(screen.getByTitle('Select music folder')).toBeInTheDocument()
			expect(screen.getByTitle('Rescan current folder')).toBeInTheDocument()
		})

		it('has correct title attribute for folder path input', () => {
			const folderPath = '/Users/test/Music'
			render(<Settings {...mockProps} folderPath={folderPath} />)
			const input = screen.getByDisplayValue(folderPath)
			expect(input).toHaveAttribute('title', folderPath)
		})

		it('has correct title attribute for empty folder path input', () => {
			render(<Settings {...mockProps} folderPath={null} />)
			const input = screen.getByDisplayValue('No folder selected')
			expect(input).toHaveAttribute('title', 'No folder selected')
		})

		it('has proper heading hierarchy', () => {
			render(<Settings {...mockProps} />)
			expect(screen.getByRole('heading', { level: 2, name: 'Settings' })).toBeInTheDocument()
			expect(screen.getByRole('heading', { level: 3, name: 'Music Library' })).toBeInTheDocument()
		})
	})

	describe('CSS Classes', () => {
		it('applies correct CSS classes to main elements', () => {
			render(<Settings {...mockProps} />)
			
			expect(document.querySelector('.settings-overlay')).toBeInTheDocument()
			expect(document.querySelector('.settings')).toBeInTheDocument()
			expect(document.querySelector('.settings__header')).toBeInTheDocument()
			expect(document.querySelector('.settings__content')).toBeInTheDocument()
			expect(document.querySelector('.settings__section')).toBeInTheDocument()
		})

		it('applies correct button classes', () => {
			const folderPath = '/Users/test/Music'
			render(<Settings {...mockProps} folderPath={folderPath} />)
			
			expect(document.querySelector('.btn.btn--close')).toBeInTheDocument()
			expect(document.querySelector('.btn.btn--primary')).toBeInTheDocument()
			expect(document.querySelector('.btn.btn--secondary')).toBeInTheDocument()
		})

		it('applies correct input classes', () => {
			render(<Settings {...mockProps} />)
			expect(document.querySelector('.settings__folder-path')).toBeInTheDocument()
		})
	})

	describe('Modal Behavior', () => {
		it('renders overlay when open', () => {
			render(<Settings {...mockProps} />)
			expect(document.querySelector('.settings-overlay')).toBeInTheDocument()
		})

		it('does not render overlay when closed', () => {
			render(<Settings {...mockProps} isOpen={false} />)
			expect(document.querySelector('.settings-overlay')).not.toBeInTheDocument()
		})
	})

	describe('Edge Cases', () => {
		it('handles empty string folderPath', () => {
			render(<Settings {...mockProps} folderPath="" />)
			expect(screen.getByDisplayValue('No folder selected')).toBeInTheDocument()
		})

		it('handles very long folder paths', () => {
			const longPath = '/very/long/folder/path/with/many/nested/directories/that/goes/on/and/on/Music'
			render(<Settings {...mockProps} folderPath={longPath} />)
			expect(screen.getByDisplayValue(longPath)).toBeInTheDocument()
		})

		it('handles special characters in folder paths', () => {
			const specialPath = '/Users/test/Music & Audio/My Tunes (2024)'
			render(<Settings {...mockProps} folderPath={specialPath} />)
			expect(screen.getByDisplayValue(specialPath)).toBeInTheDocument()
		})

		it('handles empty string lastUpdated', () => {
			render(<Settings {...mockProps} lastUpdated="" />)
			// Empty string should be treated as falsy and show "Never"
			expect(screen.getByText('Never')).toBeInTheDocument()
		})
	})

	describe('Icons', () => {
		it('renders FolderOpenIcon in folder button', () => {
			render(<Settings {...mockProps} />)
			const folderButton = screen.getByTitle('Select music folder')
			expect(folderButton.querySelector('svg')).toBeInTheDocument()
		})

		it('renders ArrowClockwiseIcon in rescan button', () => {
			const folderPath = '/Users/test/Music'
			render(<Settings {...mockProps} folderPath={folderPath} />)
			const rescanButton = screen.getByTitle('Rescan current folder')
			expect(rescanButton.querySelector('svg')).toBeInTheDocument()
		})

		it('renders XIcon in close button', () => {
			render(<Settings {...mockProps} />)
			const closeButton = screen.getByTitle('Close')
			expect(closeButton.querySelector('svg')).toBeInTheDocument()
		})
	})
})
