import { motion } from 'framer-motion'
import { Anchor, Coins, Gem, Play, RotateCcw, Ship, Trophy, Volume2, VolumeX } from 'lucide-react'
import type { HudState, RunResult } from '@/game/types'

const primaryBtn =
  'pointer-events-auto flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#0b1f3a] px-6 font-display text-lg font-bold text-white shadow-lg transition active:scale-[0.98] hover:bg-[#12315c]'
const ghostBtn =
  'pointer-events-auto flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold text-[#0b1f3a]/80 transition hover:bg-[#0b1f3a]/5 active:scale-[0.98]'

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#04132f]/35 p-5">
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 24 }}
        className="glass w-full max-w-sm rounded-[28px] p-6 text-center"
      >
        {children}
      </motion.div>
    </div>
  )
}

function Keycap({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="grid h-7 min-w-7 place-items-center rounded-lg border border-[#0b1f3a]/20 bg-white px-1.5 text-xs font-bold text-[#0b1f3a] shadow-[0_2px_0_rgba(11,31,58,0.15)]">
      {children}
    </kbd>
  )
}

interface MenuProps {
  best: number
  muted: boolean
  onStart: () => void
  onToggleMute: () => void
}

export function MenuOverlay({ best, muted, onStart, onToggleMute }: MenuProps) {
  return (
    <Shell>
      <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-b from-[#ffd166] to-[#f2a100] text-[#0b1f3a] shadow-md">
        <Ship size={34} />
      </div>
      <h1 className="font-display text-balance text-4xl font-bold leading-[1.05] text-[#0b1f3a]">
        Pirate Boat Adventure
      </h1>
      <p className="text-pretty mx-auto mt-2 max-w-[28ch] text-sm text-[#0b1f3a]/70">
        Grab the gold, crack open treasure, and dodge everything else. How far can you sail?
      </p>

      <div className="mx-auto mt-4 inline-flex items-center gap-2 rounded-full bg-[#0b1f3a]/8 px-3 py-1.5 text-sm font-bold text-[#0b1f3a]">
        <Trophy size={15} className="text-[#c47800]" />
        Best <span className="tnum">{best.toLocaleString()}</span>
      </div>

      <button type="button" className={`${primaryBtn} mt-5`} onClick={onStart}>
        <Play size={20} /> Start sailing
      </button>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-[#0b1f3a]/70">
        <span className="flex items-center gap-1.5">
          <Keycap>A</Keycap>
          <Keycap>D</Keycap>
          or
          <Keycap>←</Keycap>
          <Keycap>→</Keycap>
        </span>
        <span>Touch: hold left or right side</span>
      </div>
      <button type="button" className={`${ghostBtn} mx-auto mt-2`} onClick={onToggleMute}>
        {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        {muted ? 'Sound off' : 'Sound on'}
      </button>
    </Shell>
  )
}

interface PausedProps {
  muted: boolean
  onResume: () => void
  onRestart: () => void
  onToggleMute: () => void
}

export function PausedOverlay({ muted, onResume, onRestart, onToggleMute }: PausedProps) {
  return (
    <Shell>
      <h2 className="font-display text-4xl font-bold text-[#0b1f3a]">Paused</h2>
      <p className="mt-1 text-sm text-[#0b1f3a]/70">The sea waits for no one, but it will wait for you.</p>
      <button type="button" className={`${primaryBtn} mt-5`} onClick={onResume}>
        <Play size={20} /> Resume
      </button>
      <div className="mt-2 flex justify-center gap-1">
        <button type="button" className={ghostBtn} onClick={onRestart}>
          <RotateCcw size={16} /> Restart run
        </button>
        <button type="button" className={ghostBtn} onClick={onToggleMute}>
          {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          {muted ? 'Unmute' : 'Mute'}
        </button>
      </div>
      <p className="mt-2 text-xs text-[#0b1f3a]/50">Press P or Esc to resume</p>
    </Shell>
  )
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[#0b1f3a]/6 px-3 py-2.5 text-left">
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[#0b1f3a]/55">
        {icon}
        {label}
      </div>
      <div className="font-display tnum text-xl font-bold text-[#0b1f3a]">{value}</div>
    </div>
  )
}

interface OverProps {
  result: RunResult | null
  hud: HudState
  onRestart: () => void
}

export function GameOverOverlay({ result, hud, onRestart }: OverProps) {
  const r = result
  return (
    <Shell>
      <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#c1121f]">Shipwrecked</div>
      <h2 className="font-display mt-1 text-5xl font-bold leading-none text-[#0b1f3a] tnum">
        {(r?.score ?? hud.score).toLocaleString()}
      </h2>
      {r?.newBest ? (
        <div className="mx-auto mt-3 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#ffd166] to-[#ffb703] px-3 py-1 text-sm font-bold text-[#0b1f3a]">
          <Trophy size={15} /> New best score!
        </div>
      ) : (
        <p className="mt-2 text-sm text-[#0b1f3a]/70">
          Best <span className="tnum font-bold">{hud.best.toLocaleString()}</span>
        </p>
      )}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Stat icon={<Coins size={12} />} label="Coins" value={String(r?.coins ?? hud.coins)} />
        <Stat icon={<Gem size={12} />} label="Treasure" value={String(r?.chests ?? hud.chests)} />
        <Stat icon={<Ship size={12} />} label="Distance" value={`${r?.distanceM ?? hud.distanceM} m`} />
        <Stat icon={<Anchor size={12} />} label="Stage" value={String(r?.stage ?? hud.stage)} />
      </div>
      <button type="button" className={`${primaryBtn} mt-5`} onClick={onRestart}>
        <RotateCcw size={20} /> Sail again
      </button>
      <p className="mt-3 text-xs text-[#0b1f3a]/50">Best score is saved on this device. Press Space to restart.</p>
    </Shell>
  )
}
