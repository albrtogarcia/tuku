import React from 'react'
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
	isScanning?: boolean
	scanProgress?: { current: number; total: number }
}

const Settings: React.FC<SettingsProps> = ({ isOpen, onClose, folderPath, lastUpdated, onSelectFolder, onRescanFolder, onCleanupMissingFiles, theme, onSetTheme, isScanning, scanProgress }) => {
	if (!isOpen) return null

	const formatDate = (dateString: string | null) => {
		if (!dateString) return 'Never'
		const date = new Date(dateString)
		if (isNaN(date.getTime())) return 'Invalid Date'
		return new Intl.DateTimeFormat('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		}).format(date)
	}

	const getDisplayPath = (path: string | null) => {
		if (!path) return 'No folder selected'
		// Show full path
		return path
	}

	return (
		<div className="settings-overlay">
			<div className="settings">
				<div className="settings__header">
					<h2 className="settings__title">Settings</h2>
					<button className="btn btn--close" onClick={onClose} title="Close">
						<XIcon size={20} />
					</button>
				</div>

				<div className="settings__content">
					<section className="settings__section">
						<h3 className="settings__section-title">Appearance</h3>
						<div className="settings__field">
							<label className="settings__label">Theme</label>
							<div className="settings__theme-options">
								<button
									className={`btn ${theme === 'light' ? 'btn--primary' : 'btn--secondary'}`}
									onClick={() => onSetTheme('light')}
								>
									Light
								</button>
								<button
									className={`btn ${theme === 'dark' ? 'btn--primary' : 'btn--secondary'}`}
									onClick={() => onSetTheme('dark')}
								>
									Dark
								</button>
								<button
									className={`btn ${theme === 'system' ? 'btn--primary' : 'btn--secondary'}`}
									onClick={() => onSetTheme('system')}
								>
									System
								</button>
							</div>
						</div>
					</section>

					<section className="settings__section">
						<h3 className="settings__section-title">Music Library</h3>

						<div className="settings__field">
							<label className="settings__label">Library Folder</label>
							<div className="settings__folder-info">
								<input
									type="text"
									className={`settings__folder-path ${folderPath ? 'has-value' : ''}`}
									value={getDisplayPath(folderPath)}
									readOnly
									placeholder="No folder selected"
									title={folderPath || 'No folder selected'}
								/>
								<button className="btn btn--primary" onClick={onSelectFolder} title="Select music folder">
									<FolderOpenIcon size={16} />
									{folderPath ? 'Change Folder' : 'Import Folder'}
								</button>
							</div>
						</div>

						<div className="settings__field">
							<label className="settings__label">Last Updated</label>
							<div className="settings__info-row">
								<span className="settings__last-updated">{formatDate(lastUpdated)}</span>
								{isScanning && scanProgress ? (
									<div className="settings__scan-progress">
										<div className="settings__scan-progress-header">
											<span>Scanning...</span>
											<span>{scanProgress.current} / {scanProgress.total}</span>
										</div>
										<progress
											className="settings__scan-progress-bar"
											value={scanProgress.current}
											max={scanProgress.total > 0 ? scanProgress.total : 1}
										/>
									</div>
								) : (
									<button className="btn btn--secondary" onClick={onRescanFolder} disabled={!folderPath} title="Rescan current folder">
										<ArrowClockwiseIcon size={16} />
										Rescan
									</button>
								)}
							</div>
						</div>

						<div className="settings__field">
							<label className="settings__label">Maintenance</label>
							<div className="settings__info-row">
								<span className="settings__maintenance-info">Remove missing files from library</span>
								<button className="btn btn--secondary" onClick={onCleanupMissingFiles} disabled={!folderPath} title="Remove songs that no longer exist">
									<TrashIcon size={16} />
									Clean Up Missing Files
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
