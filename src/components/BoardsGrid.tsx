import type { GameState } from '../game/engine'
import { Board } from './Board'

interface BoardsGridProps {
  game: GameState
  currentInput: string
  shakeToken: number
}

export function BoardsGrid({ game, currentInput, shakeToken }: BoardsGridProps) {
  return (
    <div className="boards-grid">
      {game.boards.map((board, index) => {
        const solveIndex = game.solveOrder.indexOf(index)
        const solveNumber = solveIndex === -1 ? null : solveIndex + 1
        return (
          <Board
            key={index}
            board={board}
            boardIndex={index}
            currentInput={currentInput}
            maxGuesses={game.maxGuesses}
            isPlaying={game.status === 'playing'}
            shakeToken={shakeToken}
            solveNumber={solveNumber}
          />
        )
      })}
    </div>
  )
}
