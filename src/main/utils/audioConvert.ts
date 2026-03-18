/**
 * Pure-JS audio container converters for MSE SourceBuffer compatibility.
 *
 * MSE does not accept raw audio/flac or audio/ogg — it requires containerised
 * streams. This module converts:
 *   FLAC → fragmented MP4   (audio/mp4;codecs="flac")
 *   OGG  → WebM EBML        (audio/webm;codecs="vorbis" | "opus")
 *
 * MP3 and M4A pass through unchanged.
 */

// ─── MP4 / ISOBMFF helpers ───────────────────────────────────────────────────

const cat = (...b: Buffer[]): Buffer => Buffer.concat(b)
const u16be = (v: number): Buffer => { const b = Buffer.allocUnsafe(2); b.writeUInt16BE(v >>> 0, 0); return b }
const u32be = (v: number): Buffer => { const b = Buffer.allocUnsafe(4); b.writeUInt32BE(v >>> 0, 0); return b }
const asc  = (s: string): Buffer => Buffer.from(s, 'latin1')
const zz   = (n: number): Buffer => Buffer.alloc(n)

/** ISOBMFF box: [4-byte size][4-byte type][payload] */
function mp4box(type: string, ...payload: Buffer[]): Buffer {
	const body = cat(...payload)
	const out  = Buffer.allocUnsafe(8 + body.length)
	out.writeUInt32BE(out.length, 0)
	out.write(type, 4, 4, 'latin1')
	body.copy(out, 8)
	return out
}

/** FullBox: prepends version(1)+flags(3) to payload, then wraps in an mp4box */
function fullbox(type: string, version: number, flags: number, ...payload: Buffer[]): Buffer {
	const vf = Buffer.allocUnsafe(4)
	vf.writeUInt32BE(((version & 0xff) << 24) | (flags & 0xffffff), 0)
	return mp4box(type, vf, ...payload)
}

// ─── FLAC parsing ────────────────────────────────────────────────────────────

interface FlacInfo {
	sampleRate: number
	channels: number
	bitsPerSample: number
	totalSamples: number    // 0 if unknown
	blockSize: number       // max block size from STREAMINFO (samples per frame)
	streamInfoData: Buffer  // 38-byte STREAMINFO block (4-byte FLAC header + 34-byte data)
	audioOffset: number     // byte index where audio frames begin
}

function parseFlac(buf: Buffer): FlacInfo {
	if (buf.slice(0, 4).toString('latin1') !== 'fLaC') throw new Error('Not a FLAC file')

	let off = 4
	let result: FlacInfo | null = null

	while (off + 4 <= buf.length) {
		const hdr     = buf[off]
		const isLast  = (hdr & 0x80) !== 0
		const type    = hdr & 0x7f
		const size    = (buf[off + 1] << 16) | (buf[off + 2] << 8) | buf[off + 3]
		off += 4

		if (type === 0 && size >= 34) {
			const si  = buf.slice(off, off + size)
			let   bit = 0
			const rb  = (n: number): number => {
				let v = 0
				for (let i = 0; i < n; i++) {
					v = (v * 2) + ((si[bit >> 3] >> (7 - (bit & 7))) & 1)
					bit++
				}
				return v
			}
			rb(16)                                  // min block size (discard)
			const blockSize     = rb(16)            // max block size = nominal frame size
			rb(24); rb(24)                          // min/max frame sizes (discard)
			const sampleRate    = rb(20)
			const channels      = rb(3) + 1
			const bitsPerSample = rb(5) + 1
			const tsHi          = rb(4)
			const tsLo          = rb(32)
			result = { sampleRate, channels, bitsPerSample, totalSamples: tsHi * 0x100000000 + tsLo, blockSize: blockSize > 0 ? blockSize : 4096, streamInfoData: Buffer.concat([Buffer.from([0x80, 0x00, 0x00, 0x22]), si.slice(0, 34)]), audioOffset: 0 }
		}

		off += size
		if (isLast) break
	}

	if (!result) throw new Error('FLAC STREAMINFO block not found')
	result.audioOffset = off
	return result
}

// ─── FLAC frame splitter ─────────────────────────────────────────────────────

/**
 * Split a raw FLAC audio buffer into individual frame buffers.
 * Scans for the FLAC sync word (0xFF 0xF8/0xF9) with lightweight header
 * validation to reduce false positives:
 *   - sample_rate_indicator (low nibble of byte 2) must not be 0xF (invalid)
 *   - reserved bit (bit 0 of byte 3) must be 0
 */
function splitFlacFrames(audio: Buffer): Buffer[] {
	const frames: Buffer[] = []
	let frameStart = -1

	for (let i = 0; i < audio.length - 3; i++) {
		if (
			audio[i]         === 0xFF &&
			(audio[i + 1] & 0xFE) === 0xF8 &&  // sync + blocking-strategy bit
			(audio[i + 2] & 0x0F) !== 0x0F &&  // invalid sample-rate indicator
			(audio[i + 3] & 0x01) === 0          // reserved bit must be 0
		) {
			if (frameStart >= 0) frames.push(audio.slice(frameStart, i))
			frameStart = i
		}
	}

	if (frameStart >= 0) {
		frames.push(audio.slice(frameStart))  // last frame
	} else if (audio.length > 0) {
		frames.push(audio)                    // no sync words found — treat as single frame
	}

	return frames
}

// ─── FLAC → fragmented MP4 ───────────────────────────────────────────────────

/**
 * Wrap a raw FLAC file in an ISOBMFF fragmented MP4 container.
 * Uses the 'fLaC' sample entry (ISO 23000-19) accepted by MSE as
 * audio/mp4;codecs="flac".
 *
 * Produces one init segment (ftyp+moov) and one media segment (moof+mdat)
 * treating the entire audio stream as a single sample.
 */
export function flacToFmp4(buf: Buffer): Buffer {
	const info  = parseFlac(buf)
	const audio = buf.slice(info.audioOffset)
	const ts    = info.sampleRate               // timescale = sample rate
	const dur   = Math.min(info.totalSamples, 0xffffffff) >>> 0

	// ── ftyp ──────────────────────────────────────────────────────────────────
	const ftyp = mp4box('ftyp', asc('iso5'), u32be(0), asc('iso5iso6mp41'))

	// ── moov ──────────────────────────────────────────────────────────────────
	// ISOBMFF 3×3 matrix: [a,b,u,c,d,v,tx,ty,w] = 9 × 4 bytes = 36 bytes
	const unityMatrix = cat(u32be(0x00010000), zz(12), u32be(0x00010000), zz(12), u32be(0x40000000))

	const mvhd = fullbox('mvhd', 0, 0,
		zz(8), u32be(ts), u32be(dur),       // ctime, mtime, timescale, duration
		u32be(0x00010000), u16be(0x0100),   // rate 1.0, volume 1.0
		zz(10), unityMatrix, zz(24),        // reserved, matrix, pre_defined
		u32be(2),                           // next_track_ID
	)

	const tkhd = fullbox('tkhd', 0, 3 /* enabled|in-movie */,
		zz(8), u32be(1), zz(4), u32be(dur),  // ctime, mtime, track_ID, reserved, duration
		zz(8), zz(2), zz(2),                  // reserved[2], layer, alternate_group
		u16be(0x0100), zz(2),                 // volume 1.0, reserved
		unityMatrix,                           // matrix
		zz(8),                                 // width, height (0 for audio)
	)

	const mdhd = fullbox('mdhd', 0, 0, zz(8), u32be(ts), u32be(dur), u16be(0x55c4), zz(2))
	const hdlr = fullbox('hdlr', 0, 0, zz(4), asc('soun'), zz(12), asc('SoundHandler\0'))
	const smhd = fullbox('smhd', 0, 0, zz(4))
	const url_ = fullbox('url ', 0, 1)
	const dref = fullbox('dref', 0, 0, u32be(1), url_)
	const dinf = mp4box('dinf', dref)

	// dfLa = FullBox containing the raw 34-byte STREAMINFO block
	const dfLa = fullbox('dfLa', 0, 0, info.streamInfoData)

	// fLaC sample entry (AudioSampleEntry + dfLa)
	const sr   = Math.min(info.sampleRate, 0xffff)
	const fLaC = mp4box('fLaC',
		zz(6), u16be(1),              // reserved(6), data_reference_index
		zz(8),                         // reserved
		u16be(info.channels),
		u16be(16),                    // samplesize (nominal; actual depth in dfLa)
		zz(4),                         // pre_defined, reserved
		u16be(sr), u16be(0),          // samplerate 16.16 fixed-point
		dfLa,
	)

	const stsd = fullbox('stsd', 0, 0, u32be(1), fLaC)
	const stts = fullbox('stts', 0, 0, u32be(0))
	const stsc = fullbox('stsc', 0, 0, u32be(0))
	const stsz = fullbox('stsz', 0, 0, u32be(0), u32be(0))
	const stco = fullbox('stco', 0, 0, u32be(0))
	const stbl = mp4box('stbl', stsd, stts, stsc, stsz, stco)
	const minf = mp4box('minf', smhd, dinf, stbl)
	const mdia = mp4box('mdia', mdhd, hdlr, minf)
	const trak = mp4box('trak', tkhd, mdia)
	const trex = fullbox('trex', 0, 0, u32be(1), u32be(1), u32be(0), u32be(0), u32be(0))
	const mvex = mp4box('mvex', trex)
	const moov = mp4box('moov', mvhd, trak, mvex)

	// ── Media segment: one sample per FLAC audio frame ───────────────────────
	// ISO 23000-19 requires each fMP4 sample to contain exactly one FLAC frame.
	const frames = splitFlacFrames(audio)
	const N      = frames.length
	const bSize  = info.blockSize   // nominal samples per frame (from STREAMINFO)

	const mfhd = fullbox('mfhd', 0, 0, u32be(1))
	// tfhd flag 0x020000 = default-base-is-moof (no base-data-offset field)
	const tfhd = fullbox('tfhd', 0, 0x020000, u32be(1))
	const tfdt = fullbox('tfdt', 0, 0, u32be(0))

	// trun flags: data-offset(0x001) | sample-duration(0x100) | sample-size(0x200)
	// Per-sample entries: duration(4) + size(4) for each frame.
	const trunSamples = Buffer.allocUnsafe(N * 8)
	for (let i = 0; i < N; i++) {
		// Last frame may be shorter; derive from totalSamples when available.
		const frameDur = (i < N - 1 || info.totalSamples === 0)
			? bSize
			: Math.max(1, info.totalSamples - (N - 1) * bSize) >>> 0
		trunSamples.writeUInt32BE(frameDur, i * 8)
		trunSamples.writeUInt32BE(frames[i].length, i * 8 + 4)
	}

	const trun = fullbox('trun', 0, 0x0301,
		u32be(N),      // sample_count
		u32be(0),      // data_offset — patched below
		trunSamples,   // per-sample: duration(4) + size(4)
	)
	const traf = mp4box('traf', tfhd, tfdt, trun)
	const moof = mp4box('moof', mfhd, traf)

	// Patch data_offset: distance from start of moof to start of mdat payload.
	// Position of the data_offset uint32 within moof:
	//   8 (moof hdr) + 16 (mfhd) + 8 (traf hdr) + 16 (tfhd) + 16 (tfdt)
	//   + 8 (trun hdr) + 4 (version+flags) + 4 (sample_count) = byte 80
	moof.writeUInt32BE(moof.length + 8, 80)

	const mdat = mp4box('mdat', Buffer.concat(frames))
	return cat(ftyp, moov, moof, mdat)
}

// ─── M4A / ISOBMFF box parser ────────────────────────────────────────────────

interface BoxInfo { dataStart: number; end: number }

/** Walk a path of nested ISOBMFF box type names and return the innermost box. */
function findBox(buf: Buffer, start: number, end: number, ...path: string[]): BoxInfo | null {
	let cur: BoxInfo = { dataStart: start, end }
	for (const type of path) {
		let found: BoxInfo | null = null
		let off = cur.dataStart
		while (off + 8 <= cur.end) {
			const size = buf.readUInt32BE(off)
			if (size < 8) break
			if (buf.slice(off + 4, off + 8).toString('latin1') === type) {
				found = { dataStart: off + 8, end: off + size }
				break
			}
			off += size
		}
		if (!found) return null
		cur = found
	}
	return cur
}

/** Expand stts run-length pairs into a flat per-sample duration array. */
function parseStts(buf: Buffer, dataStart: number): number[] {
	const base  = dataStart + 4  // skip FullBox version+flags
	const count = buf.readUInt32BE(base)
	const out: number[] = []
	for (let i = 0; i < count; i++) {
		const n  = buf.readUInt32BE(base + 4 + i * 8)
		const dt = buf.readUInt32BE(base + 4 + i * 8 + 4)
		for (let j = 0; j < n; j++) out.push(dt)
	}
	return out
}

/** Return per-sample sizes from stsz (handles both uniform and variable cases). */
function parseStsz(buf: Buffer, dataStart: number): number[] {
	const base        = dataStart + 4
	const uniformSize = buf.readUInt32BE(base)
	const sampleCount = buf.readUInt32BE(base + 4)
	if (uniformSize > 0) return new Array<number>(sampleCount).fill(uniformSize)
	const out: number[] = []
	for (let i = 0; i < sampleCount; i++) out.push(buf.readUInt32BE(base + 8 + i * 4))
	return out
}

interface StscEntry { firstChunk: number; samplesPerChunk: number }

function parseStsc(buf: Buffer, dataStart: number): StscEntry[] {
	const base  = dataStart + 4
	const count = buf.readUInt32BE(base)
	const out: StscEntry[] = []
	for (let i = 0; i < count; i++) {
		out.push({
			firstChunk:      buf.readUInt32BE(base + 4 + i * 12),
			samplesPerChunk: buf.readUInt32BE(base + 4 + i * 12 + 4),
		})
	}
	return out
}

function parseChunkOffsets(buf: Buffer, box: BoxInfo, is64: boolean): number[] {
	const base  = box.dataStart + 4
	const count = buf.readUInt32BE(base)
	const out: number[] = []
	for (let i = 0; i < count; i++) {
		if (is64) {
			const hi = buf.readUInt32BE(base + 4 + i * 8)
			const lo = buf.readUInt32BE(base + 4 + i * 8 + 4)
			out.push(hi * 0x100000000 + lo)
		} else {
			out.push(buf.readUInt32BE(base + 4 + i * 4))
		}
	}
	return out
}

// ─── M4A → fragmented MP4 ────────────────────────────────────────────────────

/**
 * Rewrap an unfragmented M4A (AAC) file into an ISOBMFF fragmented MP4.
 * If the file already contains mvex (already fragmented), returns it unchanged.
 * The resulting bytes are accepted by MSE under audio/mp4.
 */
export function m4aToFmp4(buf: Buffer): Buffer {
	const moovBox = findBox(buf, 0, buf.length, 'moov')
	if (!moovBox) return buf

	// Already fragmented — pass through
	if (findBox(buf, moovBox.dataStart, moovBox.end, 'mvex')) return buf

	// ── Timescale and duration from mdhd ──────────────────────────────────────
	const mdhdBox = findBox(buf, moovBox.dataStart, moovBox.end, 'trak', 'mdia', 'mdhd')
	if (!mdhdBox) return buf

	const v0 = buf[mdhdBox.dataStart]  // FullBox version byte
	let timescale: number, duration: number
	if (v0 === 1) {
		timescale = buf.readUInt32BE(mdhdBox.dataStart + 20)
		const hi  = buf.readUInt32BE(mdhdBox.dataStart + 24)
		const lo  = buf.readUInt32BE(mdhdBox.dataStart + 28)
		duration  = hi * 0x100000000 + lo
	} else {
		timescale = buf.readUInt32BE(mdhdBox.dataStart + 12)
		duration  = buf.readUInt32BE(mdhdBox.dataStart + 16)
	}

	// ── Sample table boxes ─────────────────────────────────────────────────────
	const stblBox = findBox(buf, moovBox.dataStart, moovBox.end, 'trak', 'mdia', 'minf', 'stbl')
	if (!stblBox) return buf

	const sttsBox = findBox(buf, stblBox.dataStart, stblBox.end, 'stts')
	const stszBox = findBox(buf, stblBox.dataStart, stblBox.end, 'stsz')
	const stscBox = findBox(buf, stblBox.dataStart, stblBox.end, 'stsc')
	const stcoBox = findBox(buf, stblBox.dataStart, stblBox.end, 'stco')
	const co64Box = findBox(buf, stblBox.dataStart, stblBox.end, 'co64')
	const stsdBox = findBox(buf, stblBox.dataStart, stblBox.end, 'stsd')

	if (!sttsBox || !stszBox || !stscBox || (!stcoBox && !co64Box) || !stsdBox) return buf

	const durations    = parseStts(buf, sttsBox.dataStart)
	const sizes        = parseStsz(buf, stszBox.dataStart)
	const stscEntries  = parseStsc(buf, stscBox.dataStart)
	const chunkOffsets = stcoBox
		? parseChunkOffsets(buf, stcoBox, false)
		: parseChunkOffsets(buf, co64Box!, true)

	// Preserve original stsd box verbatim (contains mp4a/esds AAC codec config)
	const stsdRaw = buf.slice(stsdBox.dataStart - 8, stsdBox.end)

	// ── Collect audio samples in order via chunk table ─────────────────────────
	const audioChunks: Buffer[] = []
	let sampleIdx = 0
	for (let ci = 0; ci < chunkOffsets.length; ci++) {
		const chunk1 = ci + 1  // stsc uses 1-based chunk indices
		// Find the stsc entry that applies to this chunk (last entry with firstChunk ≤ chunk1)
		let samplesPerChunk = stscEntries[0]?.samplesPerChunk ?? 1
		for (const e of stscEntries) {
			if (e.firstChunk <= chunk1) samplesPerChunk = e.samplesPerChunk
			else break
		}
		let byteOff = chunkOffsets[ci]
		for (let s = 0; s < samplesPerChunk; s++, sampleIdx++) {
			if (sampleIdx >= sizes.length) break
			const sz = sizes[sampleIdx]
			audioChunks.push(buf.slice(byteOff, byteOff + sz))
			byteOff += sz
		}
	}

	if (audioChunks.length === 0) return buf

	const N   = audioChunks.length
	const dur = Math.min(duration, 0xffffffff) >>> 0
	const ts  = timescale

	// ── ftyp ──────────────────────────────────────────────────────────────────
	const ftyp = mp4box('ftyp', asc('iso5'), u32be(0), asc('iso5iso6mp41'))

	// ── moov ──────────────────────────────────────────────────────────────────
	// ISOBMFF 3×3 matrix: [a,b,u,c,d,v,tx,ty,w] = 9 × 4 bytes = 36 bytes
	const unityMatrix = cat(u32be(0x00010000), zz(12), u32be(0x00010000), zz(12), u32be(0x40000000))

	const mvhd = fullbox('mvhd', 0, 0,
		zz(8), u32be(ts), u32be(dur),
		u32be(0x00010000), u16be(0x0100),
		zz(10), unityMatrix, zz(24),
		u32be(2),
	)
	const tkhd = fullbox('tkhd', 0, 3,
		zz(8), u32be(1), zz(4), u32be(dur),
		zz(8), zz(2), zz(2),
		u16be(0x0100), zz(2),
		unityMatrix, zz(8),
	)
	const mdhd = fullbox('mdhd', 0, 0, zz(8), u32be(ts), u32be(dur), u16be(0x55c4), zz(2))
	const hdlr = fullbox('hdlr', 0, 0, zz(4), asc('soun'), zz(12), asc('SoundHandler\0'))
	const smhd = fullbox('smhd', 0, 0, zz(4))
	const url_ = fullbox('url ', 0, 1)
	const dref = fullbox('dref', 0, 0, u32be(1), url_)
	const dinf = mp4box('dinf', dref)

	// Empty stbl (tracks declared; samples are in the fragment below)
	const stts0 = fullbox('stts', 0, 0, u32be(0))
	const stsc0 = fullbox('stsc', 0, 0, u32be(0))
	const stsz0 = fullbox('stsz', 0, 0, u32be(0), u32be(0))
	const stco0 = fullbox('stco', 0, 0, u32be(0))
	const stbl  = mp4box('stbl', stsdRaw, stts0, stsc0, stsz0, stco0)
	const minf  = mp4box('minf', smhd, dinf, stbl)
	const mdia  = mp4box('mdia', mdhd, hdlr, minf)
	const trak  = mp4box('trak', tkhd, mdia)
	const trex  = fullbox('trex', 0, 0, u32be(1), u32be(1), u32be(0), u32be(0), u32be(0))
	const mvex  = mp4box('mvex', trex)
	const moov  = mp4box('moov', mvhd, trak, mvex)

	// ── Media segment (moof + mdat) ───────────────────────────────────────────
	const mfhd = fullbox('mfhd', 0, 0, u32be(1))
	// tfhd flag 0x020000 = default-base-is-moof (no base-data-offset field)
	const tfhd = fullbox('tfhd', 0, 0x020000, u32be(1))
	const tfdt = fullbox('tfdt', 0, 0, u32be(0))

	// trun flags: data-offset(0x001) | sample-duration(0x100) | sample-size(0x200)
	const trunSamples = Buffer.allocUnsafe(N * 8)
	for (let i = 0; i < N; i++) {
		trunSamples.writeUInt32BE(i < durations.length ? durations[i] : 0, i * 8)
		trunSamples.writeUInt32BE(sizes[i] ?? 0, i * 8 + 4)
	}

	const trun = fullbox('trun', 0, 0x0301,
		u32be(N),      // sample_count
		u32be(0),      // data_offset — patched below
		trunSamples,   // per-sample: duration(4) + size(4)
	)
	const traf = mp4box('traf', tfhd, tfdt, trun)
	const moof = mp4box('moof', mfhd, traf)

	// Patch data_offset: distance from start of moof to start of mdat payload.
	// Position of the data_offset uint32 within moof:
	//   8 (moof hdr) + 16 (mfhd) + 8 (traf hdr) + 16 (tfhd) + 16 (tfdt)
	//   + 8 (trun hdr) + 4 (version+flags) + 4 (sample_count) = byte 80
	moof.writeUInt32BE(moof.length + 8, 80)

	const mdat = mp4box('mdat', Buffer.concat(audioChunks))
	return cat(ftyp, moov, moof, mdat)
}

// ─── OGG parsing ─────────────────────────────────────────────────────────────

interface OggStream {
	headerPackets: Buffer[]
	audioPackets:  Buffer[]
	isOpus:        boolean
	sampleRate:    number
	channels:      number
	totalSamples:  number
}

function parseOgg(buf: Buffer): OggStream {
	const allPackets: Buffer[] = []
	let partial: Buffer[] = []
	let off           = 0
	let isOpus        = false
	let sampleRate    = 44100
	let channels      = 2
	let lastGranule   = 0

	while (off + 27 <= buf.length) {
		if (buf.slice(off, off + 4).toString('latin1') !== 'OggS') break

		// Granule position at bytes 6..13 (little-endian 64-bit)
		const gran0 = buf.readUInt32LE(off + 6)
		const gran1 = buf.readUInt32LE(off + 10)
		const isMinusOne = gran0 === 0xffffffff && gran1 === 0xffffffff
		if (!isMinusOne) lastGranule = gran0 + gran1 * 0x100000000

		const numSeg = buf[off + 26]
		if (off + 27 + numSeg > buf.length) break

		const segTable = buf.slice(off + 27, off + 27 + numSeg)
		let dataOff = off + 27 + numSeg

		for (let i = 0; i < numSeg; i++) {
			const segLen = segTable[i]
			partial.push(buf.slice(dataOff, dataOff + segLen))
			dataOff += segLen

			if (segLen < 255) {
				const pkt = Buffer.concat(partial)
				partial = []
				allPackets.push(pkt)

				if (allPackets.length === 1) {
					if (pkt.length >= 7 && pkt[0] === 1 && pkt.slice(1, 7).toString('latin1') === 'vorbis') {
						isOpus     = false
						sampleRate = pkt.readUInt32LE(12)
						channels   = pkt[11]
					} else if (pkt.length >= 8 && pkt.slice(0, 8).toString('latin1') === 'OpusHead') {
						isOpus     = true
						channels   = pkt[9]
						sampleRate = 48000 // Opus always 48 kHz internally
					}
				}
			}
		}
		off = dataOff
	}

	const headerCount = isOpus ? 2 : 3
	return {
		headerPackets: allPackets.slice(0, headerCount),
		audioPackets:  allPackets.slice(headerCount),
		isOpus,
		sampleRate,
		channels,
		totalSamples: lastGranule,
	}
}

// ─── EBML / WebM helpers ──────────────────────────────────────────────────────

/** Encode n as an EBML VINT (variable-length size integer). */
function vint(n: number): Buffer {
	if (n < 0x7f)     return Buffer.from([0x80 | n])
	if (n < 0x3fff)   return Buffer.from([0x40 | (n >> 8), n & 0xff])
	if (n < 0x1fffff) return Buffer.from([0x20 | (n >> 16), (n >> 8) & 0xff, n & 0xff])
	return Buffer.from([0x10 | ((n >>> 24) & 0x0f), (n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff])
}

/** Wrap data with an EBML element: [ID bytes][VINT(size)][data] */
const ebml = (id: readonly number[], data: Buffer): Buffer =>
	Buffer.concat([Buffer.from(id), vint(data.length), data])

const ebmlUint = (id: readonly number[], v: number): Buffer => {
	let b = 1; let n = v; while (n > 0xff && b < 8) { n >>= 8; b++ }
	const d = Buffer.allocUnsafe(b)
	for (let i = b - 1; i >= 0; i--) { d[i] = v & 0xff; v >>>= 8 }
	return ebml(id, d)
}
const ebmlF64 = (id: readonly number[], v: number): Buffer => {
	const d = Buffer.allocUnsafe(8); d.writeDoubleBE(v, 0); return ebml(id, d)
}
const ebmlStr = (id: readonly number[], s: string): Buffer => ebml(id, Buffer.from(s, 'utf8'))

// WebM element IDs (already EBML-encoded per spec)
const E = {
	EBML:         [0x1A, 0x45, 0xDF, 0xA3],
	EBMLVer:      [0x42, 0x86],
	EBMLRdVer:    [0x42, 0xF7],
	EBMLMaxID:    [0x42, 0xF2],
	EBMLMaxSz:    [0x42, 0xF3],
	DocType:      [0x42, 0x82],
	DocTypeVer:   [0x42, 0x87],
	DocTypeRdVer: [0x42, 0x85],
	Segment:      [0x18, 0x53, 0x80, 0x67],
	Info:         [0x15, 0x49, 0xA9, 0x66],
	TimeScale:    [0x2A, 0xD7, 0xB1],
	MuxApp:       [0x4D, 0x80],
	WriteApp:     [0x57, 0x41],
	Duration:     [0x44, 0x89],
	Tracks:       [0x16, 0x54, 0xAE, 0x6B],
	TrackEntry:   [0xAE],
	TrackNum:     [0xD7],
	TrackUID:     [0x73, 0xC5],
	TrackType:    [0x83],
	CodecID:      [0x86],
	CodecPvt:     [0x63, 0xA2],
	Audio:        [0xE1],
	SampleFreq:   [0xB5],
	Channels:     [0x9F],
	Cluster:      [0x1F, 0x43, 0xB6, 0x75],
	Timecode:     [0xE7],
	SimpleBlock:  [0xA3],
} as const

// ─── OGG → WebM ──────────────────────────────────────────────────────────────

/**
 * Rewrap an OGG Vorbis or OGG Opus file into a WebM EBML container.
 * The resulting bytes are accepted by MSE under
 * audio/webm;codecs="vorbis" or audio/webm;codecs="opus".
 */
export function oggToWebm(buf: Buffer): Buffer {
	const { headerPackets, audioPackets, isOpus, sampleRate, channels, totalSamples } = parseOgg(buf)
	if (audioPackets.length === 0) throw new Error('No OGG audio packets found')

	const codecId = isOpus ? 'A_OPUS' : 'A_VORBIS'

	// ── CodecPrivate ──────────────────────────────────────────────────────────
	let codecPrivate: Buffer
	if (isOpus) {
		codecPrivate = headerPackets[0] // OpusHead packet
	} else {
		// Vorbis: Xiph-laced bundle of all 3 header packets
		const [h1, h2, h3] = headerPackets
		const xiphLace = (size: number): number[] => {
			const arr: number[] = []
			while (size >= 255) { arr.push(255); size -= 255 }
			arr.push(size)
			return arr
		}
		codecPrivate = Buffer.concat([
			Buffer.from([2]),              // number_of_headers - 1
			Buffer.from(xiphLace(h1.length)),
			Buffer.from(xiphLace(h2.length)),
			h1, h2, h3,
		])
	}

	// ── EBML header ───────────────────────────────────────────────────────────
	const ebmlHeader = ebml(E.EBML, Buffer.concat([
		ebmlUint(E.EBMLVer,      1),
		ebmlUint(E.EBMLRdVer,    1),
		ebmlUint(E.EBMLMaxID,    4),
		ebmlUint(E.EBMLMaxSz,    8),
		ebmlStr (E.DocType,      'webm'),
		ebmlUint(E.DocTypeVer,   4),
		ebmlUint(E.DocTypeRdVer, 2),
	]))

	// ── Segment Info ──────────────────────────────────────────────────────────
	const durationMs = totalSamples > 0 ? (totalSamples / sampleRate) * 1000 : 0
	const info = ebml(E.Info, Buffer.concat([
		ebmlUint(E.TimeScale, 1_000_000),  // 1 ms per timecode unit
		ebmlStr (E.MuxApp,    'tuku'),
		ebmlStr (E.WriteApp,  'tuku'),
		...(durationMs > 0 ? [ebmlF64(E.Duration, durationMs)] : []),
	]))

	// ── Tracks ────────────────────────────────────────────────────────────────
	const audioEl = ebml(E.Audio, Buffer.concat([
		ebmlF64 (E.SampleFreq, sampleRate),
		ebmlUint(E.Channels,   channels),
	]))
	const trackEntry = ebml(E.TrackEntry, Buffer.concat([
		ebmlUint(E.TrackNum,  1),
		ebmlUint(E.TrackUID,  1),
		ebmlUint(E.TrackType, 2),         // 2 = audio
		ebmlStr (E.CodecID,   codecId),
		ebml    (E.CodecPvt,  codecPrivate),
		audioEl,
	]))
	const tracks = ebml(E.Tracks, trackEntry)

	// ── Clusters ──────────────────────────────────────────────────────────────
	// Each packet becomes one SimpleBlock. Split into ~30 s clusters so that
	// the per-block timecode (int16 relative to cluster) never overflows.
	const msPerPkt = audioPackets.length > 0 && durationMs > 0
		? durationMs / audioPackets.length
		: 23  // ~23 ms ≈ 1024 samples @ 44100 Hz (common Vorbis block size)

	const CLUSTER_MAX_MS = 30_000
	const clusters: Buffer[] = []
	let clusterStart = 0
	let clusterBlocks: Buffer[] = []

	const flushCluster = () => {
		if (clusterBlocks.length === 0) return
		clusters.push(ebml(E.Cluster, Buffer.concat([
			ebmlUint(E.Timecode, clusterStart),
			...clusterBlocks,
		])))
		clusterBlocks = []
	}

	audioPackets.forEach((pkt, i) => {
		const absMs = Math.round(i * msPerPkt)
		if (i === 0 || absMs - clusterStart >= CLUSTER_MAX_MS) {
			flushCluster()
			clusterStart = absMs
		}
		const relMs = absMs - clusterStart
		// SimpleBlock = VINT(track_num) + int16(timecode) + flags(1) + data
		const blockData = Buffer.concat([
			Buffer.from([0x81]),                                   // track 1 as VINT
			Buffer.from([(relMs >> 8) & 0xff, relMs & 0xff]),     // timecode int16 BE
			Buffer.from([i === 0 ? 0x80 : 0x00]),                 // flags (keyframe on first)
			pkt,
		])
		clusterBlocks.push(ebml(E.SimpleBlock, blockData))
	})
	flushCluster()

	// ── Segment ───────────────────────────────────────────────────────────────
	const segBody = Buffer.concat([info, tracks, ...clusters])
	const segment = ebml(E.Segment, segBody)

	return Buffer.concat([ebmlHeader, segment])
}
