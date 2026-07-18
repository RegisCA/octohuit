import type { CSSProperties } from 'react'
import type { TileState } from '../game/engine'

interface TileProps {
  letter: string
  state: TileState | 'filled' | 'empty'
  columnIndex: number
  revealed: boolean
}

export function Tile({ letter, state, columnIndex, revealed }: TileProps) {
  const classes = ['tile', `tile--${state}`]
  if (revealed) classes.push('tile--revealed')
  if (state === 'filled') classes.push('tile--pop')

  return (
    <div className={classes.join(' ')} style={{ '--col': columnIndex } as CSSProperties}>
      <span className="tile__inner">{letter}</span>
    </div>
  )
}
