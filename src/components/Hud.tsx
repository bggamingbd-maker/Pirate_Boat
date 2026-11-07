import { Anchor, Coins, Pause, Play, Trophy, Volume2, VolumeX } from 'lucide-react'
import type { HudState } from '@/game/types'

interface HudProps {
  hud: HudState
  muted: boolean
  onTogglePause: () => void
  onToggleMute: () => void
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="glass pointer-events-auto grid h-11 w-11 place-items-center rounded-2xl text-[#0b1f3a] transition active:scale-95"
    >
      {children}
    </button>
  )
}

export function Hud({ hud, muted, onTogglePause, onToggleMute }: HudProps) {
  const paused = hud.status === 'paused'
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-col gap-2 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="glass rounded-2xl px-4 py-2">
          <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#0b1f3a]/60">Score</div>
          <div className="font-display tnum text-3xl font-bold leading-none text-[#0b1f3a]">
            {hud.score.toLocaleString()}
          </div>
        </div>
        <div className="flex gap-2">
          <IconButton label={paused ? 'Resume' : 'Pause'} onClick={onTogglePause}>
            {paused ? <Play size={20} /> : <Pause size={20} />}
          </IconButton>
          <IconButton label={muted ? 'Unmute' : 'Mute'} onClick={onToggleMute}>
            {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </IconButton>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="glass flex h-8 items-center gap-1.5 rounded-full px-3 text-sm font-bold text-[#0b1f3a]">
          <Coins size={15} className="text-[#c47800]" />
          <span className="tnum">{hud.coins}</span>
        </div>
        <div className="glass flex h-8 items-center gap-1.5 rounded-full px-3 text-sm font-bold text-[#0b1f3a]">
          <Trophy size={15} className="text-[#c47800]" />
          <span className="tnum">{hud.best.toLocaleString()}</span>
        </div>
        <div className="glass flex h-8 min-w-0 flex-1 items-center gap-2 rounded-full px-3">
          <Anchor size={15} className="shrink-0 text-[#0b1f3a]" />
          <div className="relative h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-[#0b1f3a]/15">
            <div
              className="absolute inset-0 origin-left rounded-full bg-gradient-to-r from-[#ffb703] to-[#ffd166]"
              style={{ transform: `scaleX(${Math.max(0.02, hud.legProgress)})` }}
            />
          </div>
          <span className="tnum shrink-0 text-xs font-bold text-[#0b1f3a]">{hud.toPortM} m</span>
        </div>
      </div>
    </div>
  )
}
