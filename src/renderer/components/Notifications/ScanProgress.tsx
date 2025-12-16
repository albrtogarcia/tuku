import './_scan-progress.scss'

interface ScanProgressProps {
	current: number
	total: number
}

const ScanProgress = ({ current, total }: ScanProgressProps) => {
	const safeTotal = total > 0 ? total : 1

	return (
		<div className="scan-progress" role="status" aria-live="polite">
			<div className="scan-progress__header">
				<span>Scanning Library...</span>
				<span>
					{current} / {total}
				</span>
			</div>
			<progress className="scan-progress__bar" value={current} max={safeTotal} />
		</div>
	)
}

export default ScanProgress
