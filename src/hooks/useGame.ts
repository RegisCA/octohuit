import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { GameState } from '../game/engine'
import { computeKeyboardState, createGame, pickSolutions, submitGuess } from '../game/engine'
import { isLetter, normalizeChar } from '../game/text'
import { getLanguageData } from '../data'
import type { Language, WordPool } from '../data/types'
import { BOARD_COUNT, WORD_LENGTH } from '../data/types'
import { getStrings } from '../i18n/strings'

const STORAGE_KEY = 'octohuit:state:v1'

interface PersistedState {
  language: Language
  pool: WordPool
  game: GameState
}

function isValidGameState(game: unknown): game is GameState {
  if (typeof game !== 'object' || game === null) return false
  const g = game as Record<string, unknown>
  return (
    Array.isArray(g.boards) &&
    g.boards.length === BOARD_COUNT &&
    g.boards.every(
      (b: unknown) =>
        typeof b === 'object' &&
        b !== null &&
        typeof (b as { solution?: unknown }).solution === 'string' &&
        ((b as { solution: string }).solution.length === WORD_LENGTH) &&
        Array.isArray((b as { guesses?: unknown }).guesses),
    ) &&
    typeof g.guessCount === 'number' &&
    typeof g.maxGuesses === 'number' &&
    (g.status === 'playing' || g.status === 'won' || g.status === 'lost') &&
    Array.isArray(g.solveOrder)
  )
}

function readPersisted(): PersistedState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<PersistedState>
    if (parsed.language !== 'en' && parsed.language !== 'fr') return null
    if (parsed.pool !== 'common' && parsed.pool !== 'extended') return null
    if (!isValidGameState(parsed.game)) return null
    return parsed as PersistedState
  } catch {
    return null
  }
}

function newGameFor(language: Language, pool: WordPool): GameState {
  const data = getLanguageData(language)
  const solutions = pickSolutions(data.solutions[pool], BOARD_COUNT)
  return createGame(solutions)
}

type PendingConfirm = { type: 'language'; language: Language } | { type: 'newGame' } | null

export function useGame() {
  // Read localStorage exactly once per component instance (lazy useState
  // initializer, unlike useMemo, is guaranteed by React to run only once).
  const [initial] = useState<PersistedState | null>(() => readPersisted())

  const [language, setLanguageState] = useState<Language>(initial?.language ?? 'en')
  const [pool, setPoolState] = useState<WordPool>(initial?.pool ?? 'common')
  const [game, setGame] = useState<GameState>(() => initial?.game ?? newGameFor(initial?.language ?? 'en', initial?.pool ?? 'common'))
  const [currentInput, setCurrentInput] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const [shakeToken, setShakeToken] = useState(0)
  const [resultsOpen, setResultsOpen] = useState(false)
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hasAutoOpenedResults = useRef(false)
  // Synchronous source of truth for the typed word; currentInput state
  // mirrors it for rendering. Rapid same-frame key events (e.g. a double
  // Enter) then can't act on stale closures and double-submit a guess.
  const inputRef = useRef('')

  const strings = getStrings(language)
  const languageData = useMemo(() => getLanguageData(language), [language])
  const allowedGuesses = useMemo(() => new Set(languageData.allowedGuesses), [languageData])

  // Persist on every relevant change.
  useEffect(() => {
    try {
      const payload: PersistedState = { language, pool, game }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
    } catch {
      // ignore persistence failures
    }
  }, [language, pool, game])

  // Auto-open the results modal the moment a game ends.
  useEffect(() => {
    if (game.status !== 'playing' && !hasAutoOpenedResults.current) {
      hasAutoOpenedResults.current = true
      setResultsOpen(true)
    }
    if (game.status === 'playing') {
      hasAutoOpenedResults.current = false
    }
  }, [game.status])

  const showToast = useCallback((message: string) => {
    setToast(message)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 1800)
  }, [])

  const beginNewGame = useCallback((lang: Language, nextPool: WordPool) => {
    setGame(newGameFor(lang, nextPool))
    inputRef.current = ''
    setCurrentInput('')
    setResultsOpen(false)
    hasAutoOpenedResults.current = false
  }, [])

  const gameInProgress = game.status === 'playing' && game.guessCount > 0

  const requestLanguageChange = useCallback(
    (nextLanguage: Language) => {
      if (nextLanguage === language) return
      if (gameInProgress) {
        setPendingConfirm({ type: 'language', language: nextLanguage })
      } else {
        setLanguageState(nextLanguage)
        beginNewGame(nextLanguage, pool)
      }
    },
    [language, gameInProgress, pool, beginNewGame],
  )

  const setPool = useCallback(
    (nextPool: WordPool) => {
      if (nextPool === pool) return
      setPoolState(nextPool)
      // The running game keeps its already-drawn solutions; let the player
      // know the change only kicks in on the next deal.
      if (gameInProgress) showToast(strings.poolChangeNote)
    },
    [pool, gameInProgress, showToast, strings.poolChangeNote],
  )

  const requestNewGame = useCallback(() => {
    if (gameInProgress) {
      setPendingConfirm({ type: 'newGame' })
    } else {
      beginNewGame(language, pool)
    }
  }, [gameInProgress, language, pool, beginNewGame])

  const confirmPending = useCallback(() => {
    if (!pendingConfirm) return
    if (pendingConfirm.type === 'language') {
      setLanguageState(pendingConfirm.language)
      beginNewGame(pendingConfirm.language, pool)
    } else {
      beginNewGame(language, pool)
    }
    setPendingConfirm(null)
  }, [pendingConfirm, language, pool, beginNewGame])

  const cancelPending = useCallback(() => setPendingConfirm(null), [])

  const typeLetter = useCallback(
    (rawChar: string) => {
      if (game.status !== 'playing') return
      const ch = normalizeChar(rawChar)
      if (!isLetter(ch)) return
      if (inputRef.current.length >= WORD_LENGTH) return
      inputRef.current += ch
      setCurrentInput(inputRef.current)
    },
    [game.status],
  )

  const backspace = useCallback(() => {
    if (game.status !== 'playing') return
    inputRef.current = inputRef.current.slice(0, -1)
    setCurrentInput(inputRef.current)
  }, [game.status])

  const submitCurrentGuess = useCallback(() => {
    if (game.status !== 'playing') return
    const word = inputRef.current
    if (word.length === 0) return
    if (word.length !== WORD_LENGTH || !allowedGuesses.has(word)) {
      setShakeToken((t) => t + 1)
      showToast(strings.notInWordList)
      return
    }
    inputRef.current = ''
    setCurrentInput('')
    setGame((prev) => submitGuess(prev, word))
  }, [game.status, allowedGuesses, showToast, strings.notInWordList])

  // Physical keyboard support.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === 'Enter') {
        submitCurrentGuess()
        return
      }
      if (e.key === 'Backspace') {
        backspace()
        return
      }
      if (e.key.length === 1) {
        const ch = normalizeChar(e.key)
        if (isLetter(ch)) typeLetter(ch)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [submitCurrentGuess, backspace, typeLetter])

  const keyboardState = useMemo(() => computeKeyboardState(game), [game])

  return {
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
  }
}
