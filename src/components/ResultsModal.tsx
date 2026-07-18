import type { Language, LanguageData } from '../data/types'
import type { GameState } from '../game/engine'
import { dictionaryUrl, type Strings } from '../i18n/strings'

interface ResultsModalProps {
  game: GameState
  language: Language
  languageData: LanguageData
  strings: Strings
  onClose: () => void
  onPlayAgain: () => void
}

const SOLVED_BADGES = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩', '⑪', '⑫', '⑬']

export function ResultsModal({ game, language, languageData, strings, onClose, onPlayAgain }: ResultsModalProps) {
  const won = game.status === 'won'
  const solvedSet = new Set(game.solveOrder)
  const order = [...game.solveOrder, ...game.boards.map((_, i) => i).filter((i) => !solvedSet.has(i))]

  return (
    <div className="overlay" role="presentation" onClick={onClose}>
      <div className="dialog dialog--results" role="dialog" aria-modal="true" aria-labelledby="results-title" onClick={(e) => e.stopPropagation()}>
        <h2 id="results-title" className={won ? 'results-title results-title--win' : 'results-title'}>
          {won ? strings.win : strings.lose}
        </h2>
        <p className="results-subtitle">
          {won ? strings.winSubtitle(game.guessCount, game.maxGuesses) : strings.loseSubtitle}
        </p>

        <h3 className="results-heading">{strings.solutionsHeading}</h3>
        <ol className="results-list">
          {order.map((boardIndex) => {
            const board = game.boards[boardIndex]!
            const solveIndex = game.solveOrder.indexOf(boardIndex)
            const solveNumber = solveIndex === -1 ? null : solveIndex + 1
            const displayWord = languageData.displayForms[board.solution] ?? board.solution
            const href = dictionaryUrl(language, board.solution, displayWord)
            return (
              <li key={boardIndex} className="results-list__item">
                {solveNumber !== null ? (
                  <span className="results-list__badge">{SOLVED_BADGES[solveNumber - 1] ?? solveNumber}</span>
                ) : (
                  <span className="results-list__badge results-list__badge--unsolved">—</span>
                )}
                <a href={href} target="_blank" rel="noreferrer noopener" className="results-list__word">
                  {displayWord}
                </a>
              </li>
            )
          })}
        </ol>

        <div className="dialog__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            {strings.close}
          </button>
          <button type="button" className="btn btn--primary" onClick={onPlayAgain}>
            {strings.playAgain}
          </button>
        </div>
      </div>
    </div>
  )
}
