// MediaRecorder writes WebM as a live stream: no duration and no seek index
// (Cues). Players then show no length and seeking is slow or jumps around.
// This rewrites the file with a Duration and a Cue for every cluster that
// starts on a video keyframe, so scrubbing lands quickly and exactly.

const ID = {
  EBML: 0x1a45dfa3,
  Segment: 0x18538067,
  SeekHead: 0x114d9b74,
  Info: 0x1549a966,
  TimecodeScale: 0x2ad7b1,
  Duration: 0x4489,
  Tracks: 0x1654ae6b,
  TrackEntry: 0xae,
  TrackNumber: 0xd7,
  TrackType: 0x83,
  Cluster: 0x1f43b675,
  Timecode: 0xe7,
  SimpleBlock: 0xa3,
  BlockGroup: 0xa0,
  Block: 0xa1,
  ReferenceBlock: 0xfb,
  Cues: 0x1c53bb6b,
  Void: 0xec,
}
// Elements that end a cluster of unknown size
const TOP = new Set([ID.Cluster, ID.Cues, ID.Info, ID.Tracks, ID.SeekHead, 0x1254c367, 0x1043a770, 0x1941a469])

function readVint(b, pos, keepMarker) {
  const first = b[pos]
  if (first === undefined) throw new Error('eof')
  let len = 1
  while (len <= 8 && !(first & (0x80 >> (len - 1)))) len++
  if (len > 8) throw new Error('bad vint')
  let value = keepMarker ? first : first & (0xff >> len)
  let allOnes = (first & (0xff >> len)) === 0xff >> len
  for (let i = 1; i < len; i++) {
    if (b[pos + i] !== 0xff) allOnes = false
    value = value * 256 + b[pos + i]
  }
  return { value, len, unknown: !keepMarker && allOnes }
}

function readHeader(b, pos) {
  const id = readVint(b, pos, true)
  const size = readVint(b, pos + id.len, false)
  return { id: id.value, start: pos, dataStart: pos + id.len + size.len, size: size.unknown ? null : size.value }
}

const readUint = (b, start, end) => {
  let v = 0
  for (let i = start; i < end; i++) v = v * 256 + b[i]
  return v
}

/** Children of [start, end); unknown sizes run until a sibling-level element. */
function children(b, start, end, endsUnknown) {
  const out = []
  let pos = start
  while (pos < end) {
    const h = readHeader(b, pos)
    let stop = h.size == null ? scanUnknown(b, h.dataStart, end, endsUnknown) : h.dataStart + h.size
    if (stop > end) stop = end
    out.push({ ...h, end: stop })
    pos = stop
  }
  return out
}

function scanUnknown(b, start, end, endsUnknown) {
  let pos = start
  while (pos < end) {
    const h = readHeader(b, pos)
    if (endsUnknown.has(h.id)) return pos
    pos = h.size == null ? scanUnknown(b, h.dataStart, end, TOP) : h.dataStart + h.size
  }
  return end
}

function idBytes(id) {
  const out = []
  for (let v = id; v > 0; v = Math.floor(v / 256)) out.unshift(v & 0xff)
  return out
}

function sizeBytes(n) {
  let len = 1
  while (len < 8 && n >= 2 ** (7 * len) - 1) len++
  const out = new Array(len)
  let v = n
  for (let i = len - 1; i >= 0; i--) {
    out[i] = v & 0xff
    v = Math.floor(v / 256)
  }
  out[0] |= 0x80 >> (len - 1)
  return out
}

const element = (id, ...parts) => {
  const size = parts.reduce((s, p) => s + p.length, 0)
  return [new Uint8Array([...idBytes(id), ...sizeBytes(size)]), ...parts]
}
const uint8 = (n) => {
  const out = new Uint8Array(8)
  for (let i = 7, v = n; i >= 0; i--, v = Math.floor(v / 256)) out[i] = v & 0xff
  return out
}
const concat = (parts) => {
  const out = new Uint8Array(parts.reduce((s, p) => s + p.length, 0))
  let pos = 0
  for (const p of parts) {
    out.set(p, pos)
    pos += p.length
  }
  return out
}

/** Track number of the video track, or null. */
function videoTrack(b, tracks) {
  for (const t of children(b, tracks.dataStart, tracks.end, new Set())) {
    if (t.id !== ID.TrackEntry) continue
    const fields = children(b, t.dataStart, t.end, new Set())
    const type = fields.find((f) => f.id === ID.TrackType)
    const num = fields.find((f) => f.id === ID.TrackNumber)
    if (type && num && readUint(b, type.dataStart, type.end) === 1) return readUint(b, num.dataStart, num.end)
  }
  return null
}

/** Rewrites a MediaRecorder WebM so it is seekable. Returns the bytes unchanged when nothing needs doing. */
export function makeSeekable(bytes) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  const top = children(b, 0, b.length, new Set([ID.EBML, ID.Segment]))
  const ebml = top.find((e) => e.id === ID.EBML)
  const seg = top.find((e) => e.id === ID.Segment)
  if (!ebml || !seg) return b
  const level1 = children(b, seg.dataStart, seg.end, TOP)
  const info = level1.find((e) => e.id === ID.Info)
  const tracks = level1.find((e) => e.id === ID.Tracks)
  const clusters = level1.filter((e) => e.id === ID.Cluster)
  if (!info || !tracks || !clusters.length) return b
  const infoFields = children(b, info.dataStart, info.end, new Set())
  if (level1.some((e) => e.id === ID.Cues) && infoFields.some((f) => f.id === ID.Duration)) return b

  const scaleField = infoFields.find((f) => f.id === ID.TimecodeScale)
  const scale = scaleField ? readUint(b, scaleField.dataStart, scaleField.end) : 1e6
  const video = videoTrack(b, tracks)

  // Each cluster: its time, its bytes with a known size, and whether a seek can start there
  let last = 0
  const parsed = clusters.map((c) => {
    const kids = children(b, c.dataStart, c.end, TOP)
    const tc = kids.find((k) => k.id === ID.Timecode)
    const time = tc ? readUint(b, tc.dataStart, tc.end) : 0
    let key = null
    for (const k of kids) {
      let block = k
      let isKey
      if (k.id === ID.BlockGroup) {
        // Chrome writes video frames as BlockGroups; one without a ReferenceBlock is a keyframe
        const group = children(b, k.dataStart, k.end, new Set())
        block = group.find((x) => x.id === ID.Block)
        isKey = !group.some((x) => x.id === ID.ReferenceBlock)
      } else if (k.id !== ID.SimpleBlock) continue
      if (!block) continue
      const track = readVint(b, block.dataStart, false)
      const at = block.dataStart + track.len
      const rel = (((b[at] << 8) | b[at + 1]) << 16) >> 16
      last = Math.max(last, time + rel)
      // The first video frame decides; a SimpleBlock flags keyframes with 0x80
      if (k.id === ID.SimpleBlock) isKey = !!(b[at + 2] & 0x80)
      if (key === null && video != null && track.value === video) key = isKey
    }
    const body = b.subarray(c.dataStart, c.end)
    return { time, key: video == null || key === true, bytes: concat(element(ID.Cluster, body)) }
  })
  if (!parsed.some((c) => c.key)) parsed.forEach((c) => (c.key = true))

  // Duration in timecode units, plus about one frame so the last frame shows
  const duration = last + Math.round(1e9 / 30 / scale)
  const durBytes = new Uint8Array(8)
  new DataView(durBytes.buffer).setFloat64(0, duration)
  const infoBody = concat([...infoFields.filter((f) => f.id !== ID.Duration).map((f) => b.subarray(f.start, f.end)), ...element(ID.Duration, durBytes)])
  const infoEl = concat(element(ID.Info, infoBody))
  const tracksEl = b.subarray(tracks.start, tracks.end)
  const others = level1
    .filter((e) => ![ID.Info, ID.Tracks, ID.Cluster, ID.Cues, ID.SeekHead, ID.Void].includes(e.id) && e.size != null)
    .map((e) => b.subarray(e.start, e.end))

  // Fixed 8-byte numbers keep the Cues size independent of the positions it holds
  const cuePoint = (time, pos) =>
    concat(element(0xbb, ...element(0xb3, uint8(time)), ...element(0xb7, ...element(0xf7, new Uint8Array([video ?? 1])), ...element(0xf1, uint8(pos)))))
  const keyed = parsed.filter((c) => c.key)
  const cuesSize = concat(element(ID.Cues, ...keyed.map(() => cuePoint(0, 0)))).length
  let pos = infoEl.length + tracksEl.length + others.reduce((s, o) => s + o.length, 0) + cuesSize
  const points = []
  for (const c of parsed) {
    if (c.key) points.push(cuePoint(c.time, pos))
    pos += c.bytes.length
  }
  const cuesEl = concat(element(ID.Cues, ...points))
  const segBody = [infoEl, tracksEl, ...others, cuesEl, ...parsed.map((c) => c.bytes)]
  return concat([b.subarray(ebml.start, ebml.end), ...element(ID.Segment, ...segBody)])
}

/** Same as makeSeekable for a Blob; anything other than WebM, or a file it cannot read, comes back as it was. */
export async function seekableBlob(blob) {
  if (!blob || !/webm/i.test(blob.type || '')) return blob
  try {
    const bytes = new Uint8Array(await blob.arrayBuffer())
    const fixed = makeSeekable(bytes)
    return fixed === bytes ? blob : new Blob([fixed], { type: blob.type })
  } catch {
    return blob
  }
}
