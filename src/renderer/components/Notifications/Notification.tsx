import { useTranslation } from 'react-i18next'
import './_notification.scss'

type NotificationType = 'error' | 'success' | 'info'

interface NotificationProps {
	message: string
	type?: NotificationType
	onClose?: () => void
}

const Notification = ({ message, type = 'info', onClose }: NotificationProps) => {
	const { t } = useTranslation()

	return (
		<div className={`notification notification--${type}`} role="status" aria-live="polite">
			<span className="notification__message">{message}</span>
			{onClose && (
				<button className="notification__close" onClick={onClose} aria-label={t('notifications.closeNotification')}>
					&times;
				</button>
			)}
		</div>
	)
}

export default Notification
