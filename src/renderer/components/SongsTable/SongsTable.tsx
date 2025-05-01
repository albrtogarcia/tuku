import React from 'react'
import './_songs-table.scss'
import { formatTime } from '../../utils'

export interface SongsTableColumn {
	key: string
	label: string
	editable?: boolean
	sortable?: boolean
}

interface SongsTableProps {
	songs: Array<any> // Reemplaza 'any' por el tipo de canción si lo tienes tipado
	columns: SongsTableColumn[]
	onSort?: (key: string) => void
	onEdit?: (songId: string, key: string, value: string) => void
}

const SongsTable: React.FC<SongsTableProps> = ({ songs, columns, onSort, onEdit }) => {
	return (
		<div className="table-container">
			<table className="songs-table">
				<thead>
					<tr>
						{columns.map((col) => (
							<th key={col.key} onClick={() => col.sortable && onSort?.(col.key)}>
								{col.label}
								{col.sortable && <span className="sortable-indicator">⇅</span>}
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{songs.map((song, idx) => (
						<tr key={song.id || idx}>
							{columns.map((col) => (
								<td key={col.key}>
									{col.key === 'duration' ? (
										formatTime(song[col.key])
									) : col.editable ? (
										<input type="text" value={song[col.key]} onChange={(e) => onEdit?.(song.id, col.key, e.target.value)} />
									) : (
										song[col.key]
									)}
								</td>
							))}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	)
}

export default SongsTable
