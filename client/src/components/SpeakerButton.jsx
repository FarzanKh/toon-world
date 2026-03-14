/**
 * SpeakerButton — small animated icon that triggers TTS for one paragraph.
 *
 * Props:
 *   onClick    () => void
 *   isPlaying  boolean   — true while this paragraph is being spoken
 *   disabled   boolean
 */
export default function SpeakerButton({ onClick, isPlaying, disabled }) {
  return (
    <button
      className={`speaker-btn ${isPlaying ? 'speaker-btn--playing' : ''}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={isPlaying ? 'Stop reading' : 'Read aloud'}
      title={isPlaying ? 'Stop' : 'Read aloud'}
    >
      {isPlaying ? (
        // Animated bars while speaking
        <span className="speaker-btn__bars" aria-hidden="true">
          <span /><span /><span />
        </span>
      ) : (
        // Speaker icon at rest
        <svg
          className="speaker-btn__icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
        </svg>
      )}
    </button>
  )
}
