/**
 * Pure Octordle game engine: tile scoring, keyboard-state aggregation, and
 * the game reducer. No React, no DOM, no localStorage — safe to unit test
 * in isolation and safe to import from any layer.
 */

import { BOARD_COUNT, MAX_GUESSES, WORD_LENGTH } from '../data/types'

export type TileState = 'correct' | 'present' | 'absent'
export type KeyState = 'correct' | 'present' | 'absent' | 'unknown'

export interface GuessResult {
  word: string
  states: TileState[]
}

export interface BoardState {
  solution: string
  guesses: GuessResult[]
  /** 1-indexed guess number that solved this board, or null if unsolved. */
  solvedAt: number | null
}

export type GameStatus = 'playing' | 'won' | 'lost'

export interface GameState {
  boards: BoardState[]
  guessCount: number
  maxGuesses: number
  status: GameStatus
  /** Board indices, in the order they were solved. */
  solveOrder: number[]
}

/**
 * Score a single guess against a single solution using standard Wordle
 * rules: exact-position matches are 'correct' first: remaining solution
 * letters are then consumed left-to-right by non-matching guess letters
 * to determine 'present' vs 'absent'. This correctly handles duplicate
 * letters in both the guess and the solution.
 */
export function scoreGuess(guess: string, solution: string): TileState[] {
  const len = solution.length
  const result: TileState[] = new Array(len).fill('absent')
  const remaining: Record<string, number> = {}

  for (let i = 0; i < len; i++) {
    if (guess[i] === solution[i]) {
      result[i] = 'correct'
    } else {
      const ch = solution[i]
      remaining[ch] = (remaining[ch] ?? 0) + 1
    }
  }

  for (let i = 0; i < len; i++) {
    if (result[i] === 'correct') continue
    const ch = guess[i]
    if ((remaining[ch] ?? 0) > 0) {
      result[i] = 'present'
      remaining[ch]! -= 1
    } else {
      result[i] = 'absent'
    }
  }

  return result
}

/** Pick `count` distinct words uniformly at random from `pool`. */
export function pickSolutions(pool: string[], count: number = BOARD_COUNT): string[] {
  const unique = Array.from(new Set(pool))
  const arr = unique.slice()
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = arr[i]!
    arr[i] = arr[j]!
    arr[j] = tmp
  }
  return arr.slice(0, count)
}

export function createGame(solutions: string[], maxGuesses: number = MAX_GUESSES): GameState {
  return {
    boards: solutions.map((solution) => ({ solution, guesses: [], solvedAt: null })),
    guessCount: 0,
    maxGuesses,
    status: 'playing',
    solveOrder: [],
  }
}

/**
 * Apply a guess to every unsolved board simultaneously. Solved boards are
 * frozen and receive no new row. Returns a new GameState; does not mutate
 * the input. No-op (returns the same reference) if the game already ended.
 */
export function submitGuess(state: GameState, guess: string): GameState {
  if (state.status !== 'playing') return state

  const guessCount = state.guessCount + 1

  const boards = state.boards.map((board): BoardState => {
    if (board.solvedAt !== null) return board
    const states = scoreGuess(guess, board.solution)
    const guesses = [...board.guesses, { word: guess, states }]
    const solved = guess === board.solution
    return { ...board, guesses, solvedAt: solved ? guessCount : null }
  })

  const newlySolved = boards
    .map((board, index) => ({ board, index }))
    .filter(({ board, index }) => board.solvedAt === guessCount && state.boards[index]!.solvedAt === null)
    .map(({ index }) => index)

  const solveOrder = [...state.solveOrder, ...newlySolved]
  const allSolved = boards.every((board) => board.solvedAt !== null)

  let status: GameStatus = state.status
  if (allSolved) {
    status = 'won'
  } else if (guessCount >= state.maxGuesses) {
    status = 'lost'
  }

  return { ...state, boards, guessCount, solveOrder, status }
}

/**
 * Best known state of every letter A-Z on every board, for the on-screen
 * keyboard's per-board mini-cell display. Frozen (solved) boards keep
 * whatever their last guess revealed.
 */
export function computeKeyboardState(state: GameState): Record<string, KeyState[]> {
  const rank: Record<KeyState, number> = { unknown: 0, absent: 1, present: 2, correct: 3 }
  const result: Record<string, KeyState[]> = {}

  for (let code = 65; code <= 90; code++) {
    const letter = String.fromCharCode(code)
    result[letter] = new Array(state.boards.length).fill('unknown') as KeyState[]
  }

  state.boards.forEach((board, boardIndex) => {
    for (const guess of board.guesses) {
      for (let i = 0; i < guess.word.length; i++) {
        const letter = guess.word[i]!
        const tileState = guess.states[i]!
        const current = result[letter]![boardIndex]!
        if (rank[tileState] > rank[current]) {
          result[letter]![boardIndex] = tileState
        }
      }
    }
  })

  return result
}

/** True if the letter is 'absent' on every board that has any information about it (used to dim a key entirely). */
export function isLetterDeadEverywhere(states: KeyState[]): boolean {
  const known = states.filter((s) => s !== 'unknown')
  return known.length > 0 && known.every((s) => s === 'absent')
}

export function isGameOver(state: GameState): boolean {
  return state.status !== 'playing'
}

export { BOARD_COUNT, MAX_GUESSES, WORD_LENGTH }
