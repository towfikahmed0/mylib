import packageJson from '../../package.json'

/**
 * Single source of truth for the application version.
 * Reads runtime VITE_APP_VERSION (injected at build time by Vite)
 * or falls back to package.json version.
 */
export const APP_VERSION: string =
  (import.meta.env.VITE_APP_VERSION as string | undefined) || packageJson.version || '3.2.0'
