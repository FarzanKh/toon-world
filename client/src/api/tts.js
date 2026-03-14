/**
 * api/tts.js
 *
 * Text-to-speech using the browser's built-in Web Speech API.
 * No API key required. Works in all modern browsers.
 *
 * Public surface:
 *   speak(text, options?)  → { cancel: () => void }
 *   stopSpeech()           → void
 *   isSpeechSupported()    → boolean
 */

// Preferred voices tried in order — first match wins
const PREFERRED_VOICES = [
  'Samantha',            // macOS / iOS — warm, natural
  'Google US English',
  'Microsoft Aria Online (Natural)',
  'Karen',
  'Moira',
]

function getBestVoice() {
  const voices = window.speechSynthesis.getVoices()
  for (const name of PREFERRED_VOICES) {
    const match = voices.find(v => v.name.includes(name))
    if (match) return match
  }
  return voices.find(v => v.lang.startsWith('en')) ?? voices[0] ?? null
}

/**
 * Speak text aloud.
 *
 * @param {string} text
 * @param {object} options
 *   @param {function} [options.onEnd]    called when speech finishes or is stopped
 *   @param {number}   [options.rate]     speed, 0.5–2.0  (default 0.9)
 *   @param {number}   [options.pitch]    pitch, 0–2.0    (default 1.05)
 * @returns {{ cancel: () => void }}
 */
export function speak(text, { onEnd, rate = 0.9, pitch = 1.05 } = {}) {
  window.speechSynthesis.cancel()

  const utterance   = new SpeechSynthesisUtterance(text)
  utterance.rate    = rate
  utterance.pitch   = pitch
  utterance.onend   = () => onEnd?.()
  utterance.onerror = () => onEnd?.()

  const assign = () => {
    const v = getBestVoice()
    if (v) utterance.voice = v
  }

  if (window.speechSynthesis.getVoices().length > 0) {
    assign()
  } else {
    window.speechSynthesis.addEventListener('voiceschanged', assign, { once: true })
  }

  window.speechSynthesis.speak(utterance)
  return { cancel: () => window.speechSynthesis.cancel() }
}

/** Stop any currently playing speech. */
export function stopSpeech() {
  window.speechSynthesis.cancel()
}

/** Returns true if the browser supports Web Speech API. */
export function isSpeechSupported() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}
