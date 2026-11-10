import { useRef, useState, useEffect, useCallback } from 'react'

interface UseAudioPlayerOptions {
	onError?: (error: { message: string; path: string }) => void
	onEnded?: () => void
	initialVolume?: number
}

export function useAudioPlayer(options?: UseAudioPlayerOptions) {
	const optionsRef = useRef(options)
	optionsRef.current = options

	// ─── Audio element ────────────────────────────────────────────────────────
	const audioRef = useRef<HTMLAudioElement | null>(null)
	const blobUrlRef = useRef<string | null>(null)

	// Generation counter to discard stale async results
	const playGenRef = useRef<number>(0)

	// ─── Web Audio API (declicking) ───────────────────────────────────────────
	const audioCtxRef = useRef<AudioContext | null>(null)
	const gainNodeRef = useRef<GainNode | null>(null)

	// ─── React state ─────────────────────────────────────────────────────────
	const [isPlaying, setIsPlaying] = useState(false)
	const [currentTime, setCurrentTime] = useState(0)
	const [duration, setDuration] = useState(0)
	const [playingPath, setPlayingPath] = useState<string | null>(null)
	const [volume, setVolumeState] = useState(options?.initialVolume ?? 0.25)

	// ─── RAF ──────────────────────────────────────────────────────────────────
	const rafRef = useRef<number>(0)

	const stopRaf = useCallback(() => {
		if (rafRef.current) {
			cancelAnimationFrame(rafRef.current)
			rafRef.current = 0
		}
	}, [])

	useEffect(() => () => stopRaf(), [stopRaf])

	const startRaf = useCallback(() => {
		stopRaf()
		const tick = () => {
			const audio = audioRef.current
			if (audio) setCurrentTime(audio.currentTime)
			rafRef.current = requestAnimationFrame(tick)
		}
		rafRef.current = requestAnimationFrame(tick)
	}, [stopRaf])

	// ─── Audio element init ───────────────────────────────────────────────────
	const getAudio = useCallback((): HTMLAudioElement => {
		if (!audioRef.current) {
			const el = document.createElement('audio')
			el.volume = volume
			el.style.display = 'none'
			document.body.appendChild(el)
			audioRef.current = el

			try {
				const ctx = new AudioContext()
				const gain = ctx.createGain()
				gain.gain.setValueAtTime(1, ctx.currentTime)
				ctx.createMediaElementSource(el).connect(gain)
				gain.connect(ctx.destination)
				audioCtxRef.current = ctx
				gainNodeRef.current = gain
			} catch {
				// Web Audio API unavailable — declicking disabled
			}
		}
		return audioRef.current
	}, [volume])

	const revokeBlobUrl = useCallback(() => {
		if (blobUrlRef.current) {
			URL.revokeObjectURL(blobUrlRef.current)
			blobUrlRef.current = null
		}
	}, [])

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			stopRaf()
			const el = audioRef.current
			if (el) {
				el.pause()
				el.src = ''
				el.remove()
				audioRef.current = null
			}
			revokeBlobUrl()
			audioCtxRef.current?.close()
			audioCtxRef.current = null
			gainNodeRef.current = null
		}
	}, [stopRaf, revokeBlobUrl])

	// ─── Volume ───────────────────────────────────────────────────────────────
	const setVolume = useCallback((v: number | ((prev: number) => number)) => {
		setVolumeState((prev) => {
			const next = typeof v === 'function' ? v(prev) : v
			if (audioRef.current) audioRef.current.volume = next
			return next
		})
	}, [])

	useEffect(() => {
		if (audioRef.current) audioRef.current.volume = volume
	}, [volume])

	// ─── Gain helpers for declicking ──────────────────────────────────────────
	const decayGain = useCallback((ms: number): Promise<void> => {
		return new Promise((resolve) => {
			const ctx = audioCtxRef.current
			const gain = gainNodeRef.current
			if (!ctx || !gain) {
				resolve()
				return
			}
			const now = ctx.currentTime
			gain.gain.cancelScheduledValues(now)
			gain.gain.setValueAtTime(gain.gain.value, now)
			gain.gain.linearRampToValueAtTime(0.0001, now + ms / 1000)
			setTimeout(resolve, ms)
		})
	}, [])

	const restoreGain = useCallback((ms: number) => {
		const ctx = audioCtxRef.current
		const gain = gainNodeRef.current
		if (!ctx || !gain) return
		const now = ctx.currentTime
		gain.gain.cancelScheduledValues(now)
		gain.gain.setValueAtTime(0.0001, now)
		if (ms > 0) {
			gain.gain.linearRampToValueAtTime(1, now + ms / 1000)
		} else {
			gain.gain.setValueAtTime(1, now)
		}
	}, [])

	// ─── handlePlay ───────────────────────────────────────────────────────────
	const handlePlay = useCallback(
		async (songPath: string) => {
			const gen = ++playGenRef.current

			// Mark new path immediately — prevents App.tsx sync effect from
			// seeing a path mismatch and re-triggering handlePlay mid-load.
			setPlayingPath(songPath)

			await decayGain(25)
			if (gen !== playGenRef.current) return

			const audio = getAudio()
			audio.pause()
			audio.onended = null
			audio.onerror = null
			audio.ondurationchange = null
			audio.src = ''
			revokeBlobUrl()
			stopRaf()
			setIsPlaying(false)
			setCurrentTime(0)
			setDuration(0)

			let fileBuffer: ArrayBuffer | null = null
			let mimeType = ''
			try {
				;[fileBuffer, mimeType] = await Promise.all([window.electronAPI.getAudioBuffer(songPath), window.electronAPI.getMimeType(songPath)])
			} catch {
				if (gen !== playGenRef.current) return
				optionsRef.current?.onError?.({ message: 'An error occurred while loading the audio file.', path: songPath })
				return
			}

			if (gen !== playGenRef.current) return
			if (!fileBuffer) {
				optionsRef.current?.onError?.({ message: 'Failed to load audio file. The file may be missing or moved.', path: songPath })
				return
			}

			const url = URL.createObjectURL(new Blob([fileBuffer], { type: mimeType }))
			blobUrlRef.current = url

			audio.ondurationchange = () => {
				const audioDuration = audio.duration
				if (isFinite(audioDuration) && audioDuration > 0) setDuration(audioDuration)
			}
			audio.onerror = () => {
				if (gen !== playGenRef.current) return
				console.error('[Audio] audio.error:', audio.error?.code, audio.error?.message)
				optionsRef.current?.onError?.({ message: 'An error occurred while loading the audio file.', path: songPath })
			}
			audio.onended = () => {
				if (gen !== playGenRef.current) return
				optionsRef.current?.onEnded?.()
			}
			audio.src = url

			await audioCtxRef.current?.resume()
			try {
				await audio.play()
			} catch (e) {
				if (gen !== playGenRef.current) return
				console.error('[Audio] audio.play() threw:', e)
				optionsRef.current?.onError?.({ message: 'An error occurred while loading the audio file.', path: songPath })
				return
			}

			if (gen !== playGenRef.current) {
				audio.pause()
				return
			}

			restoreGain(20)
			setIsPlaying(true)
			startRaf()
		},
		[getAudio, stopRaf, startRaf, revokeBlobUrl, decayGain, restoreGain],
	)

	// ─── handlePause ─────────────────────────────────────────────────────────
	const handlePause = useCallback(() => {
		audioRef.current?.pause()
		stopRaf()
		setIsPlaying(false)
	}, [stopRaf])

	// ─── handleResume ────────────────────────────────────────────────────────
	const handleResume = useCallback(async () => {
		const audio = audioRef.current
		if (!audio || !audio.src) return
		try {
			await audioCtxRef.current?.resume()
			await audio.play()
			setIsPlaying(true)
			startRaf()
		} catch {
			// AbortError from rapid play/pause — ignore
		}
	}, [startRaf])

	// ─── handleStop ──────────────────────────────────────────────────────────
	const handleStop = useCallback(() => {
		const audio = audioRef.current
		if (audio) {
			audio.pause()
			audio.onended = null
			audio.onerror = null
			audio.ondurationchange = null
			audio.src = ''
		}
		stopRaf()
		revokeBlobUrl()
		setIsPlaying(false)
		setPlayingPath(null)
		setCurrentTime(0)
		setDuration(0)
	}, [stopRaf, revokeBlobUrl])

	// ─── seekTo ──────────────────────────────────────────────────────────────
	const seekTo = useCallback((time: number) => {
		const audio = audioRef.current
		if (!audio || !audio.src) return
		const maxTime = isFinite(audio.duration) ? audio.duration : time
		const clamped = Math.max(0, Math.min(time, maxTime))
		audio.currentTime = clamped
		setCurrentTime(clamped)
	}, [])

	return {
		isPlaying,
		currentTime,
		setCurrentTime: seekTo,
		duration,
		playingPath,
		volume,
		setVolume,
		handlePlay,
		handlePause,
		handleResume,
		handleStop,
	}
}
