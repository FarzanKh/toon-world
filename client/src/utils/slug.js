/**
 * URL slug utilities shared by HomePage and LessonPage.
 */

/** "Basic Addition" → "basic-addition" */
export function toSlug(str) {
  return encodeURIComponent(str.trim().toLowerCase().replace(/\s+/g, '-'))
}

/** "basic-addition" → "basic addition" */
export function fromSlug(slug) {
  return decodeURIComponent(slug ?? '').replace(/-/g, ' ')
}

/** "basic addition" → "Basic Addition" */
export function toTitleCase(str) {
  return str.replace(/\b\w/g, c => c.toUpperCase())
}
