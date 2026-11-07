import { Game } from '@/components/Game'
import { localScoreProvider } from '@/game/leaderboard'

export default function App() {
  // Swap `localScoreProvider` for an Arc wallet + onchain leaderboard provider later.
  return <Game scores={localScoreProvider} />
}
