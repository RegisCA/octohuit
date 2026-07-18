import type { KeyState } from '../game/engine'
import { isLetterDeadEverywhere } from '../game/engine'

interface KeyProps {
  label: string
  displayLabel: string
  states?: KeyState[]
  wide?: boolean
  onPress: (key: string) => void
}

export function Key({ label, displayLabel, states, wide, onPress }: KeyProps) {
  const dead = states ? isLetterDeadEverywhere(states) : false
  const classes = ['key']
  if (wide) classes.push('key--wide')
  if (dead) classes.push('key--dead')

  return (
    <button type="button" className={classes.join(' ')} onClick={() => onPress(label)} aria-label={label}>
      {states && !wide && (
        <span className="key__mosaic" aria-hidden="true">
          {states.map((s, i) => (
            <span key={i} className={`key__cell key__cell--${s}`} />
          ))}
        </span>
      )}
      <span className="key__label">{displayLabel}</span>
    </button>
  )
}
