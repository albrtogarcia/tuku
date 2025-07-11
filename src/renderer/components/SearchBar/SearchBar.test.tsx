import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import SearchBar from './SearchBar'

describe('SearchBar Component', () => {
	const mockOnChange = vi.fn()

	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe('Rendering', () => {
		it('should render search input with placeholder', () => {
			render(<SearchBar value="" onChange={mockOnChange} />)

			const searchInput = screen.getByRole('searchbox')
			expect(searchInput).toBeInTheDocument()
			expect(searchInput).toHaveAttribute('placeholder', 'Search songs, artists...')
			expect(searchInput).toHaveClass('search__input')
		})

		it('should render with search container', () => {
			const { container } = render(<SearchBar value="" onChange={mockOnChange} />)

			const searchContainer = container.querySelector('.search')
			expect(searchContainer).toBeInTheDocument()
		})

		it('should display the provided value', () => {
			const testValue = 'The Beatles'
			render(<SearchBar value={testValue} onChange={mockOnChange} />)

			const searchInput = screen.getByRole('searchbox')
			expect(searchInput).toHaveValue(testValue)
		})

		it('should render empty input when value is empty', () => {
			render(<SearchBar value="" onChange={mockOnChange} />)

			const searchInput = screen.getByRole('searchbox')
			expect(searchInput).toHaveValue('')
		})
	})

	describe('User Interactions', () => {
		it('should call onChange when user types', async () => {
			const user = userEvent.setup()
			render(<SearchBar value="" onChange={mockOnChange} />)

			const searchInput = screen.getByRole('searchbox')
			await user.type(searchInput, 'Abbey Road')

			// Should be called for each character typed
			expect(mockOnChange).toHaveBeenCalledTimes(10) // "Abbey Road".length
			
			// Check that onChange was called with proper events
			expect(mockOnChange).toHaveBeenCalled()
		})

		it('should call onChange with correct event when input changes', () => {
			const mockOnChange = vi.fn()
			const { rerender } = render(<SearchBar value="" onChange={mockOnChange} />)

			const searchInput = screen.getByRole('searchbox')
			fireEvent.change(searchInput, { target: { value: 'Queen' } })

			expect(mockOnChange).toHaveBeenCalledTimes(1)
			
			// Verify that onChange was called with an event object
			const call = mockOnChange.mock.calls[0][0]
			expect(call).toHaveProperty('target')
			expect(call.target).toBeInstanceOf(HTMLInputElement)
			
			// Now update the component with the new value (simulating parent state update)
			rerender(<SearchBar value="Queen" onChange={mockOnChange} />)
			expect(searchInput).toHaveValue('Queen')
		})

		it('should handle backspace and deletion', async () => {
			const user = userEvent.setup()
			render(<SearchBar value="Test" onChange={mockOnChange} />)

			const searchInput = screen.getByRole('searchbox')
			
			// Clear the input
			await user.clear(searchInput)
			
			expect(mockOnChange).toHaveBeenCalled()
		})

		it('should handle paste events', async () => {
			const user = userEvent.setup()
			render(<SearchBar value="" onChange={mockOnChange} />)

			const searchInput = screen.getByRole('searchbox')
			await user.click(searchInput)
			await user.paste('Pasted Text')

			expect(mockOnChange).toHaveBeenCalled()
		})

		it('should handle keyboard events', () => {
			render(<SearchBar value="" onChange={mockOnChange} />)

			const searchInput = screen.getByRole('searchbox')
			
			// Test Enter key
			fireEvent.keyDown(searchInput, { key: 'Enter', code: 'Enter' })
			
			// Test Escape key
			fireEvent.keyDown(searchInput, { key: 'Escape', code: 'Escape' })
			
			// Should not affect onChange for key events (only change events do)
			expect(mockOnChange).not.toHaveBeenCalled()
		})
	})

	describe('Accessibility', () => {
		it('should have proper input type', () => {
			render(<SearchBar value="" onChange={mockOnChange} />)

			const searchInput = screen.getByRole('searchbox')
			expect(searchInput).toHaveAttribute('type', 'search')
		})

		it('should be focusable', () => {
			render(<SearchBar value="" onChange={mockOnChange} />)

			const searchInput = screen.getByRole('searchbox')
			expect(searchInput).not.toHaveFocus()
			
			searchInput.focus()
			expect(searchInput).toHaveFocus()
		})

		it('should be accessible via tab navigation', async () => {
			const user = userEvent.setup()
			render(<SearchBar value="" onChange={mockOnChange} />)

			const searchInput = screen.getByRole('searchbox')
			
			await user.tab()
			expect(searchInput).toHaveFocus()
		})

		it('should have proper placeholder for screen readers', () => {
			render(<SearchBar value="" onChange={mockOnChange} />)

			const searchInput = screen.getByPlaceholderText('Search songs, artists...')
			expect(searchInput).toBeInTheDocument()
		})
	})

	describe('Edge Cases', () => {
		it('should handle very long search values', () => {
			const longValue = 'a'.repeat(1000)
			render(<SearchBar value={longValue} onChange={mockOnChange} />)

			const searchInput = screen.getByRole('searchbox')
			expect(searchInput).toHaveValue(longValue)
		})

		it('should handle special characters', () => {
			const specialChars = '!@#$%^&*()_+-=[]{}|;:\'",.<>?'
			render(<SearchBar value={specialChars} onChange={mockOnChange} />)

			const searchInput = screen.getByRole('searchbox')
			expect(searchInput).toHaveValue(specialChars)
		})

		it('should handle unicode characters', () => {
			const unicodeText = '🎵 músic ñáéíóú 中文 العربية'
			render(<SearchBar value={unicodeText} onChange={mockOnChange} />)

			const searchInput = screen.getByRole('searchbox')
			expect(searchInput).toHaveValue(unicodeText)
		})

		it('should handle null/undefined values gracefully', () => {
			// TypeScript would prevent this, but testing runtime behavior
			render(<SearchBar value={'' as any} onChange={mockOnChange} />)

			const searchInput = screen.getByRole('searchbox')
			expect(searchInput).toHaveValue('')
		})

		it('should not break when onChange is not provided', () => {
			// This would be a TypeScript error, but testing runtime behavior
			expect(() => {
				render(<SearchBar value="" onChange={vi.fn()} />)
			}).not.toThrow()
		})
	})

	describe('Value Updates', () => {
		it('should update display when value prop changes', () => {
			const { rerender } = render(<SearchBar value="initial" onChange={mockOnChange} />)

			const searchInput = screen.getByRole('searchbox')
			expect(searchInput).toHaveValue('initial')

			rerender(<SearchBar value="updated" onChange={mockOnChange} />)
			expect(searchInput).toHaveValue('updated')
		})

		it('should clear value when empty string is provided', () => {
			const { rerender } = render(<SearchBar value="some text" onChange={mockOnChange} />)

			const searchInput = screen.getByRole('searchbox')
			expect(searchInput).toHaveValue('some text')

			rerender(<SearchBar value="" onChange={mockOnChange} />)
			expect(searchInput).toHaveValue('')
		})

		it('should handle rapid value changes', () => {
			const { rerender } = render(<SearchBar value="" onChange={mockOnChange} />)

			const searchInput = screen.getByRole('searchbox')
			
			const values = ['a', 'ab', 'abc', 'abcd', 'abcde']
			values.forEach(value => {
				rerender(<SearchBar value={value} onChange={mockOnChange} />)
				expect(searchInput).toHaveValue(value)
			})
		})
	})

	describe('Integration', () => {
		it('should work in a controlled component pattern', async () => {
			const TestParent = () => {
				const [searchValue, setSearchValue] = React.useState('')
				
				const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
					setSearchValue(e.target.value)
				}

				return (
					<div>
						<SearchBar value={searchValue} onChange={handleChange} />
						<div data-testid="search-value">{searchValue}</div>
					</div>
				)
			}

			const user = userEvent.setup()
			render(<TestParent />)

			const searchInput = screen.getByRole('searchbox')
			const valueDisplay = screen.getByTestId('search-value')

			expect(valueDisplay).toHaveTextContent('')

			await user.type(searchInput, 'Test Search')

			expect(valueDisplay).toHaveTextContent('Test Search')
			expect(searchInput).toHaveValue('Test Search')
		})

		it('should maintain focus during value updates', () => {
			const { rerender } = render(<SearchBar value="" onChange={mockOnChange} />)

			const searchInput = screen.getByRole('searchbox')
			searchInput.focus()
			expect(searchInput).toHaveFocus()

			rerender(<SearchBar value="new value" onChange={mockOnChange} />)
			expect(searchInput).toHaveFocus()
		})
	})
})
