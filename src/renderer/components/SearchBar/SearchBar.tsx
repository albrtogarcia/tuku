import React from 'react'
import './_searchbar.scss'

interface SearchBarProps {
	value: string
	onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
	placeholder?: string
}

const SearchBar = ({ value, onChange, placeholder }: SearchBarProps) => (
	<div className="search">
		<input
			type="search"
			placeholder={placeholder || "Search songs, artists..."}
			value={value}
			onChange={onChange}
			className="search__input"
		/>
	</div>
)

export default SearchBar
