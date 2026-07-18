/**
 * Pure text helpers for turning raw keyboard/physical-key input into the
 * normalized uppercase A-Z form the engine and word lists use.
 */

/** Strip diacritics and uppercase a single character, e.g. "é" -> "E". */
export function normalizeChar(ch: string): string {
  return ch
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
}

/** True if the (already normalized) character is a plain A-Z letter. */
export function isLetter(ch: string): boolean {
  return ch.length === 1 && ch >= 'A' && ch <= 'Z'
}
