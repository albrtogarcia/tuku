import React, { forwardRef } from 'react'
import { TableVirtuoso } from 'react-virtuoso'
import './_songs-table.scss'
import { formatTime } from '../../utils'

export interface SongsTableColumn {
	key: string
	label: string
	editable?: boolean
	sortable?: boolean
}

interface SongsTableProps {
	songs: Array<any>
	columns: SongsTableColumn[]
	sortKey?: string
	sortAsc?: boolean
	onSort?: (key: string) => void
	onEdit?: (songId: string, key: string, value: string) => void
	onDoubleClick?: (song: any) => void
	onRightClick?: (song: any, event: React.MouseEvent) => void
}

// Define components outside to prevent re-renders
const TableComponent = forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>((props, ref) => (
	<table {...props} ref={ref} className="songs-table" />
))

const TableRowComponent = (props: any) => {
	const { item: song, context } = props
	return (
		<tr
			{...props}
			className="songs-table__row"
			onDoubleClick={() => context.onDoubleClick?.(song)}
			onContextMenu={(e) => context.onRightClick?.(song, e)}
		/>
	)
}

const SongsTable: React.FC<SongsTableProps> = ({ songs, columns, sortKey, sortAsc, onSort, onEdit, onDoubleClick, onRightClick }) => {

	const fixedHeaderContent = () => (
		<tr>
			{columns.map((col) => (
				<th key={col.key} onClick={() => col.sortable && onSort?.(col.key)}>
					{col.label}
				</th>
			))}
		</tr>
	)

	const itemContent = (index: number, song: any) => (
		<>
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
		</>
	)

	return (
		<div className="table-container">
			<TableVirtuoso
				style={{ height: '100%' }}
				data={songs}
				fixedHeaderContent={fixedHeaderContent}
				itemContent={itemContent}
				components={{
					Table: TableComponent,
					TableRow: TableRowComponent
				}}
				context={{ onDoubleClick, onRightClick }}
			/>
		</div>
	)
}

export default SongsTable
