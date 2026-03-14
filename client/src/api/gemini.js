/**
 * api/gemini.js
 *
 * All Gemini API communication.
 *
 * Public surface:
 *   streamLesson(subject, character, visualDescription, onBlock)
 *     → streams LessonBlocks one by one as Gemini generates them
 *     → onBlock(block) is called each time a complete block is ready
 *     → returns Promise<void>
 *
 *   generateLesson(subject, character, visualDescription)
 *     → legacy non-streaming fallback, returns Promise<LessonBlock[]>
 *
 * LessonBlock types:
 *   { type: 'text',  id: string, text: string }
 *   { type: 'image', src: string, alt: string, index: number }
 */

const STREAM_URL = '/api/stream'
const BATCH_URL  = '/api/generate'
const MODEL      = 'gemini-2.5-flash-image' // reference only — set in server.js

// ─── Prompt ──────────────────────────────────────────────────────────────────

function buildLessonPrompt(character, subject, visualDescription) {
  const imgStyle    = 'vibrant Pixar 3D CGI illustration, warm studio lighting, colourful, child-friendly'
  const teacherLooks = visualDescription
    ? visualDescription
    : 'a friendly cheerful cartoon teacher with a warm smile'

  return `Create a short educational lesson for children aged 4–8 about: "${subject}"

The lesson has a narrator called "${character}" who speaks in TEXT sections.
The lesson also has illustrated scenes in IMAGE sections.

TEXT sections and IMAGE sections have completely separate rules — read carefully:

━━━ TEXT SECTION RULES ━━━
• Written from the perspective of ${character}, speaking warmly and directly to the child.
• Simple short sentences. Fun and encouraging tone.
• May freely use the narrator's name.

━━━ IMAGE SECTION RULES ━━━
• Generate an illustration described ONLY in visual terms — shapes, colours, actions, setting.
• Style: ${imgStyle}.
• The main character in every image looks like this: ${teacherLooks}.
• CRITICAL: Image descriptions must contain ZERO character names, ZERO brand names, ZERO franchise references, ZERO IP references of any kind. Describe only what is physically visible.

━━━ LESSON STRUCTURE ━━━
Produce exactly these 7 blocks in order:

[TEXT 1] ${character} gives a warm, fun 2-sentence introduction to the topic.

[IMAGE 1] ${imgStyle}. A cheerful classroom scene. The main character (${teacherLooks}) waves hello. Visual elements related to "${subject}" fill the background.

[TEXT 2] ${character} explains the first key idea in 2–3 simple sentences, using a concrete example from everyday life.

[IMAGE 2] ${imgStyle}. The main character (${teacherLooks}) actively demonstrates the first key idea from [TEXT 2]. Same cheerful setting.

[TEXT 3] ${character} explains a second key idea in 2–3 sentences, building on the first.

[IMAGE 3] ${imgStyle}. The main character (${teacherLooks}) demonstrates the second idea from [TEXT 3].

[TEXT 4] ${character} gives a warm encouraging closing message in 2 sentences, ending with one simple question to check understanding.`
}

// ─── Request body builder ─────────────────────────────────────────────────────

function buildRequestBody(character, subject, visualDescription) {
  return JSON.stringify({
    contents: [{ parts: [{ text: buildLessonPrompt(character, subject, visualDescription) }] }],
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE'], // required for interleaved output
    },
  })
}

// ─── Part → LessonBlock converter ────────────────────────────────────────────

function partToBlock(part, textIndex, imageIndex, character, subject) {
  if (part.text?.trim()) {
    return { type: 'text', id: `text-${textIndex}`, text: part.text.trim() }
  }
  if (part.inlineData?.mimeType?.startsWith('image/')) {
    return {
      type:  'image',
      src:   `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
      alt:   `${character} teaching ${subject} — scene ${imageIndex}`,
      index: imageIndex,
    }
  }
  return null
}

// ─── Streaming API (primary) ──────────────────────────────────────────────────

/**
 * Stream an interleaved lesson from Gemini, calling onBlock for each
 * complete TEXT or IMAGE block as it arrives — so the UI can render
 * blocks one by one as they are generated rather than waiting for all.
 *
 * Vertex AI's streamGenerateContent returns Server-Sent Events.
 * Each SSE event is a partial GenerateContentResponse JSON object.
 * Parts accumulate across events — we emit a block only when a new
 * part type starts (text→image or image→text transition) or when
 * the stream ends, ensuring each block is complete before rendering.
 *
 * @param {string}   subject
 * @param {string}   character
 * @param {string}   visualDescription
 * @param {function} onBlock  called with each LessonBlock as it completes
 */
export async function streamLesson(subject, character, visualDescription, onBlock) {
  const response = await fetch(STREAM_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    buildRequestBody(character, subject, visualDescription),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    let message = `Stream request failed (HTTP ${response.status})`
    try { message = JSON.parse(text)?.error?.message || message } catch {}
    throw new Error(message)
  }

  const reader  = response.body.getReader()
  const decoder = new TextDecoder()
  let   buffer  = ''

  let textIndex  = 0
  let imageIndex = 0

  // Accumulate the current in-progress part across SSE chunks
  // Parts can span multiple SSE events (especially large base64 images)
  let pendingText      = ''
  let pendingImageMime = null
  let pendingImageData = ''

  function flushText() {
    if (!pendingText.trim()) return
    textIndex++
    onBlock({ type: 'text', id: `text-${textIndex}`, text: pendingText.trim() })
    pendingText = ''
  }

  function flushImage() {
    if (!pendingImageData) return
    imageIndex++
    onBlock({
      type:  'image',
      src:   `data:${pendingImageMime};base64,${pendingImageData}`,
      alt:   `${character} teaching ${subject} — scene ${imageIndex}`,
      index: imageIndex,
    })
    pendingImageMime = null
    pendingImageData = ''
  }

  function processPart(part) {
    if (part.text != null) {
      // If we were accumulating an image, flush it before starting text
      flushImage()
      pendingText += part.text
    } else if (part.inlineData?.mimeType?.startsWith('image/')) {
      // If we were accumulating text, flush it before starting image
      flushText()
      if (pendingImageMime && pendingImageMime !== part.inlineData.mimeType) {
        // Different image — flush the previous one first
        flushImage()
      }
      pendingImageMime  = part.inlineData.mimeType
      pendingImageData += part.inlineData.data
    }
  }

  // Read SSE stream
  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })

    // Process all complete SSE lines in buffer
    const lines = buffer.split('\n')
    buffer = lines.pop() // keep incomplete last line

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed === 'data: [DONE]') continue
      if (!trimmed.startsWith('data:')) continue

      const jsonStr = trimmed.slice(5).trim()
      if (!jsonStr) continue

      let chunk
      try { chunk = JSON.parse(jsonStr) }
      catch { continue } // skip malformed chunks

      if (chunk.error) {
        throw new Error(chunk.error.message || 'Stream error from Vertex AI')
      }

      const parts = chunk?.candidates?.[0]?.content?.parts ?? []
      for (const part of parts) {
        processPart(part)
      }

      // After each chunk, if we have complete text (followed by more content),
      // emit it immediately so words appear as soon as a paragraph is done
      // Note: we only flush text eagerly — images flush when complete
      const finishReason = chunk?.candidates?.[0]?.finishReason
      if (finishReason && finishReason !== 'STOP') {
        throw new Error(`Generation stopped — finishReason: ${finishReason}`)
      }
    }
  }

  // Flush any remaining buffered content at end of stream
  flushText()
  flushImage()
}

// ─── Non-streaming fallback ───────────────────────────────────────────────────

export async function generateLesson(subject, character, visualDescription) {
  const response = await fetch(BATCH_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    buildRequestBody(character, subject, visualDescription),
  })

  const rawText = await response.text()
  if (!rawText?.trim()) {
    throw new Error(`Server returned an empty response (HTTP ${response.status}). Please try again.`)
  }

  let data
  try { data = JSON.parse(rawText) }
  catch {
    console.error('[Gemini] Failed to parse response. Raw:', rawText.slice(0, 400))
    throw new Error('The server returned an invalid response. Please try again.')
  }

  if (!response.ok) throw new Error(data?.error?.message || `API error (HTTP ${response.status})`)

  const parts = data?.candidates?.[0]?.content?.parts ?? []
  if (parts.length === 0) {
    const reason = data?.candidates?.[0]?.finishReason
    const safety = data?.promptFeedback?.blockReason
    throw new Error(
      safety ? `Request blocked: ${safety}`
      : reason ? `Generation stopped — finishReason: ${reason}`
      : 'The model returned no content. Please try again.'
    )
  }

  let textIndex = 0, imageIndex = 0
  return parts.reduce((blocks, part) => {
    const block = partToBlock(part, ++textIndex, ++imageIndex, character, subject)
    if (block) blocks.push(block)
    return blocks
  }, [])
}
