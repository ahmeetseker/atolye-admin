import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'

// Browser-only worker. NEVER imported during build/SSR.
export const worker = setupWorker(...handlers)
