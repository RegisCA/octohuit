import type { Language } from '../data/types'

export interface Strings {
  title: string
  guessCounter: (used: number, max: number) => string
  language: string
  pool: string
  poolCommon: string
  poolExtended: string
  newGame: string
  results: string
  theme: string
  themeSystem: string
  themeLight: string
  themeDark: string
  confirmAbandonTitle: string
  confirmAbandonBody: string
  confirmAbandonConfirm: string
  confirmAbandonCancel: string
  confirmNewGameTitle: string
  confirmNewGameBody: string
  poolChangeNote: string
  notInWordList: string
  win: string
  lose: string
  winSubtitle: (guessesUsed: number, max: number) => string
  loseSubtitle: string
  solutionsHeading: string
  close: string
  playAgain: string
  boardSolvedBadge: (n: number) => string
}

const en: Strings = {
  title: 'OCTOHUIT',
  guessCounter: (used, max) => `${used}/${max}`,
  language: 'Language',
  pool: 'Word list',
  poolCommon: 'Common',
  poolExtended: 'Extended',
  newGame: 'New game',
  results: 'Results',
  theme: 'Theme',
  themeSystem: 'System',
  themeLight: 'Light',
  themeDark: 'Dark',
  confirmAbandonTitle: 'Abandon current game?',
  confirmAbandonBody: 'Switching language will discard your progress on this game.',
  confirmAbandonConfirm: 'Abandon game',
  confirmAbandonCancel: 'Cancel',
  confirmNewGameTitle: 'Start a new game?',
  confirmNewGameBody: 'This will discard your progress on the current game.',
  poolChangeNote: 'Applies to your next new game.',
  notInWordList: 'Not in word list',
  win: 'You solved it!',
  lose: 'Better luck next time',
  winSubtitle: (used, max) => `Solved all 8 boards in ${used}/${max} guesses.`,
  loseSubtitle: 'Out of guesses. Here are the answers:',
  solutionsHeading: 'Solutions',
  close: 'Close',
  playAgain: 'Play again',
  boardSolvedBadge: (n) => `Solved on guess ${n}`,
}

const fr: Strings = {
  title: 'OCTOHUIT',
  guessCounter: (used, max) => `${used}/${max}`,
  language: 'Langue',
  pool: 'Liste de mots',
  poolCommon: 'Courant',
  poolExtended: 'Étendu',
  newGame: 'Nouvelle partie',
  results: 'Résultats',
  theme: 'Thème',
  themeSystem: 'Système',
  themeLight: 'Clair',
  themeDark: 'Sombre',
  confirmAbandonTitle: 'Abandonner la partie en cours ?',
  confirmAbandonBody: 'Changer de langue effacera votre progression sur cette partie.',
  confirmAbandonConfirm: 'Abandonner',
  confirmAbandonCancel: 'Annuler',
  confirmNewGameTitle: 'Commencer une nouvelle partie ?',
  confirmNewGameBody: 'Cela effacera votre progression sur la partie en cours.',
  poolChangeNote: 'S’appliquera à la prochaine partie.',
  notInWordList: "Ce mot n'est pas dans la liste",
  win: 'Vous avez trouvé !',
  lose: 'Ce sera pour la prochaine fois',
  winSubtitle: (used, max) => `Les 8 grilles résolues en ${used}/${max} essais.`,
  loseSubtitle: 'Plus d’essais. Voici les réponses :',
  solutionsHeading: 'Solutions',
  close: 'Fermer',
  playAgain: 'Rejouer',
  boardSolvedBadge: (n) => `Résolu à l'essai ${n}`,
}

const registry: Record<Language, Strings> = { en, fr }

export function getStrings(lang: Language): Strings {
  return registry[lang]
}

export function dictionaryUrl(lang: Language, normalizedWord: string, displayWord: string): string {
  if (lang === 'en') {
    return `https://www.merriam-webster.com/dictionary/${encodeURIComponent(normalizedWord.toLowerCase())}`
  }
  return `https://fr.wiktionary.org/wiki/${encodeURIComponent(displayWord.toLowerCase())}`
}
