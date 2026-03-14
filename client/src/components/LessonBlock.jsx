import SpeakerButton from './SpeakerButton'

/**
 * LessonBlock — renders one interleaved block returned by Gemini.
 *
 * Props:
 *   block            LessonBlock  { type: 'text', text } | { type: 'image', src, alt, index }
 *   onSpeak          (paragraphId, text) => void   — called when speaker button clicked
 *   activeParagraphId string | null                — ID of currently speaking paragraph
 *   speechSupported  boolean
 */
export default function LessonBlock({ block, onSpeak, activeParagraphId, speechSupported }) {
  if (block.type === 'text') {
    const paragraphs = block.text.split(/\n\n+/).filter(Boolean)

    return (
      <div className="lesson-block lesson-block--text">
        {paragraphs.map((p, i) => {
          const paragraphId = `${block.id ?? 'block'}-p${i}`
          const isPlaying   = activeParagraphId === paragraphId

          return (
            <div key={i} className="lesson-block__paragraph">
              <p>
                {p.split('\n').map((line, j, arr) => (
                  <span key={j}>
                    {line}
                    {j < arr.length - 1 && <br />}
                  </span>
                ))}
              </p>
              {speechSupported && onSpeak && (
                <SpeakerButton
                  isPlaying={isPlaying}
                  onClick={() => onSpeak(paragraphId, p)}
                />
              )}
            </div>
          )
        })}
      </div>
    )
  }

  if (block.type === 'image') {
    return (
      <div className="lesson-block lesson-block--image">
        <img src={block.src} alt={block.alt} className="lesson-block__img" />
        <span className="lesson-block__caption">Scene {block.index}</span>
      </div>
    )
  }

  return null
}
