import { useRef, useState, useEffect, useCallback } from 'react'

interface UseAudioPlayerOptions {
	onError?: (error: { message: string; path: string }) => void
	onEnded?: () => void
	initialVolume?: number
}

/** Convert a Node.js Buffer (Uint8Array subclass) or ArrayBuffer to a detached ArrayBuffer. */
function toArrayBuffer(data: ArrayBuffer | Uint8Array): ArrayBuffer {
	if (data instanceof ArrayBuffer) return data
	return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer
}

export function useAudioPlayer(options?: UseAudioPlayerOptions) {
	// Keep options in a ref so stable callbacks always call the latest version
	const optionsRef = useRef(options)
	optionsRef.current = options

	// ─── Web Audio API ───────────────────────────────────────────────────────
	const ctxRef = useRef<AudioContext | null>(null)
	const gainRef = useRef<GainNode | null>(null)

	// Current playback
	const srcRef = useRef<AudioBufferSourceNode | null>(null)
	const bufferRef = useRef<AudioBuffer | null>(null)
	const srcStartCtxTimeRef = useRef<number>(0) // AudioContext.currentTime when src.start() was called
	const srcStartOffsetRef = useRef<number>(0)  // seconds into buffer when src started
	const pauseOffsetRef = useRef<number>(0)     // position saved on pause

	// Gapless: preloaded & scheduled next track
	const nextSrcRef = useRef<AudioBufferSourceNode | null>(null)
	const nextBufferRef = useRef<AudioBuffer | null>(null)
	const nextPathRef = useRef<string | null>(null)
	const nextScheduledCtxTimeRef = useRef<number>(0)

	// Generation counters to discard stale async results
	const playGenRef = useRef<number>(0)
	const preloadGenRef = useRef<number>(0)

	// Ref mirrors of state for use inside stable callbacks
	const playingPathRef = useRef<string | null>(null)
	const isPlayingRef = useRef<boolean>(false)

	// ─── React state ─────────────────────────────────────────────────────────
	const [isPlaying, setIsPlayingState] = useState(false)
	const [currentTime, setCurrentTime] = useState(0)
	const [duration, setDuration] = useState(0)
	const [playingPath, setPlayingPath] = useState<string | null>(null)
	const [volume, setVolumeState] = useState(options?.initialVolume ?? 0.25)

	// ─── RAF time tracker ────────────────────────────────────────────────────
	const rafRef = useRef<number>(0)

	const stopRaf = useCallback(() => {
		if (rafRef.current) {
			cancelAnimationFrame(rafRef.current)
			rafRef.current = 0
		}
	}, [])

	const startRaf = useCallback(() => {
		stopRaf()
		const tick = () => {
			if (ctxRef.current && bufferRef.current) {
				const elapsed = ctxRef.current.currentTime - srcStartCtxTimeRef.current + srcStartOffsetRef.current
				setCurrentTime(Math.min(Math.max(0, elapsed), bufferRef.current.duration))
			}
			rafRef.current = requestAnimationFrame(tick)
		}
		rafRef.current = requestAnimationFrame(tick)
	}, [stopRaf])

	useEffect(() => () => stopRaf(), [stopRaf])

	// ─── AudioContext init ────────────────────────────────────────────────────
	const getCtx = useCallback((): AudioContext => {
		if (!ctxRef.current || ctxRef.current.state === 'closed') {
			const ctx = new AudioContext()
			const gain = ctx.createGain()
			gain.gain.value = volume
			gain.connect(ctx.destination)
			ctxRef.current = ctx
			gainRef.current = gain
		}
		return ctxRef.current
	}, [volume])

	// ─── Volume ──────────────────────────────────────────────────────────────
	const setVolume = useCallback((v: number | ((prev: number) => number)) => {
		setVolumeState((prev) => {
			const next = typeof v === 'function' ? v(prev) : v
			if (gainRef.current) gainRef.current.gain.value = next
			return next
		})
	}, [])

	useEffect(() => {
		if (gainRef.current) gainRef.current.gain.value = volume
	}, [volume])

	// ─── Internal helpers ─────────────────────────────────────────────────────
	const releaseSource = (source: AudioBufferSourceNode) => {
		source.onended = null
		try { source.stop(0) } catch { /* already stopped */ }
		try { source.disconnect() } catch { /* already disconnected */ }
	}

	const cancelNextSource = useCallback(() => {
		if (nextSrcRef.current) {
			releaseSource(nextSrcRef.current)
			nextSrcRef.current = null
		}
		nextBufferRef.current = null
		nextPathRef.current = null
		nextScheduledCtxTimeRef.current = 0
		preloadGenRef.current++ // invalidate any in-flight preload
	}, [])

	// ─── onSourceEnded (stable - all state via refs) ──────────────────────────
	const onSourceEnded = useCallback(() => {
		stopRaf()

		if (nextSrcRef.current && nextPathRef.current && nextBufferRef.current) {
			// ── Gapless transition: next source is already playing ──
			const oldSrc = srcRef.current
			srcRef.current = nextSrcRef.current
			bufferRef.current = nextBufferRef.current
			srcStartCtxTimeRef.current = nextScheduledCtxTimeRef.current
			srcStartOffsetRef.current = 0
			playingPathRef.current = nextPathRef.current

			// Wire the new source's onended
			srcRef.current.onended = onSourceEnded

			const newDuration = nextBufferRef.current.duration
			nextSrcRef.current = null
			nextBufferRef.current = null
			nextPathRef.current = null
			nextScheduledCtxTimeRef.current = 0

			// Disconnect old (ended) source
			if (oldSrc) try { oldSrc.disconnect() } catch { /* ok */ }

			setDuration(newDuration)
			setCurrentTime(0)
			setPlayingPath(playingPathRef.current)
			startRaf()
		} else {
			// ── No next scheduled: natural end of queue ──
			if (srcRef.current) {
				try { srcRef.current.disconnect() } catch { /* ok */ }
				srcRef.current = null
			}
			playingPathRef.current = null
			isPlayingRef.current = false
			setIsPlayingState(false)
			setPlayingPath(null)
		}

		optionsRef.current?.onEnded?.()
	}, [stopRaf, startRaf]) // stable: accesses everything else via refs

	// ─── handlePlay ───────────────────────────────────────────────────────────
	const handlePlay = useCallback(async (songPath: string) => {
		// Already playing this path (e.g. gapless transition completed before store update)
		if (songPath === playingPathRef.current && srcRef.current) return

		const gen = ++playGenRef.current
		preloadGenRef.current++ // cancel any in-flight preload

		// Cancel scheduled next (different path)
		if (nextSrcRef.current) {
			releaseSource(nextSrcRef.current)
			nextSrcRef.current = null
		}

		// Stop current source
		if (srcRef.current) {
			releaseSource(srcRef.current)
			srcRef.current = null
		}
		stopRaf()

		const ctx = getCtx()
		await ctx.resume()

		// Try to reuse a preloaded buffer for this path
		let buffer: AudioBuffer | null = null
		if (nextPathRef.current === songPath && nextBufferRef.current) {
			buffer = nextBufferRef.current
			nextBufferRef.current = null
			nextPathRef.current = null
		}

		if (!buffer) {
			try {
				const raw = await window.electronAPI.getAudioBuffer(songPath)
				if (gen !== playGenRef.current) return // superseded
				if (!raw) {
					optionsRef.current?.onError?.({ message: 'Failed to load audio file. The file may be missing or moved.', path: songPath })
					return
				}
				buffer = await ctx.decodeAudioData(toArrayBuffer(raw as unknown as ArrayBuffer | Uint8Array))
			} catch {
				if (gen !== playGenRef.current) return
				optionsRef.current?.onError?.({ message: 'An error occurred while loading the audio file.', path: songPath })
				return
			}
		}

		if (gen !== playGenRef.current) return // superseded while decoding

		const src = ctx.createBufferSource()
		src.buffer = buffer
		src.connect(gainRef.current!)
		src.onended = onSourceEnded

		const startCtxTime = ctx.currentTime
		src.start(0, 0)

		srcRef.current = src
		bufferRef.current = buffer
		srcStartCtxTimeRef.current = startCtxTime
		srcStartOffsetRef.current = 0
		pauseOffsetRef.current = 0
		playingPathRef.current = songPath
		isPlayingRef.current = true

		setPlayingPath(songPath)
		setDuration(buffer.duration)
		setCurrentTime(0)
		setIsPlayingState(true)
		startRaf()
	}, [getCtx, onSourceEnded, stopRaf])

	// ─── preloadNext ──────────────────────────────────────────────────────────
	const preloadNext = useCallback(async (songPath: string) => {
		if (nextPathRef.current === songPath && nextBufferRef.current) return // already ready

		// Cancel previous preload
		if (nextSrcRef.current) {
			releaseSource(nextSrcRef.current)
			nextSrcRef.current = null
		}
		nextBufferRef.current = null
		nextPathRef.current = null

		const gen = ++preloadGenRef.current

		try {
			const ctx = getCtx()
			const raw = await window.electronAPI.getAudioBuffer(songPath)
			if (gen !== preloadGenRef.current) return // superseded

			if (!raw || !bufferRef.current || !srcRef.current) return

			const buffer = await ctx.decodeAudioData(toArrayBuffer(raw as unknown as ArrayBuffer | Uint8Array))
			if (gen !== preloadGenRef.current) return // superseded while decoding

			// Schedule the next source to start exactly when current ends
			const scheduleAt = srcStartCtxTimeRef.current + bufferRef.current.duration - srcStartOffsetRef.current
			if (scheduleAt <= ctx.currentTime) return // too late to schedule

			const nextSrc = ctx.createBufferSource()
			nextSrc.buffer = buffer
			nextSrc.connect(gainRef.current!)
			nextSrc.start(scheduleAt, 0)

			nextSrcRef.current = nextSrc
			nextBufferRef.current = buffer
			nextPathRef.current = songPath
			nextScheduledCtxTimeRef.current = scheduleAt
		} catch {
			// Preload failed silently — playback continues normally with a small gap
		}
	}, [getCtx])

	// ─── handlePause ──────────────────────────────────────────────────────────
	const handlePause = useCallback(() => {
		if (!ctxRef.current) return

		// Save position
		if (srcRef.current && bufferRef.current) {
			const elapsed = ctxRef.current.currentTime - srcStartCtxTimeRef.current + srcStartOffsetRef.current
			pauseOffsetRef.current = Math.max(0, Math.min(elapsed, bufferRef.current.duration))
		}

		if (srcRef.current) {
			releaseSource(srcRef.current)
			srcRef.current = null
		}
		stopRaf()
		isPlayingRef.current = false
		setIsPlayingState(false)

		// Cancel the scheduled next source but keep its buffer/path for rescheduling on resume
		if (nextSrcRef.current) {
			releaseSource(nextSrcRef.current)
			nextSrcRef.current = null
			// nextBufferRef and nextPathRef intentionally kept
		}
	}, [stopRaf])

	// ─── handleResume ─────────────────────────────────────────────────────────
	const handleResume = useCallback(async () => {
		if (!bufferRef.current || !gainRef.current) return

		const ctx = getCtx()
		await ctx.resume()

		const offset = pauseOffsetRef.current
		const src = ctx.createBufferSource()
		src.buffer = bufferRef.current
		src.connect(gainRef.current)
		src.onended = onSourceEnded

		const startCtxTime = ctx.currentTime
		src.start(0, offset)

		srcRef.current = src
		srcStartCtxTimeRef.current = startCtxTime
		srcStartOffsetRef.current = offset
		isPlayingRef.current = true
		setIsPlayingState(true)
		startRaf()

		// Reschedule next if we still have its buffer
		if (nextBufferRef.current && nextPathRef.current && gainRef.current && bufferRef.current) {
			const scheduleAt = startCtxTime + (bufferRef.current.duration - offset)
			if (scheduleAt > ctx.currentTime) {
				const nextSrc = ctx.createBufferSource()
				nextSrc.buffer = nextBufferRef.current
				nextSrc.connect(gainRef.current)
				nextSrc.start(scheduleAt, 0)
				nextSrcRef.current = nextSrc
				nextScheduledCtxTimeRef.current = scheduleAt
			}
		}
	}, [getCtx, onSourceEnded, startRaf])

	// ─── handleStop ───────────────────────────────────────────────────────────
	const handleStop = useCallback(() => {
		if (srcRef.current) {
			releaseSource(srcRef.current)
			srcRef.current = null
		}
		cancelNextSource()
		stopRaf()
		bufferRef.current = null
		playingPathRef.current = null
		pauseOffsetRef.current = 0
		isPlayingRef.current = false
		setPlayingPath(null)
		setIsPlayingState(false)
		setCurrentTime(0)
		setDuration(0)
	}, [cancelNextSource, stopRaf])

	// ─── setCurrentTime (seek) ────────────────────────────────────────────────
	const seekTo = useCallback((time: number) => {
		if (!bufferRef.current) return

		const clamped = Math.max(0, Math.min(time, bufferRef.current.duration))

		if (!isPlayingRef.current) {
			pauseOffsetRef.current = clamped
			setCurrentTime(clamped)
			return
		}

		const ctx = getCtx()
		if (srcRef.current) {
			releaseSource(srcRef.current)
			srcRef.current = null
		}

		// Save next buffer before cancelling so we can reschedule
		const savedNextBuffer = nextBufferRef.current
		const savedNextPath = nextPathRef.current
		cancelNextSource()

		const src = ctx.createBufferSource()
		src.buffer = bufferRef.current
		src.connect(gainRef.current!)
		src.onended = onSourceEnded

		const startCtxTime = ctx.currentTime
		src.start(0, clamped)

		srcRef.current = src
		srcStartCtxTimeRef.current = startCtxTime
		srcStartOffsetRef.current = clamped
		setCurrentTime(clamped)

		// Reschedule next if buffer was ready
		if (savedNextBuffer && savedNextPath && gainRef.current && bufferRef.current) {
			const scheduleAt = startCtxTime + (bufferRef.current.duration - clamped)
			if (scheduleAt > ctx.currentTime) {
				const nextSrc = ctx.createBufferSource()
				nextSrc.buffer = savedNextBuffer
				nextSrc.connect(gainRef.current)
				nextSrc.start(scheduleAt, 0)
				nextSrcRef.current = nextSrc
				nextBufferRef.current = savedNextBuffer
				nextPathRef.current = savedNextPath
				nextScheduledCtxTimeRef.current = scheduleAt
			}
		}
	}, [getCtx, onSourceEnded, cancelNextSource])

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
