import type { Language, WordPool } from '../data/types'
import type { GameState } from '../game/engine'
import type { Strings } from '../i18n/strings'
import type { ThemePref } from '../hooks/useTheme'

interface HeaderProps {
  strings: Strings
  language: Language
  pool: WordPool
  game: GameState
  theme: ThemePref
  onLanguageChange: (lang: Language) => void
  onPoolChange: (pool: WordPool) => void
  onNewGame: () => void
  onThemeChange: (theme: ThemePref) => void
  onShowResults: () => void
}

export function Header({
  strings,
  language,
  pool,
  game,
  theme,
  onLanguageChange,
  onPoolChange,
  onNewGame,
  onThemeChange,
  onShowResults,
}: HeaderProps) {
  const gameEnded = game.status !== 'playing'

  return (
    <header className="app-header">
      <div className="app-header__brand">
        <h1 className="wordmark">OCTOHUIT</h1>
        <span className="guess-counter" aria-live="polite">
          {strings.guessCounter(game.guessCount, game.maxGuesses)}
        </span>
      </div>

      <div className="app-header__controls">
        <div className="control-group" role="group" aria-label={strings.language}>
          <button
            type="button"
            className={`toggle-btn ${language === 'en' ? 'toggle-btn--active' : ''}`}
            onClick={() => onLanguageChange('en')}
          >
            EN
          </button>
          <button
            type="button"
            className={`toggle-btn ${language === 'fr' ? 'toggle-btn--active' : ''}`}
            onClick={() => onLanguageChange('fr')}
          >
            FR
          </button>
        </div>

        <div className="control-group" role="group" aria-label={strings.pool}>
          <button
            type="button"
            className={`toggle-btn ${pool === 'common' ? 'toggle-btn--active' : ''}`}
            onClick={() => onPoolChange('common')}
          >
            {strings.poolCommon}
          </button>
          <button
            type="button"
            className={`toggle-btn ${pool === 'extended' ? 'toggle-btn--active' : ''}`}
            onClick={() => onPoolChange('extended')}
          >
            {strings.poolExtended}
          </button>
        </div>

        <div className="control-group" role="group" aria-label={strings.theme}>
          <button
            type="button"
            className={`toggle-btn toggle-btn--icon ${theme === 'system' ? 'toggle-btn--active' : ''}`}
            onClick={() => onThemeChange('system')}
            title={strings.themeSystem}
            aria-label={strings.themeSystem}
          >
            ⚙
          </button>
          <button
            type="button"
            className={`toggle-btn toggle-btn--icon ${theme === 'light' ? 'toggle-btn--active' : ''}`}
            onClick={() => onThemeChange('light')}
            title={strings.themeLight}
            aria-label={strings.themeLight}
          >
            ☀
          </button>
          <button
            type="button"
            className={`toggle-btn toggle-btn--icon ${theme === 'dark' ? 'toggle-btn--active' : ''}`}
            onClick={() => onThemeChange('dark')}
            title={strings.themeDark}
            aria-label={strings.themeDark}
          >
            ☾
          </button>
        </div>

        {gameEnded && (
          <button type="button" className="btn btn--ghost" onClick={onShowResults}>
            {strings.results}
          </button>
        )}

        <button type="button" className="btn btn--primary" onClick={onNewGame}>
          {strings.newGame}
        </button>
      </div>
    </header>
  )
}
