// Shared constants and types for the Pirate Boat Adventure engine.

/** Logical world size. The canvas is scaled to fit while keeping this aspect ratio. */
export const W = 400
export const H = 700
/** Fixed vertical position of the player's boat. */
export const BOAT_Y = 570

export type GameStatus = 'menu' | 'playing' | 'paused' | 'over'

export type SoundName = 'coin' | 'chest' | 'crash' | 'port' | 'start' | 'click' | 'pause'

export type EntityKind = 'coin' | 'chest' | 'rock' | 'barrel' | 'monster' | 'enemy'

export interface Entity {
  id: number
  kind: EntityKind
  x: number
  y: number
  /** Visual / base radius. */
  r: number
  /** Horizontal drift (px/s). */
  vx: number
  /** Extra downward speed on top of the sea scroll (px/s). */
  vy: number
  phase: number
  seed: number
  /** Age in seconds. */
  t: number
  /** Sea monster emergence, 0 (hidden ripples) to 1 (fully risen). */
  emerge: number
  collected: boolean
}

/** Snapshot of everything the React HUD needs. */
export interface HudState {
  status: GameStatus
  score: number
  best: number
  coins: number
  chests: number
  distanceM: number
  toPortM: number
  /** 0..1 progress to the next port. */
  legProgress: number
  stage: number
  newBest: boolean
}

/** Result of one finished run. This is what a future onchain leaderboard would receive. */
export interface RunResult {
  score: number
  coins: number
  chests: number
  distanceM: number
  stage: number
  durationMs: number
  newBest: boolean
}

export interface EngineEvents {
  onHud: (state: HudState) => void
  onGameOver: (result: RunResult) => void
  onSound: (name: SoundName) => void
}

export const INITIAL_HUD: HudState = {
  status: 'menu',
  score: 0,
  best: 0,
  coins: 0,
  chests: 0,
  distanceM: 0,
  toPortM: 600,
  legProgress: 0,
  stage: 1,
  newBest: false,
}
