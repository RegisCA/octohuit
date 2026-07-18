import type { GameState } from '../game/engine'
import type { Strings } from '../i18n/strings'
import { Board } from './Board'

interface BoardsGridProps {
  game: GameState
  currentInput: string
  shakeToken: number
  strings: Strings
}

export function BoardsGrid({ game, currentInput, shakeToken, strings }: BoardsGridProps) {
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
            solvedBadgeLabel={solveNumber === null ? null : strings.boardSolvedBadge(solveNumber)}
          />
        )
      })}
    </div>
  )
}
