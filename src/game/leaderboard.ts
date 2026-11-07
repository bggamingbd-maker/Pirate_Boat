import type { RunResult } from './types'

/**
 * Score persistence boundary.
 *
 * The game only talks to a `ScoreProvider`. Today that is the browser's local
 * storage. To add an Arc wallet + onchain leaderboard later, implement this
 * interface (for example an `ArcScoreProvider` that reads the connected wallet
 * and calls a leaderboard contract) and pass it to <Game /> instead of
 * `localScoreProvider`. Nothing in the engine or UI has to change.
 */
export interface ScoreProvider {
  readonly id: string
  /** Best score known to this provider. */
  getBest(): number
  /** Called once when a run ends. */
  submit(result: RunResult): Promise<void>
}

const BEST_KEY = 'pirate-boat-adventure:best'

function readNumber(key: string): number {
  try {
    const raw = window.localStorage.getItem(key)
    const n = raw ? Number.parseInt(raw, 10) : 0
    return Number.isFinite(n) && n > 0 ? n : 0
  } catch {
    return 0
  }
}

export const localScoreProvider: ScoreProvider = {
  id: 'local',
  getBest: () => readNumber(BEST_KEY),
  submit(result) {
    try {
      if (result.score > readNumber(BEST_KEY)) {
        window.localStorage.setItem(BEST_KEY, String(result.score))
      }
    } catch {
      // Storage can be unavailable (private mode). The game stays playable.
    }
    return Promise.resolve()
  },
}

const MUTE_KEY = 'pirate-boat-adventure:muted'

export function loadMuted(): boolean {
  try {
    return window.localStorage.getItem(MUTE_KEY) === '1'
  } catch {
    return false
  }
}

export function saveMuted(muted: boolean): void {
  try {
    window.localStorage.setItem(MUTE_KEY, muted ? '1' : '0')
  } catch {
    // ignore
  }
}
