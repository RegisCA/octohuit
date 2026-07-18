/** Shared contract between the word-data pipeline and the game engine/UI. */

export type Language = 'en' | 'fr'
export type WordPool = 'common' | 'extended'

export interface LanguageData {
  /**
   * Solution pools, keyed by pool tier. All words are 5 letters,
   * uppercase A–Z (accents stripped for French).
   * 'common' is a strict subset of high-frequency words (~1500–3000);
   * 'extended' is a larger pool that still excludes obscure junk.
   */
  solutions: Record<WordPool, string[]>
  /**
   * Every word accepted as a guess (superset of all solution pools).
   * Uppercase A–Z, 5 letters, deduplicated, sorted.
   */
  allowedGuesses: string[]
  /**
   * Normalized form → display form with proper accents, for French
   * (e.g. "ETAIT" → "ÉTAIT"). Only contains entries that differ from
   * their key. Empty object for English.
   */
  displayForms: Record<string, string>
}

export const WORD_LENGTH = 5
export const BOARD_COUNT = 8
export const MAX_GUESSES = 13
