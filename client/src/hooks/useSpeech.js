import { useState, useCallback, useRef, useEffect } from 'react'
import { speak, stopSpeech, isSpeechSupported } from '../api/tts'

/**
 * useSpeech — manages browser TTS state for the lesson page.
 *
 * Returns:
 *   speakParagraph(id, text)  — play / toggle a paragraph
 *   activeParagraphId         — which paragraph is currently playing (or null)
 *   isSupported               — whether Web Speech API is available
 */
export default function useSpeech() {
  const [activeParagraphId, setActiveParagraphId] = useState(null)
  const handleRef = useRef(null)
  const isSupported = isSpeechSupported()

  useEffect(() => {
    return () => { stopSpeech(); handleRef.current = null }
  }, [])

  const speakParagraph = useCallback((id, text) => {
    // Same paragraph clicked again → stop
    if (activeParagraphId === id) {
      stopSpeech()
      handleRef.current = null
      setActiveParagraphId(null)
      return
    }

    stopSpeech()
    handleRef.current = null
    setActiveParagraphId(id)

    handleRef.current = speak(text, {
      onEnd: () => {
        setActiveParagraphId(prev => (prev === id ? null : prev))
        handleRef.current = null
      },
    })
  }, [activeParagraphId])

  return { speakParagraph, activeParagraphId, isSupported }
}
