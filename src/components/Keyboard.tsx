import type { Language } from '../data/types'
import type { KeyState } from '../game/engine'
import { KEYBOARD_ROWS } from '../i18n/keyboardLayout'
import { Key } from './Key'

interface KeyboardProps {
  language: Language
  keyboardState: Record<string, KeyState[]>
  onLetter: (letter: string) => void
  onEnter: () => void
  onBackspace: () => void
}

export function Keyboard({ language, keyboardState, onLetter, onEnter, onBackspace }: KeyboardProps) {
  const rows = KEYBOARD_ROWS[language]

  function handlePress(key: string) {
    if (key === 'ENTER') onEnter()
    else if (key === 'BACKSPACE') onBackspace()
    else onLetter(key)
  }

  return (
    <div className="keyboard">
      {rows.map((row, i) => (
        <div className="keyboard__row" key={i}>
          {row.map((key) => {
            if (key === 'ENTER') {
              return <Key key={key} label="ENTER" displayLabel="⏎" wide onPress={handlePress} />
            }
            if (key === 'BACKSPACE') {
              return <Key key={key} label="BACKSPACE" displayLabel="⌫" wide onPress={handlePress} />
            }
            return <Key key={key} label={key} displayLabel={key} states={keyboardState[key]} onPress={handlePress} />
          })}
        </div>
      ))}
    </div>
  )
}
