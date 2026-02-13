import React from 'react'
import { useTranslation } from 'react-i18next'
import { FolderOpenIcon, ArrowClockwiseIcon, XIcon, TrashIcon } from '@phosphor-icons/react'
import './_settings.scss'

interface SettingsProps {
	isOpen: boolean
	onClose: () => void
	folderPath: string | null
	lastUpdated: string | null
	onSelectFolder: () => void
	onRescanFolder: () => void
	onCleanupMissingFiles: () => void
	theme: 'light' | 'dark' | 'system'
	onSetTheme: (theme: 'light' | 'dark' | 'system') => void
	language: 'en' | 'es' | 'system'
	onSetLanguage: (language: 'en' | 'es' | 'system') => void
	isScanning?: boolean
	scanProgress?: { current: number; total: number }
}

const Settings: React.FC<SettingsProps> = ({ isOpen, onClose, folderPath, lastUpdated, onSelectFolder, onRescanFolder, onCleanupMissingFiles, theme, onSetTheme, language, onSetLanguage, isScanning, scanProgress }) => {
	const { t, i18n } = useTranslation()

	if (!isOpen) return null

	const formatDate = (dateString: string | null) => {
		if (!dateString) return t('settings.never')
		const date = new Date(dateString)
		if (isNaN(date.getTime())) return t('settings.invalidDate')
		return new Intl.DateTimeFormat(i18n.resolvedLanguage, {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		}).format(date)
	}

	const getDisplayPath = (path: string | null) => {
		if (!path) return t('settings.noFolderSelected')
		// Show full path
		return path
	}

	return (
		<div className="settings-overlay">
			<div className="settings">
				<div className="settings__header">
					<h2 className="settings__title">{t('settings.title')}</h2>
					<button className="btn btn--close" onClick={onClose} title={t('settings.close')}>
						<XIcon size={20} />
					</button>
				</div>

				<div className="settings__content">
					<section className="settings__section">
						<h3 className="settings__section-title">{t('settings.appearance')}</h3>
						<div className="settings__field">
							<label className="settings__label">{t('settings.theme')}</label>
							<div className="settings__theme-options">
								<button
									className={`btn ${theme === 'light' ? 'btn--primary' : 'btn--secondary'}`}
									onClick={() => onSetTheme('light')}
								>
									{t('settings.light')}
								</button>
								<button
									className={`btn ${theme === 'dark' ? 'btn--primary' : 'btn--secondary'}`}
									onClick={() => onSetTheme('dark')}
								>
									{t('settings.dark')}
								</button>
								<button
									className={`btn ${theme === 'system' ? 'btn--primary' : 'btn--secondary'}`}
									onClick={() => onSetTheme('system')}
								>
									{t('settings.system')}
								</button>
							</div>
						</div>
					</section>

					<section className="settings__section">
						<h3 className="settings__section-title">{t('settings.language')}</h3>
						<div className="settings__field">
							<label className="settings__label">{t('settings.languageLabel')}</label>
							<div className="settings__theme-options">
								<button
									className={`btn ${language === 'en' ? 'btn--primary' : 'btn--secondary'}`}
									onClick={() => onSetLanguage('en')}
								>
									English
								</button>
								<button
									className={`btn ${language === 'es' ? 'btn--primary' : 'btn--secondary'}`}
									onClick={() => onSetLanguage('es')}
								>
									Español
								</button>
								<button
									className={`btn ${language === 'system' ? 'btn--primary' : 'btn--secondary'}`}
									onClick={() => onSetLanguage('system')}
								>
									{t('settings.system')}
								</button>
							</div>
						</div>
					</section>

					<section className="settings__section">
						<h3 className="settings__section-title">{t('settings.musicLibrary')}</h3>

						<div className="settings__field">
							<label className="settings__label">{t('settings.libraryFolder')}</label>
							<div className="settings__folder-info">
								<input
									type="text"
									className={`settings__folder-path ${folderPath ? 'has-value' : ''}`}
									value={getDisplayPath(folderPath)}
									readOnly
									placeholder={t('settings.noFolderSelected')}
									title={folderPath || t('settings.noFolderSelected')}
								/>
								<button className="btn btn--primary" onClick={onSelectFolder} title={t('settings.selectMusicFolder')}>
									<FolderOpenIcon size={16} />
									{folderPath ? t('settings.changeFolder') : t('settings.importFolder')}
								</button>
							</div>
						</div>

						<div className="settings__field">
							<label className="settings__label">{t('settings.lastUpdated')}</label>
							<div className="settings__info-row">
								<span className="settings__last-updated">{formatDate(lastUpdated)}</span>
								{isScanning && scanProgress ? (
									<div className="settings__scan-progress">
										<div className="settings__scan-progress-header">
											<span>{t('settings.scanning')}</span>
											<span>{scanProgress.current} / {scanProgress.total}</span>
										</div>
										<progress
											className="settings__scan-progress-bar"
											value={scanProgress.current}
											max={scanProgress.total > 0 ? scanProgress.total : 1}
										/>
									</div>
								) : (
									<button className="btn btn--secondary" onClick={onRescanFolder} disabled={!folderPath} title={t('settings.rescanTitle')}>
										<ArrowClockwiseIcon size={16} />
										{t('settings.rescan')}
									</button>
								)}
							</div>
						</div>

						<div className="settings__field">
							<label className="settings__label">{t('settings.maintenance')}</label>
							<div className="settings__info-row">
								<span className="settings__maintenance-info">{t('settings.maintenanceInfo')}</span>
								<button className="btn btn--secondary" onClick={onCleanupMissingFiles} disabled={!folderPath} title={t('settings.cleanUpTitle')}>
									<TrashIcon size={16} />
									{t('settings.cleanUpMissingFiles')}
								</button>
							</div>
						</div>
					</section>
				</div>
			</div>
		</div>
	)
}

export default Settings
