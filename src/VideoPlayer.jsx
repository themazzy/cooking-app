import { useCallback, useEffect, useRef, useState } from 'react'

const SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2]
const SPEED_KEY = 'cooking.videoSpeed'
const SKIP = 5
const FRAME = 1 / 30

const clock = (s) => {
  if (!Number.isFinite(s)) return '0:00'
  const m = Math.floor(s / 60)
  return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`
}
const savedSpeed = () => {
  try {
    const v = Number(localStorage.getItem(SPEED_KEY))
    return SPEEDS.includes(v) ? v : 1
  } catch {
    return 1
  }
}

/**
 * Recipe video with controls made for cooking along: a scrub bar that follows
 * the finger, playback speed, 5 second skips (also double tap on either
 * side), frame steps while paused, repeat and a full screen view.
 */
export default function VideoPlayer({ src, poster }) {
  const video = useRef(null)
  const track = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [buffered, setBuffered] = useState(0)
  const [speed, setSpeed] = useState(savedSpeed)
  const [speedMenu, setSpeedMenu] = useState(false)
  const [loop, setLoop] = useState(false)
  const [full, setFull] = useState(false)
  const [scrub, setScrub] = useState(null) // time under the finger while dragging
  const [shown, setShown] = useState(true)
  const [flash, setFlash] = useState(null) // "-5 s" / "+5 s" after a double tap
  const pending = useRef(null)
  const hideTimer = useRef(null)
  const tapTimer = useRef(null)

  const v = () => video.current

  useEffect(() => {
    if (v()) v().playbackRate = speed
    try {
      localStorage.setItem(SPEED_KEY, String(speed))
    } catch {
      /* speed is only a convenience */
    }
  }, [speed])

  // Controls fade while playing and come back on any touch
  const poke = useCallback(() => {
    setShown(true)
    clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => {
      if (v() && !v().paused) {
        setShown(false)
        setSpeedMenu(false)
      }
    }, 2800)
  }, [])
  useEffect(() => () => [hideTimer, tapTimer].forEach((t) => clearTimeout(t.current)), [])

  // Seeking while a seek is still running makes the picture lag behind the
  // finger; keep only the latest wish and send it when the last one lands.
  const seek = useCallback((t) => {
    const el = v()
    if (!el) return
    const to = Math.max(0, Math.min(t, (Number.isFinite(el.duration) ? el.duration : t) || 0))
    if (el.seeking) pending.current = to
    else el.currentTime = to
    setTime(to)
  }, [])
  const onSeeked = () => {
    if (pending.current != null) {
      const t = pending.current
      pending.current = null
      v().currentTime = t
    }
  }

  const toggle = useCallback(() => {
    const el = v()
    if (!el) return
    if (el.paused) el.play().catch(() => {})
    else el.pause()
    poke()
  }, [poke])
  const skip = useCallback(
    (s) => {
      seek(v().currentTime + s)
      poke()
    },
    [seek, poke],
  )
  const step = (dir) => {
    v().pause()
    seek(v().currentTime + dir * FRAME)
  }

  // One tap plays or pauses; a quick second tap on the left or right skips back or ahead
  const onTap = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const side = e.clientX - rect.left < rect.width / 3 ? -1 : e.clientX - rect.left > (rect.width * 2) / 3 ? 1 : 0
    if (tapTimer.current) {
      clearTimeout(tapTimer.current)
      tapTimer.current = null
      if (side) {
        skip(side * SKIP)
        setFlash(side < 0 ? `−${SKIP} s` : `+${SKIP} s`)
        setTimeout(() => setFlash(null), 600)
        return
      }
    }
    tapTimer.current = setTimeout(() => {
      tapTimer.current = null
      if (!shown && !v().paused) poke()
      else toggle()
    }, 220)
  }

  const timeAt = (clientX) => {
    const rect = track.current.getBoundingClientRect()
    return (Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)) || 0) * (duration || 0)
  }
  const onScrubStart = (e) => {
    if (!duration) return
    e.currentTarget.setPointerCapture(e.pointerId)
    const t = timeAt(e.clientX)
    setScrub(t)
    seek(t)
    clearTimeout(hideTimer.current)
    setShown(true)
  }
  const onScrubMove = (e) => {
    if (scrub == null) return
    const t = timeAt(e.clientX)
    setScrub(t)
    seek(t)
  }
  const onScrubEnd = (e) => {
    if (scrub == null) return
    const t = timeAt(e.clientX)
    pending.current = null
    v().currentTime = t
    setScrub(null)
    poke()
  }

  const onKey = (e) => {
    const keys = {
      ' ': toggle,
      k: toggle,
      ArrowLeft: () => skip(-SKIP),
      ArrowRight: () => skip(SKIP),
      ',': () => step(-1),
      '.': () => step(1),
      f: () => setFull((f) => !f),
    }
    if (keys[e.key]) {
      e.preventDefault()
      keys[e.key]()
    }
  }

  useEffect(() => {
    if (!full) return
    const back = (e) => e.key === 'Escape' && setFull(false)
    window.addEventListener('keydown', back)
    return () => window.removeEventListener('keydown', back)
  }, [full])

  const shownTime = scrub ?? time
  const pct = duration ? (shownTime / duration) * 100 : 0

  return (
    <div className={`player${full ? ' full' : ''}${shown || !playing ? '' : ' idle'}`} tabIndex={0} onKeyDown={onKey}>
      <video
        ref={video}
        src={src}
        poster={poster}
        playsInline
        preload="metadata"
        loop={loop}
        onClick={onTap}
        onPlay={() => {
          setPlaying(true)
          poke()
        }}
        onPause={() => {
          setPlaying(false)
          setShown(true)
        }}
        onLoadedMetadata={(e) => {
          e.currentTarget.playbackRate = speed
          setDuration(Number.isFinite(e.currentTarget.duration) ? e.currentTarget.duration : 0)
        }}
        onDurationChange={(e) => Number.isFinite(e.currentTarget.duration) && setDuration(e.currentTarget.duration)}
        onTimeUpdate={(e) => scrub == null && setTime(e.currentTarget.currentTime)}
        onProgress={(e) => {
          const b = e.currentTarget.buffered
          if (b.length) setBuffered(b.end(b.length - 1))
        }}
        onSeeked={onSeeked}
        onRateChange={(e) => setSpeed(e.currentTarget.playbackRate)}
      />
      {!playing && scrub == null && (
        <button className="player-big" aria-label="Play" onClick={toggle}>
          ▶
        </button>
      )}
      {flash && <div className="player-flash">{flash}</div>}
      {scrub != null && <div className="player-flash">{clock(scrub)}</div>}

      <div className="player-bar" onPointerDown={poke}>
        <div className="player-seek">
          <span className="player-time">{clock(shownTime)}</span>
          <div
            ref={track}
            className={`player-track${scrub != null ? ' active' : ''}`}
            onPointerDown={onScrubStart}
            onPointerMove={onScrubMove}
            onPointerUp={onScrubEnd}
            onPointerCancel={onScrubEnd}
            role="slider"
            aria-label="Position"
            aria-valuemin={0}
            aria-valuemax={Math.round(duration)}
            aria-valuenow={Math.round(shownTime)}
          >
            <div className="player-rail">
              <div className="player-buffered" style={{ width: `${duration ? (buffered / duration) * 100 : 0}%` }} />
              <div className="player-done" style={{ width: `${pct}%` }} />
            </div>
            <div className="player-knob" style={{ left: `${pct}%` }} />
          </div>
          <span className="player-time">{clock(duration)}</span>
        </div>
        {speedMenu ? (
          <div className="player-buttons player-speeds" role="group" aria-label="Playback speed">
            {SPEEDS.map((s) => (
              <button
                key={s}
                className={`player-btn${s === speed ? ' on' : ''}`}
                onClick={() => {
                  setSpeed(s)
                  setSpeedMenu(false)
                  poke()
                }}
              >
                {s}×
              </button>
            ))}
          </div>
        ) : (
          <div className="player-buttons">
            <button className="player-btn" aria-label={playing ? 'Pause' : 'Play'} onClick={toggle}>
              {playing ? '❚❚' : '▶'}
            </button>
            <button className="player-btn" aria-label={`Back ${SKIP} seconds`} onClick={() => skip(-SKIP)}>
              ↺{SKIP}
            </button>
            <button className="player-btn" aria-label={`Ahead ${SKIP} seconds`} onClick={() => skip(SKIP)}>
              {SKIP}↻
            </button>
            {!playing && (
              <>
                <button className="player-btn" aria-label="Previous frame" onClick={() => step(-1)}>
                  ‹
                </button>
                <button className="player-btn" aria-label="Next frame" onClick={() => step(1)}>
                  ›
                </button>
              </>
            )}
            <span className="player-gap" />
            <button className={`player-btn${speed !== 1 ? ' on' : ''}`} aria-label="Playback speed" onClick={() => setSpeedMenu(true)}>
              {speed}×
            </button>
            <button className={`player-btn${loop ? ' on' : ''}`} aria-label="Repeat" aria-pressed={loop} onClick={() => setLoop((l) => !l)}>
              ⟲
            </button>
            <button className="player-btn" aria-label={full ? 'Close full screen' : 'Full screen'} onClick={() => setFull((f) => !f)}>
              {full ? '✕' : '⛶'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
