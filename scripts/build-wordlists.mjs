#!/usr/bin/env node
/**
 * Word-list data pipeline for octohuit.
 *
 * Downloads (and caches) raw word/frequency sources, processes them into
 * the three pools required by src/data/types.ts (LanguageData), and writes
 * src/data/en.ts and src/data/fr.ts.
 *
 * Run: node scripts/build-wordlists.mjs
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const CACHE_DIR = path.join(__dirname, '.cache')
const DATA_DIR = path.join(ROOT, 'src', 'data')

const WORD_RE = /^[A-Z]{5}$/

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

async function ensureCacheDir() {
  await mkdir(CACHE_DIR, { recursive: true })
  const gitignorePath = path.join(CACHE_DIR, '.gitignore')
  if (!existsSync(gitignorePath)) {
    await writeFile(gitignorePath, '*\n', 'utf8')
  }
}

/** Download a URL (or read from cache) and return its text contents. */
async function fetchCached(url, filename) {
  const cachePath = path.join(CACHE_DIR, filename)
  if (existsSync(cachePath)) {
    console.log(`[cache] ${filename}`)
    return readFile(cachePath, 'utf8')
  }
  console.log(`[download] ${url}`)
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`)
  }
  const text = await res.text()
  await writeFile(cachePath, text, 'utf8')
  return text
}

/** Try a list of candidate URLs in order, returning the first that succeeds. */
async function fetchFirstAvailable(candidates, filename) {
  const cachePath = path.join(CACHE_DIR, filename)
  if (existsSync(cachePath)) {
    console.log(`[cache] ${filename}`)
    return { text: await readFile(cachePath, 'utf8'), url: '(cache)' }
  }
  let lastErr
  for (const url of candidates) {
    try {
      const text = await fetchCached(url, filename)
      return { text, url }
    } catch (err) {
      console.warn(`  [warn] ${url} failed: ${err.message}`)
      lastErr = err
    }
  }
  throw lastErr
}

/** Strip accents/diacritics from a string (NFD normalize + remove combining marks). */
function stripAccents(str) {
  return str.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

/** Normalize a raw word into our canonical uppercase 5-letter form, or null if invalid. */
function normalizeWord(raw) {
  const trimmed = raw.trim()
  if (!trimmed) return null
  // Reject anything containing hyphens, apostrophes, spaces, or other punctuation
  // in the *original* form before we strip accents.
  if (/[-'’\s.]/.test(trimmed)) return null
  const stripped = stripAccents(trimmed).toUpperCase()
  if (!WORD_RE.test(stripped)) return null
  return stripped
}

function sortUnique(words) {
  return Array.from(new Set(words)).sort()
}

// ---------------------------------------------------------------------------
// Offensive-word filter (solution pools only; allowedGuesses may still
// contain them, matching real Wordle behavior).
// ---------------------------------------------------------------------------

const OFFENSIVE_EN = new Set([
  'NIGGA', 'NIGGR', 'FAGGO', 'RETAR', 'WHORE', 'SLUTS', 'COONS', 'SPICK',
  'DAGOS', 'KIKES', 'CHINK', 'GOOKS', 'TRANN', 'RAPED', 'RAPES', 'RAPER',
])

const OFFENSIVE_FR = new Set([
  'PUTES', 'PUTE1', 'NEGRO', 'BOUGN', 'ENCUL',
])

function filterOffensive(words, blocklist) {
  return words.filter((w) => !blocklist.has(w))
}

// ---------------------------------------------------------------------------
// English pipeline
// ---------------------------------------------------------------------------

const EN_ANSWERS_URLS = [
  'https://gist.githubusercontent.com/cfreshman/a03ef2cba789d8cf00c08f767e0fad7b/raw/wordle-answers-alphabetical.txt',
  'https://raw.githubusercontent.com/tabatkins/wordle-list/main/words',
]
const EN_GUESSES_URLS = [
  'https://gist.githubusercontent.com/cfreshman/cdcdf777450c5b5301e439061d29694c/raw/wordle-allowed-guesses.txt',
]
const EN_FREQ_URL =
  'https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/en/en_50k.txt'

async function buildEnglish() {
  console.log('\n=== English ===')

  const { text: answersText, url: answersUrl } = await fetchFirstAvailable(
    EN_ANSWERS_URLS,
    'en-answers.txt',
  )
  const { text: guessesText, url: guessesUrl } = await fetchFirstAvailable(
    EN_GUESSES_URLS,
    'en-guesses.txt',
  )
  const freqText = await fetchCached(EN_FREQ_URL, 'en-freq-50k.txt')

  const commonRaw = answersText
    .split('\n')
    .map((l) => normalizeWord(l))
    .filter((w) => w !== null)
  const common = sortUnique(commonRaw)

  const guessesRaw = guessesText
    .split('\n')
    .map((l) => normalizeWord(l))
    .filter((w) => w !== null)

  const allowedGuesses = sortUnique([...common, ...guessesRaw])
  const allowedSet = new Set(allowedGuesses)

  // Frequency map: word -> count
  const freqMap = new Map()
  for (const line of freqText.split('\n')) {
    const line2 = line.trim()
    if (!line2) continue
    const [word, countStr] = line2.split(/\s+/)
    if (!word || !countStr) continue
    const norm = normalizeWord(word)
    if (!norm) continue
    const count = Number(countStr)
    if (!Number.isFinite(count)) continue
    // Keep the max count if duplicates appear.
    freqMap.set(norm, Math.max(freqMap.get(norm) ?? 0, count))
  }

  // Extended = common ∪ (allowedGuesses words present in frequency list,
  // ranked by frequency, top N), targeting ~4000-7000 words total.
  const rankedByFreq = allowedGuesses
    .filter((w) => freqMap.has(w))
    .sort((a, b) => freqMap.get(b) - freqMap.get(a))

  const TOP_N = 5500
  const extendedSet = new Set(common)
  for (const w of rankedByFreq) {
    if (extendedSet.size >= TOP_N && !common.includes(w)) continue
    extendedSet.add(w)
    if (extendedSet.size >= TOP_N + common.length) break
  }
  // Guard: keep only words that are actually in allowedGuesses (should already be true).
  const extended = sortUnique(Array.from(extendedSet).filter((w) => allowedSet.has(w)))

  const commonFiltered = filterOffensive(common, OFFENSIVE_EN)
  const extendedFiltered = sortUnique(
    filterOffensive(extended, OFFENSIVE_EN).concat(commonFiltered),
  )

  console.log(`  answers source: ${answersUrl}`)
  console.log(`  guesses source: ${guessesUrl}`)
  console.log(`  freq source:    ${EN_FREQ_URL}`)
  console.log(`  common:   ${commonFiltered.length}`)
  console.log(`  extended: ${extendedFiltered.length}`)
  console.log(`  allowed:  ${allowedGuesses.length}`)

  return {
    solutions: {
      common: commonFiltered,
      extended: extendedFiltered,
    },
    allowedGuesses,
    displayForms: {},
  }
}

// ---------------------------------------------------------------------------
// French pipeline
// ---------------------------------------------------------------------------

const FR_LEXIQUE_URL = 'http://www.lexique.org/databases/Lexique383/Lexique383.tsv'
const FR_FALLBACK_FREQ_URL =
  'https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/fr/fr_50k.txt'

// Lexique383 alone only yields ~5k distinct 5-letter words, short of the
// >=8000 allowedGuesses target. These two broad-coverage word lists (a
// generic French word array and a Hunspell dictionary's stem list) are
// unioned in purely for allowedGuesses breadth; solution pools still come
// from the curated, frequency-ranked Lexique data.
const FR_EXTRA_WORDLIST_URLS = [
  {
    url: 'https://raw.githubusercontent.com/wooorm/dictionaries/main/dictionaries/fr/index.dic',
    filename: 'fr-hunspell.dic',
    kind: 'hunspell',
  },
  {
    url: 'https://raw.githubusercontent.com/words/an-array-of-french-words/master/index.json',
    filename: 'fr-word-array.json',
    kind: 'json',
  },
]

async function buildFrenchFromLexique() {
  const tsvText = await fetchCached(FR_LEXIQUE_URL, 'lexique383.tsv')

  const lines = tsvText.split('\n')
  const header = lines[0].split('\t')
  const idx = {
    ortho: header.indexOf('ortho'),
    freqlivres: header.indexOf('freqlivres'),
    freqfilms2: header.indexOf('freqfilms2'),
    islem: header.indexOf('islem'),
    cgram: header.indexOf('cgram'),
  }
  for (const [k, v] of Object.entries(idx)) {
    if (v === -1) throw new Error(`Lexique383.tsv missing expected column: ${k}`)
  }

  // group[normalizedKey] = { spellings: Map<orthoRaw, {freq, isLemma}> }
  const groups = new Map()

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line) continue
    const cols = line.split('\t')
    const orthoRaw = cols[idx.ortho]
    if (!orthoRaw) continue
    const normalized = normalizeWord(orthoRaw)
    if (!normalized) continue

    const freqlivres = Number(cols[idx.freqlivres]) || 0
    const freqfilms2 = Number(cols[idx.freqfilms2]) || 0
    const freq = freqlivres + freqfilms2
    const isLemma = cols[idx.islem] === '1'

    let group = groups.get(normalized)
    if (!group) {
      group = { spellings: new Map() }
      groups.set(normalized, group)
    }
    let spelling = group.spellings.get(orthoRaw)
    if (!spelling) {
      spelling = { freq: 0, isLemma: false }
      group.spellings.set(orthoRaw, spelling)
    }
    spelling.freq += freq
    if (isLemma) spelling.isLemma = true
  }

  // Resolve each group to its canonical (most-frequent) spelling.
  const resolved = new Map() // normalized -> { freq, isLemma, display: accentedUpper }
  for (const [normalized, group] of groups) {
    let best = null
    for (const [orthoRaw, info] of group.spellings) {
      if (!best || info.freq > best.info.freq) {
        best = { orthoRaw, info }
      }
    }
    const displayAccented = best.orthoRaw.toUpperCase()
    resolved.set(normalized, {
      freq: best.info.freq,
      isLemma: best.info.isLemma,
      display: displayAccented,
    })
  }

  return resolved
}

/**
 * Pull in extra 5-letter words from broad-coverage word lists, purely to
 * widen allowedGuesses. Returns normalized -> accented-display (best guess).
 */
async function loadExtraFrenchWords() {
  const extra = new Map()
  for (const source of FR_EXTRA_WORDLIST_URLS) {
    try {
      const text = await fetchCached(source.url, source.filename)
      let words
      if (source.kind === 'json') {
        words = JSON.parse(text)
      } else {
        // Hunspell .dic: first line is a count, rest are "word/AFFIXFLAGS".
        words = text
          .split('\n')
          .slice(1)
          .map((l) => l.split('/')[0])
      }
      let added = 0
      for (const raw of words) {
        if (typeof raw !== 'string') continue
        const normalized = normalizeWord(raw)
        if (!normalized) continue
        if (!extra.has(normalized)) {
          extra.set(normalized, raw.trim().toUpperCase())
          added++
        }
      }
      console.log(`  [extra] ${source.filename}: +${added} new words`)
    } catch (err) {
      console.warn(`  [warn] extra word list ${source.url} failed: ${err.message}`)
    }
  }
  return extra
}

async function buildFrenchFallback() {
  console.warn('  [fallback] using FrequencyWords fr_50k + Lexique unreachable path skipped')
  const freqText = await fetchCached(FR_FALLBACK_FREQ_URL, 'fr-freq-50k.txt')

  const resolved = new Map()
  for (const line of freqText.split('\n')) {
    const line2 = line.trim()
    if (!line2) continue
    const [word, countStr] = line2.split(/\s+/)
    if (!word || !countStr) continue
    const normalized = normalizeWord(word)
    if (!normalized) continue
    const freq = Number(countStr) || 0
    const existing = resolved.get(normalized)
    if (!existing || freq > existing.freq) {
      resolved.set(normalized, {
        freq,
        isLemma: true, // no POS info available in fallback; treat all as eligible
        display: word.toUpperCase(),
      })
    }
  }
  return resolved
}

async function buildFrench() {
  console.log('\n=== French ===')

  let resolved
  let usedFallback = false
  try {
    resolved = await buildFrenchFromLexique()
    console.log(`  lexicon source: ${FR_LEXIQUE_URL}`)
  } catch (err) {
    console.warn(`  [warn] Lexique fetch/parse failed: ${err.message}`)
    resolved = await buildFrenchFallback()
    usedFallback = true
    console.log(`  lexicon source (fallback): ${FR_FALLBACK_FREQ_URL}`)
  }

  const extra = await loadExtraFrenchWords()

  // allowedGuesses: every 5-letter alphabetic word found in Lexique, unioned
  // with the broad-coverage extra word lists (for breadth), regardless of
  // lemma status.
  const allowedGuesses = sortUnique([...resolved.keys(), ...extra.keys()])

  // Solution candidates: prefer lemma forms (base/dictionary forms) to avoid
  // rare conjugated junk, ranked by frequency.
  const lemmaEntries = Array.from(resolved.entries())
    .filter(([, v]) => v.isLemma)
    .sort((a, b) => b[1].freq - a[1].freq)

  // Fallback: if lemma filtering is too aggressive (shouldn't happen with
  // Lexique, but guard anyway), widen to all entries.
  const candidatePool =
    lemmaEntries.length >= 4000
      ? lemmaEntries
      : Array.from(resolved.entries()).sort((a, b) => b[1].freq - a[1].freq)

  const COMMON_N = 2000
  const EXTENDED_N = 5500

  const commonRaw = candidatePool.slice(0, COMMON_N).map(([k]) => k)
  const extendedRaw = candidatePool.slice(0, EXTENDED_N).map(([k]) => k)

  const common = sortUnique(filterOffensive(commonRaw, OFFENSIVE_FR))
  const extended = sortUnique(
    filterOffensive(sortUnique([...extendedRaw, ...common]), OFFENSIVE_FR),
  )

  // displayForms: normalized -> accented display, only where they differ.
  // Lexique (frequency-ranked, collision-resolved) takes priority; the extra
  // broad-coverage lists fill in words Lexique doesn't cover.
  const displayForms = {}
  for (const word of allowedGuesses) {
    const entry = resolved.get(word)
    if (entry) {
      if (entry.display !== word) displayForms[word] = entry.display
      continue
    }
    const extraDisplay = extra.get(word)
    if (extraDisplay && extraDisplay !== word) {
      displayForms[word] = extraDisplay
    }
  }

  console.log(`  used fallback: ${usedFallback}`)
  console.log(`  common:   ${common.length}`)
  console.log(`  extended: ${extended.length}`)
  console.log(`  allowed:  ${allowedGuesses.length}`)
  console.log(`  displayForms entries: ${Object.keys(displayForms).length}`)

  return {
    solutions: { common, extended },
    allowedGuesses,
    displayForms,
  }
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function validate(langName, data) {
  const errors = []
  const allowedSet = new Set(data.allowedGuesses)

  for (const pool of ['common', 'extended']) {
    const words = data.solutions[pool]
    const seen = new Set()
    for (const w of words) {
      if (!WORD_RE.test(w)) errors.push(`${langName}/${pool}: invalid word "${w}"`)
      if (seen.has(w)) errors.push(`${langName}/${pool}: duplicate word "${w}"`)
      seen.add(w)
      if (!allowedSet.has(w)) {
        errors.push(`${langName}/${pool}: "${w}" missing from allowedGuesses`)
      }
    }
  }

  const seenAllowed = new Set()
  for (const w of data.allowedGuesses) {
    if (!WORD_RE.test(w)) errors.push(`${langName}/allowedGuesses: invalid word "${w}"`)
    if (seenAllowed.has(w)) errors.push(`${langName}/allowedGuesses: duplicate word "${w}"`)
    seenAllowed.add(w)
  }

  const commonSet = new Set(data.solutions.common)
  const extendedSet = new Set(data.solutions.extended)
  for (const w of commonSet) {
    if (!extendedSet.has(w)) errors.push(`${langName}: common word "${w}" missing from extended`)
  }

  if (errors.length) {
    console.error(`\n[VALIDATION ERRORS - ${langName}]`)
    for (const e of errors.slice(0, 50)) console.error(`  ${e}`)
    if (errors.length > 50) console.error(`  ...and ${errors.length - 50} more`)
    throw new Error(`${langName}: ${errors.length} validation error(s)`)
  }
  console.log(`  [ok] ${langName} passed validation`)
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

function renderModule(varName, data) {
  const json = JSON.stringify(
    {
      solutions: data.solutions,
      allowedGuesses: data.allowedGuesses,
      displayForms: data.displayForms,
    },
    null,
    2,
  )
  return `// GENERATED FILE — do not edit by hand.
// Produced by scripts/build-wordlists.mjs. Run that script to regenerate.
import type { LanguageData } from './types'

export const ${varName}: LanguageData = ${json}
`
}

async function writeLanguageFile(varName, data, filename) {
  const contents = renderModule(varName, data)
  const outPath = path.join(DATA_DIR, filename)
  await writeFile(outPath, contents, 'utf8')
  console.log(`  wrote ${path.relative(ROOT, outPath)}`)
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  await ensureCacheDir()

  const en = await buildEnglish()
  const fr = await buildFrench()

  console.log('\n=== Validation ===')
  validate('en', en)
  validate('fr', fr)

  console.log('\n=== Writing output ===')
  await writeLanguageFile('en', en, 'en.ts')
  await writeLanguageFile('fr', fr, 'fr.ts')

  console.log('\nDone.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
