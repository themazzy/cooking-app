import { Capacitor, SystemBars, SystemBarsStyle } from '@capacitor/core'

// Light or dark look and the accent colour, chosen in Settings (or following the phone).
// The resolved theme goes on <html data-theme>, the accent on <html data-accent>; styles.css does the rest.

export const THEMES = { system: 'Like the phone', light: 'Light', dark: 'Dark' }

// Accent colour on the light and on the dark theme; styles.css mixes the tints from them
export const ACCENTS = {
  herb: { label: 'Herb', light: '#2f7a52', dark: '#5cc08d' },
  tomato: { label: 'Tomato', light: '#c2410c', dark: '#f28b5b' },
  saffron: { label: 'Saffron', light: '#9a5b00', dark: '#f0b552' },
  berry: { label: 'Berry', light: '#b5306a', dark: '#f07fae' },
  plum: { label: 'Plum', light: '#7a3e9d', dark: '#c48ae6' },
  blueberry: { label: 'Blueberry', light: '#2f5fb3', dark: '#7aa7f0' },
}

const SETTINGS_KEY = 'cooking-app:settings'
const darkQuery = () => window.matchMedia?.('(prefers-color-scheme: dark)')

export function resolveTheme(theme) {
  if (theme === 'light' || theme === 'dark') return theme
  return darkQuery()?.matches ? 'dark' : 'light'
}

let current = { theme: 'system', accent: 'herb' }

export function applyTheme({ theme = 'system', accent = 'herb' } = {}) {
  current = { theme, accent }
  const root = document.documentElement
  const resolved = resolveTheme(theme)
  root.dataset.theme = resolved
  root.dataset.accent = ACCENTS[accent] ? accent : 'herb'
  const bar = document.querySelector('meta[name="theme-color"]')
  if (bar) bar.content = resolved === 'dark' ? '#141412' : '#f7f5f0'
  // Status bar icons: light on the dark theme, dark on the light one
  if (Capacitor.isNativePlatform()) SystemBars.setStyle({ style: resolved === 'dark' ? SystemBarsStyle.Dark : SystemBarsStyle.Light }).catch(() => {})
}

/** Applies the saved choice before the first render, and follows the phone while set to "Like the phone". */
export function startTheme() {
  let saved = {}
  try {
    saved = JSON.parse(localStorage.getItem(SETTINGS_KEY)) ?? {}
  } catch {
    // no saved settings yet
  }
  applyTheme(saved)
  darkQuery()?.addEventListener?.('change', () => current.theme === 'system' && applyTheme(current))
}
