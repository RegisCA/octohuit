import type { Language, LanguageData } from './types'
import { en } from './en'
import { fr } from './fr'

const registry: Record<Language, LanguageData> = { en, fr }

export function getLanguageData(lang: Language): LanguageData {
  return registry[lang]
}

export * from './types'
