export const FIRST_VISIT_GUIDE_EVENT = 'firewatch:show-guide'
export function showFirstVisitGuide() { window.dispatchEvent(new Event(FIRST_VISIT_GUIDE_EVENT)) }
