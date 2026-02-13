import { useTranslation } from 'react-i18next'
import { FolderOpenIcon, MusicNotesIcon } from '@phosphor-icons/react'
import './_onboarding.scss'

interface OnboardingProps {
	isOpen: boolean
	onSelectFolder: () => void
	isScanning: boolean
	scanProgress: { current: number; total: number }
}

const Onboarding = ({ isOpen, onSelectFolder, isScanning, scanProgress }: OnboardingProps) => {
	const { t } = useTranslation()

	if (!isOpen) return null

	return (
		<div className="onboarding-overlay">
			<div className="onboarding">
				<div className="onboarding__icon">
					<MusicNotesIcon size={48} weight="duotone" />
				</div>
				<h1 className="onboarding__title">{t('onboarding.welcome')}</h1>
				<p className="onboarding__subtitle">{t('onboarding.subtitle')}</p>

				{isScanning ? (
					<div className="onboarding__progress">
						<div className="onboarding__progress-header">
							<span>{t('onboarding.scanning')}</span>
							<span>
								{scanProgress.current} / {scanProgress.total}
							</span>
						</div>
						<progress className="onboarding__progress-bar" value={scanProgress.current} max={scanProgress.total > 0 ? scanProgress.total : 1} />
					</div>
				) : (
					<button className="btn btn--primary onboarding__button" onClick={onSelectFolder}>
						<FolderOpenIcon size={18} />
						{t('onboarding.importFolder')}
					</button>
				)}
			</div>
		</div>
	)
}

export default Onboarding
