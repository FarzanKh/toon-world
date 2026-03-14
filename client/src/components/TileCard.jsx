import { useState } from 'react'

/**
 * TileCard — one selectable emoji tile in the subject or character picker.
 *
 * Props:
 *   item       { label, emoji, accent, bg }
 *   selected   boolean
 *   onClick    () => void
 *   index      number  (for staggered animation delay)
 */
export default function TileCard({ item, selected, onClick, index = 0 }) {
  const [hovered, setHovered] = useState(false)

  const lines = item.label.split('\n')

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        '--accent':    item.accent,
        '--bg':        item.bg,
        animationDelay: `${index * 0.04}s`,
      }}
      className={`tile-card ${selected ? 'tile-card--selected' : ''} ${hovered ? 'tile-card--hovered' : ''}`}
      aria-pressed={selected}
    >
      <div className="tile-card__emoji-wrap">
        <span className="tile-card__emoji" role="img" aria-label={item.label}>
          {item.emoji}
        </span>
        {selected && <span className="tile-card__tick" aria-hidden="true">✓</span>}
      </div>
      <div className="tile-card__label">
        {lines.map((line, i) => (
          <span key={i}>
            {line}
            {i < lines.length - 1 && <br />}
          </span>
        ))}
      </div>
    </button>
  )
}
