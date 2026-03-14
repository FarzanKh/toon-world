/**
 * api/elevenlabs.js
 *
 * All ElevenLabs API communication.
 *
 * Voice Design is a two-step process:
 *   Step 1 — POST /v1/text-to-voice/design
 *            → returns previews, each with a generated_voice_id
 *   Step 2 — POST /v1/text-to-voice/create
 *            → saves the chosen preview to the voice library
 *            → returns a permanent voice_id usable with TTS
 *
 * We run this once per character per session, cache the voice_id, and
 * reuse it for every TTS call after that.
 *
 * Public surface:
 *   speakAsCharacter(text, character, voicePersonality, apiKey, callbacks)
 *   → Promise<{ cancel: () => void }>
 */

const BASE_URL        = 'https://api.elevenlabs.io/v1'
const DESIGN_MODEL    = 'eleven_ttv_v3'          // latest Voice Design model
const TTS_MODEL       = 'eleven_turbo_v2_5'       // fast, high quality TTS
const VOICE_CACHE_KEY = 'toonworld_el_voices'     // sessionStorage key

// ─── Voice cache ──────────────────────────────────────────────────────────────

function readVoiceCache() {
  try { return JSON.parse(sessionStorage.getItem(VOICE_CACHE_KEY) || '{}') }
  catch { return {} }
}

function getCachedVoiceId(character) {
  return readVoiceCache()[character] ?? null
}

function setCachedVoiceId(character, voiceId) {
  try {
    const cache = readVoiceCache()
    cache[character] = voiceId
    sessionStorage.setItem(VOICE_CACHE_KEY, JSON.stringify(cache))
  } catch { /* ignore storage quota errors */ }
}

// ─── Step 1: generate design previews ────────────────────────────────────────

async function createDesignPreviews(voicePersonality, apiKey) {
  const res = await fetch(`${BASE_URL}/text-to-voice/design`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'xi-api-key': apiKey },
    body: JSON.stringify({
      voice_description:    voicePersonality,
      auto_generate_text:   true,   // let ElevenLabs pick a suitable sample text
      model_id:             DESIGN_MODEL,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.detail?.message || `Voice Design preview failed (HTTP ${res.status})`)
  }

  const data = await res.json()
  // Returns { previews: [{ generated_voice_id, ... }, ...] }
  const previews = data?.previews ?? []
  if (previews.length === 0) throw new Error('ElevenLabs returned no voice previews.')

  return previews   // we'll pick the first one
}

// ─── Step 2: save preview to voice library → get permanent voice_id ──────────

async function saveVoiceToLibrary(generatedVoiceId, characterName, apiKey) {
  const res = await fetch(`${BASE_URL}/text-to-voice/create`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'xi-api-key': apiKey },
    body: JSON.stringify({
      voice_name:         `ToonWorld — ${characterName}`,
      generated_voice_id: generatedVoiceId,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.detail?.message || `Voice save failed (HTTP ${res.status})`)
  }

  const data = await res.json()
  const voiceId = data?.voice_id
  if (!voiceId) throw new Error('ElevenLabs did not return a voice_id after saving.')

  return voiceId
}

// ─── Get or create voice (with cache) ────────────────────────────────────────

async function getOrCreateVoice(character, voicePersonality, apiKey) {
  const cached = getCachedVoiceId(character)
  if (cached) {
    console.log(`[ElevenLabs] Reusing cached voice for "${character}": ${cached}`)
    return cached
  }

  console.log(`[ElevenLabs] Designing voice for "${character}"…`)

  // Step 1 — generate previews
  const previews = await createDesignPreviews(voicePersonality, apiKey)

  // Pick the first preview (could be made interactive in future)
  const chosen = previews[0]
  console.log(`[ElevenLabs] Got ${previews.length} preview(s), saving first one…`)

  // Step 2 — save to library to get a permanent voice_id
  const voiceId = await saveVoiceToLibrary(chosen.generated_voice_id, character, apiKey)
  console.log(`[ElevenLabs] Voice saved for "${character}": ${voiceId}`)

  setCachedVoiceId(character, voiceId)
  return voiceId
}

// ─── TTS ──────────────────────────────────────────────────────────────────────

async function textToSpeech(text, voiceId, apiKey) {
  const res = await fetch(`${BASE_URL}/text-to-speech/${voiceId}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'xi-api-key': apiKey },
    body: JSON.stringify({
      text,
      model_id: TTS_MODEL,
      voice_settings: {
        stability:         0.45,
        similarity_boost:  0.82,
        style:             0.35,
        use_speaker_boost: true,
      },
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.detail?.message || `TTS failed (HTTP ${res.status})`)
  }

  const blob = await res.blob()
  const url  = URL.createObjectURL(blob)
  return { audio: new Audio(url), url }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Design (once) and speak text as a character.
 *
 * @param {string}   text
 * @param {string}   character
 * @param {string}   voicePersonality
 * @param {string}   apiKey
 * @param {object}   callbacks
 *   onVoiceDesignStart / onVoiceDesignEnd / onEnd / onError
 * @returns {Promise<{ cancel: () => void }>}
 */
export async function speakAsCharacter(
  text, character, voicePersonality, apiKey,
  { onVoiceDesignStart, onVoiceDesignEnd, onEnd, onError } = {}
) {
  let audioObj  = null
  let objectUrl = null

  try {
    if (!apiKey) throw new Error('No ElevenLabs API key provided.')

    // Voice design (skipped if cached)
    const isFirstTime = !getCachedVoiceId(character)
    if (isFirstTime) onVoiceDesignStart?.()
    const voiceId = await getOrCreateVoice(character, voicePersonality, apiKey)
    if (isFirstTime) onVoiceDesignEnd?.()

    // TTS
    const { audio, url } = await textToSpeech(text, voiceId, apiKey)
    audioObj  = audio
    objectUrl = url

    audio.onended = () => { URL.revokeObjectURL(url); onEnd?.() }
    audio.onerror = () => { URL.revokeObjectURL(url); onError?.(new Error('Playback failed')); onEnd?.() }
    await audio.play()

  } catch (err) {
    console.error('[ElevenLabs]', err)
    if (objectUrl) URL.revokeObjectURL(objectUrl)
    onError?.(err)
    onEnd?.()
  }

  return {
    cancel: () => {
      if (audioObj) { audioObj.pause(); audioObj.currentTime = 0 }
      if (objectUrl) URL.revokeObjectURL(objectUrl)
      onEnd?.()
    },
  }
}

export function clearVoiceCache() {
  sessionStorage.removeItem(VOICE_CACHE_KEY)
}
