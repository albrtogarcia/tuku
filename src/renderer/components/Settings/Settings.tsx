import React from 'react'
import { FolderOpenIcon, ArrowClockwiseIcon, XIcon } from '@phosphor-icons/react'
import './_settings.scss'

interface SettingsProps {
	isOpen: boolean
	onClose: () => void
	folderPath: string | null
	lastUpdated: string | null
	onSelectFolder: () => void
	onRescanFolder: () => void
}

const Settings: React.FC<SettingsProps> = ({ isOpen, onClose, folderPath, lastUpdated, onSelectFolder, onRescanFolder }) => {
	if (!isOpen) return null

	const formatDate = (dateString: string | null) => {
		if (!dateString) return 'Never'
		return new Intl.DateTimeFormat('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		}).format(new Date(dateString))
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
								<button className="btn btn--secondary" onClick={onRescanFolder} disabled={!folderPath} title="Rescan current folder">
									<ArrowClockwiseIcon size={16} />
									Rescan
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
