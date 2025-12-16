import './_notification.scss'

type NotificationType = 'error' | 'success' | 'info'

interface NotificationProps {
	message: string
	type?: NotificationType
	onClose?: () => void
}

const Notification = ({ message, type = 'info', onClose }: NotificationProps) => {
	return (
		<div className={`notification notification--${type}`} role="status" aria-live="polite">
			<span className="notification__message">{message}</span>
			{onClose && (
				<button className="notification__close" onClick={onClose} aria-label="Close notification">
					&times;
				</button>
			)}
		</div>
	)
}

export default Notification
