import { describe, expect, it } from 'vitest'
import {
  computeKeyboardState,
  computeScore,
  createGame,
  isLetterDeadEverywhere,
  pickSolutions,
  scoreGuess,
  submitGuess,
} from './engine'

describe('scoreGuess', () => {
  it('marks all correct when guess equals solution', () => {
    expect(scoreGuess('APPLE', 'APPLE')).toEqual([
      'correct',
      'correct',
      'correct',
      'correct',
      'correct',
    ])
  })

  it('marks all absent when no letters overlap', () => {
    expect(scoreGuess('CRWTH', 'ABIDE')).toEqual([
      'absent',
      'absent',
      'absent',
      'absent',
      'absent',
    ])
  })

  it('handles duplicate letters in the guess correctly (ALLEE vs EAGLE)', () => {
    // solution EAGLE = E,A,G,L,E
    // guess    ALLEE = A,L,L,E,E
    // pos0 A: not correct, solution has an A elsewhere -> present
    // pos1 L: not correct, solution has an L elsewhere -> present
    // pos2 L: not correct, no L letters left to consume -> absent
    // pos3 E: not correct, solution has an E left (after pos4 correct) -> present
    // pos4 E: correct
    expect(scoreGuess('ALLEE', 'EAGLE')).toEqual([
      'present',
      'present',
      'absent',
      'present',
      'correct',
    ])
  })

  it('does not over-count a repeated guess letter once both solution occurrences are matched correct', () => {
    // solution EAGLE = E,A,G,L,E ; guess EERIE = E,E,R,I,E
    // pos0 E vs E -> correct; pos4 E vs E -> correct (both solution E's consumed)
    // pos1 E vs A -> not correct; no E's remain in the solution -> absent
    // pos2 R vs G -> absent
    // pos3 I vs L -> absent
    expect(scoreGuess('EERIE', 'EAGLE')).toEqual([
      'correct',
      'absent',
      'absent',
      'absent',
      'correct',
    ])
  })

  it('marks extra duplicate guess letters as absent once the solution count is exhausted', () => {
    // solution ROBOT has one O; guess FOOLS has two O's
    // solution ROBOT = R,O,B,O,T ; guess FOOLS = F,O,O,L,S
    // pos0 F vs R -> absent
    // pos1 O vs O -> correct
    // pos2 O vs B -> not correct; remaining solution letters excluding pos1 correct = R,B,O,T -> O count 1
    // pos3 L vs O -> absent
    // pos4 S vs T -> absent
    // second pass: pos2 O, remaining O count 1 -> present
    expect(scoreGuess('FOOLS', 'ROBOT')).toEqual([
      'absent',
      'correct',
      'present',
      'absent',
      'absent',
    ])
  })
})

describe('pickSolutions', () => {
  it('returns the requested count of distinct words drawn from the pool', () => {
    const pool = ['AAAAA', 'BBBBB', 'CCCCC', 'DDDDD', 'EEEEE', 'FFFFF', 'GGGGG', 'HHHHH', 'IIIII']
    const picked = pickSolutions(pool, 8)
    expect(picked).toHaveLength(8)
    expect(new Set(picked).size).toBe(8)
    for (const word of picked) {
      expect(pool).toContain(word)
    }
  })

  it('de-duplicates the source pool before picking', () => {
    const pool = ['AAAAA', 'AAAAA', 'BBBBB']
    const picked = pickSolutions(pool, 2)
    expect(new Set(picked).size).toBe(2)
  })
})

describe('createGame / submitGuess', () => {
  const solutions = ['APPLE', 'BEACH', 'CHAIR', 'DANCE', 'EAGLE', 'FLAME', 'GRAPE', 'HOUSE']

  it('creates a fresh game with 8 unsolved boards', () => {
    const game = createGame(solutions)
    expect(game.boards).toHaveLength(8)
    expect(game.status).toBe('playing')
    expect(game.guessCount).toBe(0)
    expect(game.boards.every((b) => b.solvedAt === null)).toBe(true)
  })

  it('applies a guess to every unsolved board and increments guessCount', () => {
    const game = createGame(solutions)
    const next = submitGuess(game, 'SNAKE')
    expect(next.guessCount).toBe(1)
    expect(next.boards.every((b) => b.guesses.length === 1)).toBe(true)
  })

  it('freezes a board once solved and stops appending new rows to it', () => {
    let game = createGame(solutions)
    game = submitGuess(game, 'APPLE') // solves board 0
    expect(game.boards[0]!.solvedAt).toBe(1)
    expect(game.solveOrder).toEqual([0])

    game = submitGuess(game, 'BEACH') // solves board 1; board 0 must not get a new row
    expect(game.boards[0]!.guesses).toHaveLength(1)
    expect(game.boards[1]!.solvedAt).toBe(2)
    expect(game.solveOrder).toEqual([0, 1])
  })

  it('transitions to won once all boards are solved', () => {
    let game = createGame(solutions)
    for (const word of solutions) {
      game = submitGuess(game, word)
    }
    expect(game.status).toBe('won')
    expect(game.solveOrder).toEqual([0, 1, 2, 3, 4, 5, 6, 7])
  })

  it('transitions to lost once maxGuesses is exhausted without solving everything', () => {
    let game = createGame(solutions, 3)
    game = submitGuess(game, 'WRONG')
    game = submitGuess(game, 'WRONG')
    game = submitGuess(game, 'WRONG')
    expect(game.status).toBe('lost')
    expect(game.guessCount).toBe(3)
  })

  it('is a no-op once the game has ended', () => {
    let game = createGame(solutions, 1)
    game = submitGuess(game, 'WRONG')
    expect(game.status).toBe('lost')
    const after = submitGuess(game, 'APPLE')
    expect(after).toBe(game)
  })
})

describe('computeKeyboardState', () => {
  const solutions = ['APPLE', 'BEACH']

  it('reports unknown for letters never guessed', () => {
    const game = createGame(solutions)
    const kb = computeKeyboardState(game)
    expect(kb['Z']).toEqual(['unknown', 'unknown'])
  })

  it('tracks best-known per-board state independently', () => {
    let game = createGame(solutions)
    game = submitGuess(game, 'PEACH') // board0=APPLE: P present; board1=BEACH: P absent (no P in BEACH)
    const kb = computeKeyboardState(game)
    // 'P' on board0 (APPLE): guess PEACH vs APPLE -> P at pos0 not correct but APPLE has P at pos1 -> present
    expect(kb['P']![0]).toBe('present')
    // 'P' on board1 (BEACH has no P at all) -> absent
    expect(kb['P']![1]).toBe('absent')
    expect(game.boards[1]!.solvedAt).toBeNull()
  })

  it('upgrades a letter from present to correct as better information arrives', () => {
    let game = createGame(['APPLE'])
    game = submitGuess(game, 'PLEAT') // P present (pos0 vs APPLE has P at idx1)
    let kb = computeKeyboardState(game)
    expect(kb['P']![0]).toBe('present')
    game = submitGuess(game, 'APPLE')
    kb = computeKeyboardState(game)
    expect(kb['P']![0]).toBe('correct')
  })

  it('never downgrades a letter once it is known correct', () => {
    let game = createGame(['APPLE', 'GRAPE'])
    game = submitGuess(game, 'APPLE') // board0 solved: A,P,P,L,E all correct
    // board1 GRAPE also gets this guess since it's unsolved
    const kb = computeKeyboardState(game)
    expect(kb['P']![0]).toBe('correct')
  })
})

describe('computeScore', () => {
  const solutions = ['APPLE', 'BEACH', 'CHAIR', 'DANCE', 'EAGLE', 'FLAME', 'GRAPE', 'HOUSE']

  it('sums the solving guess number of every board when all are solved', () => {
    let game = createGame(solutions)
    for (const word of solutions) {
      game = submitGuess(game, word)
    }
    // every board is solved on the guess matching its position: 1+2+...+8
    expect(computeScore(game)).toBe(36)
  })

  it('charges maxGuesses + 1 for each unsolved board', () => {
    let game = createGame(solutions, 3)
    game = submitGuess(game, 'WRONG')
    game = submitGuess(game, 'WRONG')
    game = submitGuess(game, 'WRONG')
    expect(game.status).toBe('lost')
    expect(computeScore(game)).toBe(8 * 4)
  })

  it('rewards early solves over unsolved boards', () => {
    let game = createGame(['APPLE', 'BEACH'], 3)
    game = submitGuess(game, 'APPLE') // board0 solved on guess 1
    game = submitGuess(game, 'WRONG')
    game = submitGuess(game, 'WRONG')
    expect(game.status).toBe('lost')
    expect(computeScore(game)).toBe(1 + 4)
  })
})

describe('isLetterDeadEverywhere', () => {
  it('is true only when every known state is absent', () => {
    expect(isLetterDeadEverywhere(['absent', 'absent', 'unknown'])).toBe(true)
    expect(isLetterDeadEverywhere(['unknown', 'unknown'])).toBe(false)
    expect(isLetterDeadEverywhere(['absent', 'present'])).toBe(false)
  })
})
