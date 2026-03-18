import { useRef, useState, useEffect, useCallback } from 'react'

interface UseAudioPlayerOptions {
	onError?: (error: { message: string; path: string }) => void
	onEnded?: () => void
	initialVolume?: number
}

// Start appending the next track this many seconds before the current one ends.
const GAPLESS_THRESHOLD = 3

export function useAudioPlayer(options?: UseAudioPlayerOptions) {
	const optionsRef = useRef(options)
	optionsRef.current = options

	// ─── Audio element ────────────────────────────────────────────────────────
	const audioRef = useRef<HTMLAudioElement | null>(null)

	// ─── MSE state ────────────────────────────────────────────────────────────
	const msRef = useRef<MediaSource | null>(null)
	const msUrlRef = useRef<string | null>(null)
	const sbRef = useRef<SourceBuffer | null>(null)
	const currentMimeRef = useRef<string>('')

	// Track timeline: audio.currentTime is absolute (accumulates across tracks).
	// We expose time relative to the current track start.
	const trackOffsetRef = useRef<number>(0) // abs seconds where current track started
	const trackDurationRef = useRef<number>(0) // duration of current track

	// Gapless handshake: path that has already been appended to the SourceBuffer
	const gaplessNextPathRef = useRef<string | null>(null)
	// Prevent double-firing onEnded at the track boundary
	const transitionFiredRef = useRef<boolean>(false)
	// Guard against scheduling the gapless append more than once
	const appendScheduledRef = useRef<boolean>(false)

	// Next track pre-fetched from main process (getMsData)
	const pendingNextRef = useRef<{
		path: string
		data: ArrayBuffer
		mimeType: string
		duration: number // filled after gapless append updateend
	} | null>(null)

	// Generation counters to discard stale async results
	const playGenRef = useRef<number>(0)
	const preloadGenRef = useRef<number>(0)

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

	// startRaf defines tick inline so it reads fresh refs on every frame.
	const startRaf = useCallback(() => {
		stopRaf()
		const tick = () => {
			const audio = audioRef.current
			if (!audio) {
				rafRef.current = requestAnimationFrame(tick)
				return
			}

			const abs = audio.currentTime
			const rel = abs - trackOffsetRef.current
			const dur = trackDurationRef.current

			setCurrentTime(rel >= 0 ? rel : 0)

			// ── Gapless: append next track ~GAPLESS_THRESHOLD s before end ──────
			// Only attempt if the MediaSource is still open (not ended via endOfStream).
			const sb = sbRef.current
			if (dur > 0 && !appendScheduledRef.current && pendingNextRef.current && rel >= dur - GAPLESS_THRESHOLD && sb && !sb.updating && msRef.current?.readyState === 'open') {
				appendScheduledRef.current = true
				const next = pendingNextRef.current
				const gaplessStart = trackOffsetRef.current + dur

				try {
					// Same MIME → append directly.
					// Different MIME → try changeType (same container family);
					// if it throws (incompatible codec) fall back to non-gapless.
					if (next.mimeType !== currentMimeRef.current) {
						try {
							;(sb as any).changeType(next.mimeType)
							currentMimeRef.current = next.mimeType
						} catch {
							// Incompatible codec transition — give up on gapless append.
							appendScheduledRef.current = false
							rafRef.current = requestAnimationFrame(tick)
							return
						}
					}

					sb.timestampOffset = gaplessStart
					sb.appendBuffer(next.data)
					gaplessNextPathRef.current = next.path

					sb.addEventListener(
						'updateend',
						() => {
							try {
								const len = sb.buffered.length
								if (len > 0 && pendingNextRef.current) {
									pendingNextRef.current.duration = sb.buffered.end(len - 1) - gaplessStart
								}
							} catch {
								/* ignore */
							}
						},
						{ once: true },
					)
				} catch {
					appendScheduledRef.current = false
				}
			}

			// ── Transition: fire onEnded when crossing the track boundary ────────
			if (dur > 0 && !transitionFiredRef.current && rel >= dur) {
				transitionFiredRef.current = true
				const next = pendingNextRef.current
				if (next) {
					trackOffsetRef.current += dur
					trackDurationRef.current = next.duration > 0 ? next.duration : 0
					setDuration(trackDurationRef.current)
					pendingNextRef.current = null
					appendScheduledRef.current = false
				}
				optionsRef.current?.onEnded?.()
			}

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
		}
		return audioRef.current
	}, [volume])

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
			if (msRef.current) {
				try {
					if (msRef.current.readyState === 'open') msRef.current.endOfStream()
				} catch {
					/* ignore */
				}
			}
			if (msUrlRef.current) {
				URL.revokeObjectURL(msUrlRef.current)
				msUrlRef.current = null
			}
		}
	}, [stopRaf])

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

	// ─── Shared MSE teardown ──────────────────────────────────────────────────
	const teardownMse = useCallback(() => {
		if (msRef.current) {
			try {
				if (msRef.current.readyState === 'open') msRef.current.endOfStream()
			} catch {
				/* ignore */
			}
		}
		if (msUrlRef.current) {
			URL.revokeObjectURL(msUrlRef.current)
			msUrlRef.current = null
		}
		msRef.current = null
		sbRef.current = null
		trackOffsetRef.current = 0
		trackDurationRef.current = 0
		transitionFiredRef.current = false
		appendScheduledRef.current = false
		pendingNextRef.current = null
		gaplessNextPathRef.current = null
	}, [])

	// ─── handlePlay ───────────────────────────────────────────────────────────
	const handlePlay = useCallback(
		async (songPath: string) => {
			const gen = ++playGenRef.current
			preloadGenRef.current++ // cancel any in-flight preloadNext

			// Mark new path immediately — prevents App.tsx sync effect from
			// seeing a path mismatch and re-triggering handlePlay mid-load.
			setPlayingPath(songPath)

			// ── Gapless fast path ──────────────────────────────────────────────────
			// The next track was already appended to the SourceBuffer; audio is
			// already playing. Just update display state and reset transition guards.
			if (gaplessNextPathRef.current === songPath) {
				gaplessNextPathRef.current = null
				transitionFiredRef.current = false
				setDuration(trackDurationRef.current)
				// RAF is already running; isPlaying is already true.
				return
			}

			// ── Full reset path ────────────────────────────────────────────────────
			const audio = getAudio()
			audio.pause()
			audio.onended = null
			audio.onerror = null
			audio.ondurationchange = null
			audio.src = ''
			stopRaf()
			setIsPlaying(false)
			setCurrentTime(0)
			setDuration(0)
			teardownMse()

			// Fetch MSE-ready bytes from main process (converts FLAC→fMP4, OGG→WebM)
			let msData: { data: ArrayBuffer; mimeType: string } | null = null
			try {
				msData = await window.electronAPI.getMsData(songPath)
				if (gen !== playGenRef.current) return
				if (!msData) {
					optionsRef.current?.onError?.({ message: 'Failed to load audio file. The file may be missing or moved.', path: songPath })
					return
				}
			} catch {
				if (gen !== playGenRef.current) return
				optionsRef.current?.onError?.({ message: 'An error occurred while loading the audio file.', path: songPath })
				return
			}

			if (gen !== playGenRef.current) return

			// Create MediaSource and wait for sourceopen + initial append
			const ms = new MediaSource()
			const url = URL.createObjectURL(ms)
			msRef.current = ms
			msUrlRef.current = url
			currentMimeRef.current = msData.mimeType

			// Set ondurationchange BEFORE audio.src so we catch the durationchange
			// fired by ms.endOfStream() inside the updateend callback below.
			audio.ondurationchange = () => {
				const d = audio.duration
				if (isFinite(d) && d > 0) {
					trackDurationRef.current = d
					setDuration(d)
				}
			}

			const appendError = await new Promise<string | null>((resolve) => {
				const onOpen = () => {
					if (gen !== playGenRef.current) {
						resolve('superseded')
						return
					}
					try {
						const sb = ms.addSourceBuffer(msData!.mimeType)
						sbRef.current = sb

						sb.addEventListener(
							'updateend',
							() => {
								// endOfStream signals the browser that all data is appended.
								// The browser then sets audio.duration to the real buffered
								// duration and fires durationchange — caught by ondurationchange above.
								// Without this, audio.duration stays Infinity and audio.onended never fires.
								try {
									if (ms.readyState === 'open') ms.endOfStream()
								} catch {
									/* ignore */
								}
								resolve(null)
							},
							{ once: true },
						)

						sb.addEventListener(
							'error',
							(e) => {
								console.error('[MSE] SourceBuffer error', e)
								resolve('SourceBuffer error')
							},
							{ once: true },
						)
						sb.appendBuffer(msData!.data)
					} catch (e: any) {
						console.error('[MSE] addSourceBuffer/appendBuffer threw:', e)
						resolve(e?.message ?? 'append error')
					}
				}
				ms.addEventListener('sourceopen', onOpen, { once: true })
				ms.addEventListener('error', () => resolve('MediaSource error'), { once: true })
				audio.src = url
			})

			if (gen !== playGenRef.current) return
			if (appendError) {
				console.error(
					'[MSE] append failed:',
					appendError,
					'| mime:',
					msData.mimeType,
					'| bytes:',
					(msData.data as any).byteLength ?? (msData.data as any).length,
				)
				optionsRef.current?.onError?.({ message: 'An error occurred while loading the audio file.', path: songPath })
				return
			}

			audio.onerror = () => {
				if (gen !== playGenRef.current) return
				console.error('[MSE] audio.error:', audio.error?.code, audio.error?.message)
				optionsRef.current?.onError?.({ message: 'An error occurred while loading the audio file.', path: songPath })
			}

			// Fires at natural end even without window focus (unlike requestAnimationFrame).
			// transitionFiredRef prevents double-fire when RAF also detects the boundary.
			audio.onended = () => {
				if (gen !== playGenRef.current) return
				if (!transitionFiredRef.current) {
					transitionFiredRef.current = true
					optionsRef.current?.onEnded?.()
				}
			}

			try {
				await audio.play()
			} catch (e) {
				if (gen !== playGenRef.current) return
				console.error('[MSE] audio.play() threw:', e)
				optionsRef.current?.onError?.({ message: 'An error occurred while loading the audio file.', path: songPath })
				return
			}

			if (gen !== playGenRef.current) {
				audio.pause()
				return
			}

			setIsPlaying(true)
			startRaf()
		},
		[getAudio, stopRaf, startRaf, teardownMse],
	)

	// ─── preloadNext ──────────────────────────────────────────────────────────
	const preloadNext = useCallback(async (songPath: string) => {
		if (pendingNextRef.current?.path === songPath) return // already ready
		pendingNextRef.current = null
		appendScheduledRef.current = false

		const gen = ++preloadGenRef.current
		try {
			const msData = await window.electronAPI.getMsData(songPath)
			if (gen !== preloadGenRef.current) return
			if (!msData) return
			pendingNextRef.current = { path: songPath, data: msData.data, mimeType: msData.mimeType, duration: 0 }
		} catch {
			// Preload failed silently — playback continues without gapless
		}
	}, [])

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
		teardownMse()
		setIsPlaying(false)
		setPlayingPath(null)
		setCurrentTime(0)
		setDuration(0)
	}, [stopRaf, teardownMse])

	// ─── seekTo ──────────────────────────────────────────────────────────────
	const seekTo = useCallback((time: number) => {
		const audio = audioRef.current
		if (!audio || !audio.src) return
		const clamped = Math.max(0, Math.min(time, trackDurationRef.current))
		audio.currentTime = trackOffsetRef.current + clamped
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
		preloadNext,
	}
}
