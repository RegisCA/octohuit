import { WORD_LENGTH } from '../data/types'
import type { BoardState } from '../game/engine'
import { Tile } from './Tile'

interface BoardProps {
  board: BoardState
  boardIndex: number
  currentInput: string
  maxGuesses: number
  isPlaying: boolean
  shakeToken: number
  solveNumber: number | null
}

const SOLVED_BADGES = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩', '⑪', '⑫', '⑬']

export function Board({ board, boardIndex, currentInput, maxGuesses, isPlaying, shakeToken, solveNumber }: BoardProps) {
  const isSolved = board.solvedAt !== null
  const isActiveInputRow = isPlaying && !isSolved

  const rows = Array.from({ length: maxGuesses }, (_, rowIndex) => {
    const guess = board.guesses[rowIndex]
    if (guess) {
      return (
        <div className="board__row" key={rowIndex}>
          {guess.states.map((state, col) => (
            <Tile key={col} letter={guess.word[col] ?? ''} state={state} columnIndex={col} revealed />
          ))}
        </div>
      )
    }
    if (rowIndex === board.guesses.length && isActiveInputRow) {
      const letters = Array.from({ length: WORD_LENGTH }, (_, col) => currentInput[col] ?? '')
      const rowClass = shakeToken > 0 ? 'board__row board__row--input board__row--shake' : 'board__row board__row--input'
      return (
        <div className={rowClass} key={`${rowIndex}-${shakeToken}`}>
          {letters.map((letter, col) => (
            <Tile key={col} letter={letter} state={letter ? 'filled' : 'empty'} columnIndex={col} revealed={false} />
          ))}
        </div>
      )
    }
    return (
      <div className="board__row" key={rowIndex}>
        {Array.from({ length: WORD_LENGTH }, (_, col) => (
          <Tile key={col} letter="" state="empty" columnIndex={col} revealed={false} />
        ))}
      </div>
    )
  })

  const classes = ['board']
  if (isSolved) classes.push('board--solved')

  return (
    <div className={classes.join(' ')} data-board-index={boardIndex}>
      {isSolved && solveNumber !== null && (
        <span className="board__badge" aria-label={`solved-${solveNumber}`}>
          {SOLVED_BADGES[solveNumber - 1] ?? solveNumber}
        </span>
      )}
      <div className="board__rows">{rows}</div>
    </div>
  )
}
