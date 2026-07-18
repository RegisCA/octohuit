import { useGame } from './hooks/useGame'
import { useTheme } from './hooks/useTheme'
import { Header } from './components/Header'
import { BoardsGrid } from './components/BoardsGrid'
import { Keyboard } from './components/Keyboard'
import { ResultsModal } from './components/ResultsModal'
import { ConfirmDialog } from './components/ConfirmDialog'
import { Toast } from './components/Toast'

function App() {
  const [theme, setTheme] = useTheme()
  const {
    language,
    pool,
    game,
    currentInput,
    strings,
    languageData,
    keyboardState,
    toast,
    shakeToken,
    resultsOpen,
    pendingConfirm,
    setResultsOpen,
    requestLanguageChange,
    setPool,
    requestNewGame,
    confirmPending,
    cancelPending,
    typeLetter,
    backspace,
    submitCurrentGuess,
  } = useGame()

  return (
    <div className="app">
      <Header
        strings={strings}
        language={language}
        pool={pool}
        game={game}
        theme={theme}
        onLanguageChange={requestLanguageChange}
        onPoolChange={setPool}
        onNewGame={requestNewGame}
        onThemeChange={setTheme}
        onShowResults={() => setResultsOpen(true)}
      />

      <main className="app-main">
        <BoardsGrid game={game} currentInput={currentInput} shakeToken={shakeToken} />
        <Keyboard
          language={language}
          keyboardState={keyboardState}
          onLetter={typeLetter}
          onEnter={submitCurrentGuess}
          onBackspace={backspace}
        />
      </main>

      <Toast message={toast} />

      {resultsOpen && game.status !== 'playing' && (
        <ResultsModal
          game={game}
          language={language}
          languageData={languageData}
          strings={strings}
          onClose={() => setResultsOpen(false)}
          onPlayAgain={requestNewGame}
        />
      )}

      {pendingConfirm && pendingConfirm.type === 'language' && (
        <ConfirmDialog
          title={strings.confirmAbandonTitle}
          body={strings.confirmAbandonBody}
          confirmLabel={strings.confirmAbandonConfirm}
          cancelLabel={strings.confirmAbandonCancel}
          onConfirm={confirmPending}
          onCancel={cancelPending}
        />
      )}

      {pendingConfirm && pendingConfirm.type === 'newGame' && (
        <ConfirmDialog
          title={strings.confirmNewGameTitle}
          body={strings.confirmNewGameBody}
          confirmLabel={strings.newGame}
          cancelLabel={strings.confirmAbandonCancel}
          onConfirm={confirmPending}
          onCancel={cancelPending}
        />
      )}
    </div>
  )
}

export default App
