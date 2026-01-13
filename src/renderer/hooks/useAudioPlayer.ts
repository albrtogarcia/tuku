import { useRef, useState, useEffect, useCallback } from 'react'

interface UseAudioPlayerOptions {
	onError?: (error: { message: string; path: string }) => void
}

export function useAudioPlayer(options?: UseAudioPlayerOptions) {
	const audioRef = useRef<HTMLAudioElement>(null)
	const [audioUrl, setAudioUrl] = useState<string | null>(null)
	const [prevAudioUrl, setPrevAudioUrl] = useState<string | null>(null)
	const [isPlaying, setIsPlaying] = useState(false)
	const [pendingPlay, setPendingPlay] = useState(false)
	const [currentTime, setCurrentTime] = useState(0)
	const [duration, setDuration] = useState(0)
	const [playingPath, setPlayingPath] = useState<string | null>(null)
	const [volume, setVolume] = useState(0.5)

	// Enhanced setCurrentTime that also updates the audio element (for user interactions)
	const setCurrentTimeWithSeek = (time: number) => {
		const validTime = Math.max(0, Math.min(time, duration || 0))
		setCurrentTime(validTime)

		if (audioRef.current && !isNaN(validTime) && validTime >= 0 && audioRef.current.duration) {
			try {
				audioRef.current.currentTime = validTime
			} catch (error) {
				// Error setting currentTime
			}
		}
	}

	// Regular setCurrentTime for automatic updates (no audio element modification)
	const setCurrentTimeOnly = (time: number) => {
		setCurrentTime(time)
	}

	const handlePlay = useCallback(async (songPath: string) => {
		try {
			const buffer = await window.electronAPI.getAudioBuffer(songPath)
			if (buffer) {
				if (audioUrl) setPrevAudioUrl(audioUrl) // Save previous for cleanup later
				const blob = new Blob([buffer])
				const url = URL.createObjectURL(blob)
				setAudioUrl(url)
				setPlayingPath(songPath)
				setPendingPlay(true)
				setIsPlaying(true)
			} else {
				// File could not be loaded (missing, moved, or permission error)
				console.error(`[useAudioPlayer] Failed to load audio file: ${songPath}`)
				options?.onError?.({
					message: 'Failed to load audio file. The file may be missing or moved.',
					path: songPath
				})
			}
		} catch (error) {
			console.error(`[useAudioPlayer] Error loading audio file: ${songPath}`, error)
			options?.onError?.({
				message: 'An error occurred while loading the audio file.',
				path: songPath
			})
		}
	}, [audioUrl, options])

	// Cleanup previous audioUrl only after new one is in use
	useEffect(() => {
		if (prevAudioUrl && prevAudioUrl !== audioUrl) {
			URL.revokeObjectURL(prevAudioUrl)
			setPrevAudioUrl(null)
		}
	}, [audioUrl, prevAudioUrl])

	// Sync volume with audio element
	useEffect(() => {
		if (audioRef.current) {
			audioRef.current.volume = volume
		}
	}, [volume])

	const handlePause = useCallback(() => {
		audioRef.current?.pause()
		setIsPlaying(false)
	}, [])

	const handleResume = useCallback(() => {
		audioRef.current?.play()
		setIsPlaying(true)
	}, [])

	const handleCanPlay = useCallback(() => {
		if (pendingPlay && audioRef.current && audioRef.current.readyState >= 3) {
			audioRef.current.play().catch((error) => {
				setIsPlaying(false)
			})
			setPendingPlay(false)
		}
	}, [pendingPlay])

	const handleStop = useCallback(() => {
		audioRef.current?.pause()
		if (audioRef.current) audioRef.current.currentTime = 0
		setPlayingPath(null)
		if (audioUrl) {
			setPrevAudioUrl(audioUrl)
			setAudioUrl(null)
		}
		setIsPlaying(false)
	}, [audioUrl])

	return {
		audioRef,
		audioUrl,
		isPlaying,
		setIsPlaying,
		pendingPlay,
		currentTime,
		setCurrentTime: setCurrentTimeWithSeek,
		setCurrentTimeOnly,
		duration,
		setDuration,
		playingPath,
		setPlayingPath,
		handlePlay,
		handlePause,
		handleResume,
		handleCanPlay,
		handleStop,
		volume,
		setVolume,
	}
}
