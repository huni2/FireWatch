// Keep old cached briefings readable without changing the stored source.
export function briefingText(value: string): string {
  return value.replace(/\r\n?/g, '\n')
    .replace(/^[ \t]*(```|~~~).*$/gm, '')
    .replace(/^[ \t]{0,3}(?:[-*_][ \t]*){3,}$/gm, '')
    .replace(/^[ \t]{0,3}#{1,6}[ \t]+(.+?)(?:[ \t]+#+)?[ \t]*$/gm, '$1')
    .replace(/^[ \t]*>[ \t]?/gm, '')
    .replace(/^[ \t]*[-+*][ \t]+/gm, '• ')
    .replace(/!?\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/(^|[\s(])__([^_\n]+)__(?=$|[\s.,!?;)])/g, '$1$2')
    .replace(/\*(\S(?:[^*\n]*?\S)?)\*/g, '$1')
    .replace(/(^|[\s(])_([^_\n]+)_(?=$|[\s.,!?;)])/g, '$1$2')
    .replace(/~~([^~]+)~~/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\n{3,}/g, '\n\n').trim()
}
