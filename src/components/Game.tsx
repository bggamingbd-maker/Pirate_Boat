import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronsLeft, ChevronsRight } from 'lucide-react'
import { PirateEngine } from '@/game/engine'
import { Sfx } from '@/game/audio'
import { loadMuted, saveMuted, type ScoreProvider } from '@/game/leaderboard'
import { INITIAL_HUD, type HudState, type RunResult } from '@/game/types'
import { Hud } from './Hud'
import { GameOverOverlay, MenuOverlay, PausedOverlay } from './Overlays'

interface GameProps {
  /** Where scores are stored. Swap in an onchain provider here later. */
  scores: ScoreProvider
}

export function Game({ scores }: GameProps) {
  const frameRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<PirateEngine | null>(null)
  const pointers = useRef(new Map<number, -1 | 1>())
  const keys = useRef({ left: false, right: false })

  const [sfx] = useState(() => new Sfx(loadMuted()))
  const [muted, setMuted] = useState(() => sfx.muted)
  const [hud, setHud] = useState<HudState>(() => ({ ...INITIAL_HUD, best: scores.getBest() }))
  const [result, setResult] = useState<RunResult | null>(null)
  const [touchAxis, setTouchAxis] = useState(0)

  // Engine lifecycle.
  useEffect(() => {
    const canvas = canvasRef.current
    const frame = frameRef.current
    if (!canvas || !frame) return
    const engine = new PirateEngine(
      canvas,
      {
        onHud: setHud,
        onSound: (n) => sfx.play(n),
        onGameOver: (r) => {
          setResult(r)
          void scores.submit(r)
        },
      },
      scores.getBest(),
    )
    engineRef.current = engine
    const fit = () => {
      const rect = frame.getBoundingClientRect()
      engine.resize(rect.width, rect.height)
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(frame)
    engine.run()

    const onHidden = () => {
      if (document.hidden) engine.pause()
    }
    document.addEventListener('visibilitychange', onHidden)
    return () => {
      document.removeEventListener('visibilitychange', onHidden)
      ro.disconnect()
      engine.destroy()
      engineRef.current = null
    }
  }, [scores, sfx])

  const startRun = useCallback(() => {
    sfx.unlock()
    setResult(null)
    pointers.current.clear()
    setTouchAxis(0)
    engineRef.current?.setTouchAxis(0)
    engineRef.current?.start()
  }, [sfx])

  const togglePause = useCallback(() => {
    sfx.unlock()
    engineRef.current?.togglePause()
  }, [sfx])

  const toggleMute = useCallback(() => {
    sfx.unlock()
    const next = !sfx.muted
    sfx.setMuted(next)
    saveMuted(next)
    setMuted(next)
    if (!next) sfx.play('click')
  }, [sfx])

  // Keyboard controls.
  useEffect(() => {
    const sync = () => engineRef.current?.setKeyAxis((keys.current.right ? 1 : 0) - (keys.current.left ? 1 : 0))
    const isLeft = (c: string) => c === 'ArrowLeft' || c === 'KeyA'
    const isRight = (c: string) => c === 'ArrowRight' || c === 'KeyD'

    const down = (e: KeyboardEvent) => {
      const engine = engineRef.current
      if (!engine) return
      if (isLeft(e.code) || isRight(e.code)) {
        e.preventDefault()
        if (isLeft(e.code)) keys.current.left = true
        else keys.current.right = true
        sync()
        return
      }
      if (e.code === 'KeyM') return toggleMute()
      if (e.code === 'KeyP' || e.code === 'Escape') return togglePause()
      if (e.code === 'Space' || e.code === 'Enter') {
        // Let focused buttons handle their own activation.
        if ((e.target as HTMLElement | null)?.closest('button')) return
        e.preventDefault()
        if (e.repeat) return
        if (engine.status === 'menu' || engine.status === 'over') startRun()
        else if (engine.status === 'paused') togglePause()
      }
    }
    const up = (e: KeyboardEvent) => {
      if (isLeft(e.code)) keys.current.left = false
      else if (isRight(e.code)) keys.current.right = false
      else return
      sync()
    }
    const blur = () => {
      keys.current = { left: false, right: false }
      sync()
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', blur)
    }
  }, [startRun, togglePause, toggleMute])

  // Touch / mouse steering: hold the left or right half of the screen.
  const updateTouch = () => {
    let axis = 0
    pointers.current.forEach((v) => (axis += v))
    axis = Math.max(-1, Math.min(1, axis))
    setTouchAxis(axis)
    engineRef.current?.setTouchAxis(axis)
  }
  const sideOf = (e: React.PointerEvent<HTMLDivElement>): -1 | 1 => {
    const rect = e.currentTarget.getBoundingClientRect()
    return e.clientX < rect.left + rect.width / 2 ? -1 : 1
  }
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId, sideOf(e))
    updateTouch()
  }
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(e.pointerId)) return
    pointers.current.set(e.pointerId, sideOf(e))
    updateTouch()
  }
  const onPointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(e.pointerId)
    updateTouch()
  }

  const playing = hud.status === 'playing' || hud.status === 'paused'

  return (
    <div className="fixed inset-0 grid place-items-center">
      <div
        ref={frameRef}
        className="relative touch-none select-none overflow-hidden bg-[#0e63ad] sm:rounded-[28px] sm:shadow-[0_30px_80px_rgba(0,0,0,0.5)]"
        style={{
          width: 'min(100vw, calc(100dvh * 4 / 7))',
          height: 'min(100dvh, calc(100vw * 7 / 4))',
        }}
      >
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

        <div
          className="absolute inset-0 z-[1]"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
          onLostPointerCapture={onPointerEnd}
          onContextMenu={(e) => e.preventDefault()}
        />

        {hud.status === 'playing' && (
          <div className="pointer-events-none absolute inset-x-0 bottom-16 z-[2] flex justify-between px-5">
            <div
              className={`grid h-12 w-12 place-items-center rounded-full bg-white/20 text-white transition ${touchAxis < 0 ? 'scale-110 bg-white/45' : 'opacity-70'}`}
            >
              <ChevronsLeft size={26} />
            </div>
            <div
              className={`grid h-12 w-12 place-items-center rounded-full bg-white/20 text-white transition ${touchAxis > 0 ? 'scale-110 bg-white/45' : 'opacity-70'}`}
            >
              <ChevronsRight size={26} />
            </div>
          </div>
        )}

        {playing && <Hud hud={hud} muted={muted} onTogglePause={togglePause} onToggleMute={toggleMute} />}

        {hud.status === 'menu' && (
          <MenuOverlay best={hud.best} muted={muted} onStart={startRun} onToggleMute={toggleMute} />
        )}
        {hud.status === 'paused' && (
          <PausedOverlay muted={muted} onResume={togglePause} onRestart={startRun} onToggleMute={toggleMute} />
        )}
        {hud.status === 'over' && <GameOverOverlay result={result} hud={hud} onRestart={startRun} />}
      </div>
    </div>
  )
}
