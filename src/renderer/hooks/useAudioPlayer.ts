import { useRef, useState, useEffect } from 'react'

export function useAudioPlayer() {
	const audioRef = useRef<HTMLAudioElement>(null)
	const [audioUrl, setAudioUrl] = useState<string | null>(null)
	const [prevAudioUrl, setPrevAudioUrl] = useState<string | null>(null)
	const [isPlaying, setIsPlaying] = useState(false)
	const [pendingPlay, setPendingPlay] = useState(false)
	const [currentTime, setCurrentTime] = useState(0)
	const [duration, setDuration] = useState(0)
	const [playingPath, setPlayingPath] = useState<string | null>(null)

	const handlePlay = async (songPath: string) => {
		console.log('[AUDIO] handlePlay called for', songPath)
		const buffer = await window.electronAPI.getAudioBuffer(songPath)
		if (buffer) {
			if (audioUrl) setPrevAudioUrl(audioUrl) // Guardar el anterior para revocarlo después
			const blob = new Blob([buffer])
			const url = URL.createObjectURL(blob)
			console.log('[AUDIO] New audioUrl generated:', url)
			setAudioUrl(url)
			setPlayingPath(songPath)
			setPendingPlay(true)
			setIsPlaying(true)
		} else {
			console.warn('[AUDIO] No buffer received for', songPath)
		}
	}

	// Revocar el audioUrl anterior solo después de que el nuevo esté en uso
	useEffect(() => {
		if (prevAudioUrl && prevAudioUrl !== audioUrl) {
			URL.revokeObjectURL(prevAudioUrl)
			setPrevAudioUrl(null)
		}
	}, [audioUrl, prevAudioUrl])

	const handlePause = () => {
		console.log('[AUDIO] handlePause called')
		audioRef.current?.pause()
		setIsPlaying(false)
	}

	const handleResume = () => {
		console.log('[AUDIO] handleResume called')
		audioRef.current?.play()
		setIsPlaying(true)
	}

	const handleCanPlay = () => {
		console.log('[AUDIO] handleCanPlay, pendingPlay:', pendingPlay)
		if (pendingPlay && audioRef.current) {
			audioRef.current.play()
			setPendingPlay(false)
		}
	}

	const handleStop = () => {
		console.log('[AUDIO] handleStop called')
		audioRef.current?.pause()
		if (audioRef.current) audioRef.current.currentTime = 0
		setPlayingPath(null)
		if (audioUrl) {
			setPrevAudioUrl(audioUrl)
			setAudioUrl(null)
		}
		setIsPlaying(false)
	}

	return {
		audioRef,
		audioUrl,
		isPlaying,
		pendingPlay,
		currentTime,
		setCurrentTime,
		duration,
		setDuration,
		playingPath,
		setPlayingPath,
		handlePlay,
		handlePause,
		handleResume,
		handleCanPlay,
		handleStop,
	}
}
