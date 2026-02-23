import React, { useState } from 'react'
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

type Section = 'appearance' | 'library'

const Settings: React.FC<SettingsProps> = ({
	isOpen,
	onClose,
	folderPath,
	lastUpdated,
	onSelectFolder,
	onRescanFolder,
	onCleanupMissingFiles,
	theme,
	onSetTheme,
	language,
	onSetLanguage,
	isScanning,
	scanProgress,
}) => {
	const { t, i18n } = useTranslation()
	const [activeSection, setActiveSection] = useState<Section>('appearance')

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

	const sectionTitles: Record<Section, string> = {
		appearance: t('settings.appearance'),
		library: t('settings.musicLibrary'),
	}

	const navItems: { key: Section; label: string }[] = [
		{ key: 'appearance', label: t('settings.appearance') },
		{ key: 'library', label: t('settings.musicLibrary') },
	]

	return (
		<div className="settings-overlay">
			<div className="settings">
				<nav className="settings__sidebar">
					{navItems.map(({ key, label }) => (
						<button key={key} className={`settings__nav-item${activeSection === key ? ' active' : ''}`} onClick={() => setActiveSection(key)}>
							{label}
						</button>
					))}
				</nav>

				<div className="settings__panel">
					<div className="settings__panel-header">
						<h2 className="settings__title sr-only">{sectionTitles[activeSection]}</h2>
						<button className="btn btn--close" onClick={onClose} title={t('settings.close')}>
							<XIcon size={20} />
						</button>
					</div>

					{activeSection === 'appearance' && (
						<>
							<div className="settings__field">
								<label className="settings__label" htmlFor="settings-theme">
									{t('settings.theme')}
								</label>
								<select
									id="settings-theme"
									className="settings__select"
									value={theme}
									onChange={(e) => onSetTheme(e.target.value as 'light' | 'dark' | 'system')}
								>
									<option value="light">{t('settings.light')}</option>
									<option value="dark">{t('settings.dark')}</option>
									<option value="system">{t('settings.system')}</option>
								</select>
							</div>
							<div className="settings__field">
								<label className="settings__label" htmlFor="settings-language">
									{t('settings.languageLabel')}
								</label>
								<select
									id="settings-language"
									className="settings__select"
									value={language}
									onChange={(e) => onSetLanguage(e.target.value as 'en' | 'es' | 'system')}
								>
									<option value="en">English</option>
									<option value="es">Español</option>
									<option value="system">{t('settings.system')}</option>
								</select>
							</div>
						</>
					)}

					{activeSection === 'library' && (
						<>
							<div className="settings__field">
								<label className="settings__label">{t('settings.libraryFolder')}</label>
								<div className="settings__folder-info">
									<input
										type="text"
										className={`settings__folder-path ${folderPath ? 'has-value' : ''}`}
										value={folderPath || t('settings.noFolderSelected')}
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
												<span>
													{scanProgress.current} / {scanProgress.total}
												</span>
											</div>
											<progress className="settings__scan-progress-bar" value={scanProgress.current} max={scanProgress.total > 0 ? scanProgress.total : 1} />
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
						</>
					)}
				</div>
			</div>
		</div>
	)
}

export default Settings
