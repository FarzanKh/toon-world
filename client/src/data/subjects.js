/**
 * All available lesson subjects.
 * Each entry has:
 *   value   – the full text passed to the Gemini prompt
 *   label   – short display name (newline = line break in tile)
 *   emoji   – tile icon
 *   accent  – tile border / glow colour
 *   bg      – tile emoji background fill
 */
const subjects = [
  { value: 'counting from 1 to 10',       label: 'Counting\n1–10',        emoji: '🔢', accent: '#f97316', bg: 'rgba(249,115,22,.15)' },
  { value: 'counting from 1 to 100',      label: 'Counting\n1–100',       emoji: '💯', accent: '#f97316', bg: 'rgba(249,115,22,.15)' },
  { value: 'basic addition',              label: 'Addition',              emoji: '➕', accent: '#fb923c', bg: 'rgba(251,146,60,.15)' },
  { value: 'basic subtraction',           label: 'Subtraction',           emoji: '➖', accent: '#fb923c', bg: 'rgba(251,146,60,.15)' },
  { value: 'shapes and geometry',         label: 'Shapes &\nGeometry',    emoji: '🔷', accent: '#60a5fa', bg: 'rgba(96,165,250,.15)'  },
  { value: 'telling time on a clock',     label: 'Telling\nTime',         emoji: '🕐', accent: '#60a5fa', bg: 'rgba(96,165,250,.15)'  },
  { value: 'the English alphabet',        label: 'The\nAlphabet',         emoji: '🔤', accent: '#a78bfa', bg: 'rgba(167,139,250,.15)' },
  { value: 'vowels and consonants',       label: 'Vowels &\nConsonants',  emoji: '🅰️', accent: '#a78bfa', bg: 'rgba(167,139,250,.15)' },
  { value: 'simple three-letter words',   label: 'Simple\nWords',         emoji: '📖', accent: '#c084fc', bg: 'rgba(192,132,252,.15)' },
  { value: 'rhyming words',              label: 'Rhyming\nWords',        emoji: '🎵', accent: '#c084fc', bg: 'rgba(192,132,252,.15)' },
  { value: 'the seven continents',        label: 'The 7\nContinents',     emoji: '🌍', accent: '#4ade80', bg: 'rgba(74,222,128,.15)'  },
  { value: 'animals and their habitats',  label: 'Animals &\nHabitats',   emoji: '🦁', accent: '#4ade80', bg: 'rgba(74,222,128,.15)'  },
  { value: 'weather and seasons',         label: 'Weather &\nSeasons',    emoji: '🌦️', accent: '#34d399', bg: 'rgba(52,211,153,.15)'  },
  { value: 'plants and how they grow',    label: 'Plants &\nGrowth',      emoji: '🌱', accent: '#34d399', bg: 'rgba(52,211,153,.15)'  },
  { value: 'the solar system and planets',label: 'Solar\nSystem',         emoji: '🪐', accent: '#38bdf8', bg: 'rgba(56,189,248,.15)'  },
  { value: 'colors and color mixing',     label: 'Colors &\nMixing',      emoji: '🎨', accent: '#f472b6', bg: 'rgba(244,114,182,.15)' },
  { value: 'musical instruments',         label: 'Musical\nInstruments',  emoji: '🎸', accent: '#f472b6', bg: 'rgba(244,114,182,.15)' },
  { value: 'healthy foods and nutrition', label: 'Healthy\nFoods',        emoji: '🥦', accent: '#fbbf24', bg: 'rgba(251,191,36,.15)'  },
  { value: 'emotions and feelings',       label: 'Emotions &\nFeelings',  emoji: '😊', accent: '#fbbf24', bg: 'rgba(251,191,36,.15)'  },
  { value: 'sharing and kindness',        label: 'Sharing &\nKindness',   emoji: '💛', accent: '#fcd34d', bg: 'rgba(252,211,77,.15)'  },
  { value: 'basic road safety',           label: 'Road\nSafety',          emoji: '🚦', accent: '#f87171', bg: 'rgba(248,113,113,.15)' },
]

export default subjects
