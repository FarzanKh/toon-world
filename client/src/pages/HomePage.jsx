import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Background from '../components/Background'
import TilePicker from '../components/TilePicker'
import subjects from '../data/subjects'
import characters from '../data/characters'
import { toSlug } from '../utils/slug'

/**
 * HomePage — "I want to learn ___ with ___!" selection flow.
 */
export default function HomePage() {
  const navigate = useNavigate()

  const [selectedSubject,   setSelectedSubject]   = useState(null)
  const [selectedCharacter, setSelectedCharacter] = useState(null)
  const [activePicker,      setActivePicker]      = useState(null) // 'subject' | 'character' | null

  const pickerRef = useRef(null)

  // Close picker on outside click
  useEffect(() => {
    function handleClick(e) {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setActivePicker(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function togglePicker(type) {
    setActivePicker(prev => (prev === type ? null : type))
  }

  function handleSubjectSelect(item) {
    setSelectedSubject(item)
    // Auto-advance to character picker after brief pause
    setTimeout(() => setActivePicker('character'), 200)
  }

  function handleCharacterSelect(item) {
    setSelectedCharacter(item)
    setActivePicker(null)
  }

  function handleGo() {
    if (!selectedSubject || !selectedCharacter) return
    navigate(`/lesson/${toSlug(selectedSubject.value)}/${toSlug(selectedCharacter.value)}`)
  }

  const canGo = selectedSubject && selectedCharacter

  return (
    <div className="home-page">
      <Background />


      <main className="home-page__main">
        <p className="home-page__tagline">✨ Welcome to Toon World 3D</p>

        {/* ── Sentence builder ── */}
        <div className="sentence" ref={pickerRef}>
          <span className="sentence__word">I want to learn</span>

          {/* Subject slot */}
          <button
            className={`sentence__slot sentence__slot--subject ${selectedSubject ? 'sentence__slot--filled' : ''} ${activePicker === 'subject' ? 'sentence__slot--open' : ''}`}
            onClick={() => togglePicker('subject')}
          >
            <span>{selectedSubject ? selectedSubject.label.replace('\n', ' ') : '______'}</span>
            <span className="sentence__slot-arrow">▼</span>
          </button>

          <span className="sentence__word">, with</span>

          {/* Character slot */}
          <button
            className={`sentence__slot sentence__slot--character ${!selectedSubject ? 'sentence__slot--disabled' : ''} ${selectedCharacter ? 'sentence__slot--filled' : ''} ${activePicker === 'character' ? 'sentence__slot--open' : ''}`}
            onClick={() => selectedSubject && togglePicker('character')}
            disabled={!selectedSubject}
          >
            <span>{selectedCharacter ? selectedCharacter.label : '______'}</span>
            <span className="sentence__slot-arrow">▼</span>
          </button>

          <span className="sentence__word">!</span>

          {/* Pickers sit below the sentence */}
          <div className="sentence__pickers">
            <TilePicker
              items={subjects}
              selectedValue={selectedSubject?.value ?? null}
              onSelect={handleSubjectSelect}
              isOpen={activePicker === 'subject'}
            />
            <TilePicker
              items={characters}
              selectedValue={selectedCharacter?.value ?? null}
              onSelect={handleCharacterSelect}
              isOpen={activePicker === 'character'}
            />
          </div>
        </div>
      </main>

      {/* ── Fixed bottom CTA ── */}
      <div className={`go-footer ${canGo ? 'go-footer--visible' : ''}`}>
        <button className="go-btn" onClick={handleGo} disabled={!canGo}>
          ✨ Let's Go!
        </button>
        <p className="go-footer__hint">Your adventure is one click away</p>
      </div>
    </div>
  )
}
