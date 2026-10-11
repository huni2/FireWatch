import { createContext } from 'react'

// The initial portfolio settles on success or error; other menus do not block entry.
export const AppReadiness = createContext({ markReady: () => {}, preparing: false })
