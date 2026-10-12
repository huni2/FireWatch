import { createContext } from 'react'

// Retained tab state must not keep polling while the tab is hidden.
export const ScreenActivity = createContext(true)
