import React from 'react'

interface SearchBarProps {
	value: string
	onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}

const SearchBar = ({ value, onChange }: SearchBarProps) => (
	<div className="search">
		<input type="search" placeholder="Search songs..." value={value} onChange={onChange} className="search__input" />
	</div>
)

export default SearchBar
