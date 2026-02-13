import { useTranslation } from 'react-i18next'
import './_scan-progress.scss'

interface ScanProgressProps {
	current: number
	total: number
}

const ScanProgress = ({ current, total }: ScanProgressProps) => {
	const { t } = useTranslation()
	const safeTotal = total > 0 ? total : 1

	return (
		<div className="scan-progress" role="status" aria-live="polite">
			<div className="scan-progress__header">
				<span>{t('notifications.scanningLibrary')}</span>
				<span>
					{current} / {total}
				</span>
			</div>
			<progress className="scan-progress__bar" value={current} max={safeTotal} />
		</div>
	)
}

export default ScanProgress
