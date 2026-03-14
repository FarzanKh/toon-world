import { useState } from 'react'

/**
 * ApiKeyBanner — single input for the Gemini API key.
 *
 * Props:
 *   onKeySaved   (key: string) => void
 *   hasSavedKey  boolean
 */
export default function ApiKeyBanner({ onKeySaved, hasSavedKey }) {
  const [input,  setInput]  = useState('')
  const [status, setStatus] = useState(hasSavedKey ? 'saved' : 'empty')

  function handleSave() {
    const v = input.trim()
    if (!v) { setStatus('error'); return }
    onKeySaved(v)
    setInput('')
    setStatus('saved')
  }

  return (
    <div className="api-banner">
      <span className="api-banner__label">🔮 Gemini Key</span>
      <input
        className="api-banner__input"
        type="password"
        value={input}
        onChange={e => { setInput(e.target.value); setStatus('empty') }}
        onKeyDown={e => e.key === 'Enter' && handleSave()}
        placeholder="Paste your key from aistudio.google.com"
        autoComplete="off"
      />
      <button className="api-banner__btn" onClick={handleSave}>Save</button>
      <span className={`api-banner__status api-banner__status--${status}`}>
        {status === 'saved' && '✓ Key saved'}
        {status === 'error' && '⚠ Required'}
      </span>
    </div>
  )
}
