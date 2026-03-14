import TileCard from './TileCard'

/**
 * TilePicker — animated horizontal scrollable row of TileCards.
 *
 * Props:
 *   items         Item[]
 *   selectedValue string | null
 *   onSelect      (item) => void
 *   isOpen        boolean
 */
export default function TilePicker({ items, selectedValue, onSelect, isOpen }) {
  return (
    <div className={`tile-picker ${isOpen ? 'tile-picker--open' : ''}`} aria-hidden={!isOpen}>
      <div className="tile-picker__row">
        {items.map((item, index) => (
          <TileCard
            key={item.value}
            item={item}
            selected={selectedValue === item.value}
            onClick={() => onSelect(item)}
            index={index}
          />
        ))}
      </div>
    </div>
  )
}
