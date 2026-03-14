import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import Background from '../components/Background'
import LessonBlock from '../components/LessonBlock'
import { streamLesson } from '../api/gemini'
import { fromSlug, toTitleCase } from '../utils/slug'
import useSpeech from '../hooks/useSpeech'
import characters from '../data/characters'

/**
 * LessonPage — streams an interleaved Gemini lesson block by block.
 * Each TEXT or IMAGE block appears on screen as soon as it is generated,
 * creating a live storybook effect rather than a bulk reveal.
 *
 * URL: /lesson/:subjectSlug/:characterSlug
 */
export default function LessonPage() {
  const { subjectSlug, characterSlug } = useParams()

  const subject   = fromSlug(subjectSlug)
  const character = toTitleCase(fromSlug(characterSlug))

  const characterData    = characters.find(c => c.value.toLowerCase() === character.toLowerCase())
  const visualDescription = characterData?.visualDescription ?? null

  const [blocks,  setBlocks]  = useState([])
  const [status,  setStatus]  = useState('idle') // 'idle'|'loading'|'streaming'|'done'|'error'
  const [error,   setError]   = useState(null)

  const feedRef      = useRef(null)
  const abortRef     = useRef(false) // lets us cancel a streaming run on unmount

  const { speakParagraph, activeParagraphId, isSupported: speechSupported } = useSpeech()

  useEffect(() => {
    document.title = `${character} teaches ${toTitleCase(subject)} · Toon World`
  }, [character, subject])

  useEffect(() => {
    runLesson()
    return () => { abortRef.current = true }
  }, [subjectSlug, characterSlug])

  // Scroll feed to bottom whenever a new block is appended
  useEffect(() => {
    if (feedRef.current && blocks.length > 0) {
      const last = feedRef.current.lastElementChild
      last?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [blocks.length])

  async function runLesson() {
    abortRef.current = false
    setBlocks([])
    setError(null)
    setStatus('loading')

    try {
      let firstBlock = true

      await streamLesson(subject, character, visualDescription, (block) => {
        if (abortRef.current) return

        // Switch from 'loading' to 'streaming' on first block received
        if (firstBlock) {
          firstBlock = false
          setStatus('streaming')
        }

        // Append block to the feed — renders immediately
        setBlocks(prev => [...prev, block])
      })

      if (!abortRef.current) setStatus('done')

    } catch (err) {
      if (abortRef.current) return
      console.error('[LessonPage]', err)
      setError(err.message)
      setStatus('error')
    }
  }

  const blockCount = blocks.length
  const isActive   = status === 'loading' || status === 'streaming'

  return (
    <div className="lesson-page">
      <Background />

      {/* ── Nav ── */}
      <nav className="lesson-nav">
        <Link to="/" className="lesson-nav__back">← Back</Link>
        <div className="lesson-nav__breadcrumb">
          <span>Home</span>
          <span className="lesson-nav__sep">/</span>
          <span>{toTitleCase(subject)}</span>
          <span className="lesson-nav__sep">/</span>
          <span>{character}</span>
        </div>
      </nav>

      {/* ── Header ── */}
      <header className="lesson-header">
        <h1 className="lesson-header__title">
          <span className="lesson-header__character">{character}</span>
          {' '}teaches you{' '}
          <span className="lesson-header__subject">{toTitleCase(subject)}</span>
        </h1>
        <p className="lesson-header__subtitle">
          {status === 'loading'   && `${character} is getting ready…`}
          {status === 'streaming' && `${character} is telling the story…`}
          {status === 'done'      && `A lesson by ${character}`}
          {status === 'error'     && 'Something went wrong'}
        </p>
      </header>

      {/* ── Loading banner — shown only before first block arrives ── */}
      {status === 'loading' && (
        <div className="loading-banner">
          <div className="loading-banner__spinner" />
          <span className="loading-banner__text">{character} is getting ready…</span>
        </div>
      )}

      {/* ── Streaming indicator — shown while blocks are arriving ── */}
      {status === 'streaming' && (
        <div className="loading-banner loading-banner--streaming">
          <div className="loading-banner__spinner" />
          <span className="loading-banner__text">
            {blockCount % 2 === 0 ? 'Painting the next scene…' : 'Writing the next part…'}
          </span>
        </div>
      )}

      {/* ── Story feed — blocks appear here one by one ── */}
      <div className="story-feed" ref={feedRef}>
        {blocks.map((block, i) => (
          <LessonBlock
            key={block.id ?? `block-${i}`}
            block={block}
            onSpeak={speakParagraph}
            activeParagraphId={activeParagraphId}
            speechSupported={speechSupported}
          />
        ))}

        {status === 'error' && (
          <div className="lesson-error">
            <span className="lesson-error__icon">⚠️</span>
            <p className="lesson-error__msg">{error}</p>
            <button className="lesson-error__retry" onClick={runLesson}>
              ↺ Try Again
            </button>
          </div>
        )}
      </div>

      {/* ── Regen bar ── */}
      {status === 'done' && (
        <div className="regen-bar">
          <button className="regen-bar__btn" onClick={runLesson}>
            ↺ Generate a new lesson
          </button>
        </div>
      )}
    </div>
  )
}
