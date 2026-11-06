import { useEffect, type ComponentType } from 'react'
import { createRoot } from 'react-dom/client'
import { Global } from '@emotion/react'
import { globalTokens, globalBase, globalMarkdown } from './tokens'

export const THEME_STORAGE_KEY = 'ui_theme'
export type ThemeMode = 'auto' | 'light' | 'dark'

export function resolveTheme(mode: ThemeMode): 'light' | 'dark' {
  return mode === 'auto'
    ? (window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
    : mode
}

function applyTheme(mode: ThemeMode) {
  document.documentElement.setAttribute('data-theme', resolveTheme(mode))
}

function AppGlobal() {
  useEffect(() => {
    try {
      chrome.storage.local.get([THEME_STORAGE_KEY], res => {
        const mode = (res?.[THEME_STORAGE_KEY] as ThemeMode) || 'auto'
        applyTheme(mode)
      })
    } catch {
      applyTheme('auto')
    }

    const mq = window.matchMedia?.('(prefers-color-scheme: light)')
    const handler = () => {
      try {
        chrome.storage.local.get([THEME_STORAGE_KEY], res => {
          const mode = (res?.[THEME_STORAGE_KEY] as ThemeMode) || 'auto'
          if (mode === 'auto') applyTheme('auto')
        })
      } catch (e) {
        void e
      }
    }
    mq?.addEventListener?.('change', handler)

    const onStorageChanged = (
      changes: Record<string, chrome.storage.StorageChange>,
      area: string
    ) => {
      if (area === 'local' && changes[THEME_STORAGE_KEY]) {
        applyTheme((changes[THEME_STORAGE_KEY].newValue as ThemeMode) || 'auto')
      }
    }
    chrome.storage.onChanged.addListener(onStorageChanged)

    return () => {
      mq?.removeEventListener?.('change', handler)
      chrome.storage.onChanged.removeListener(onStorageChanged)
    }
  }, [])

  return (
    <>
      <Global styles={globalTokens} />
      <Global styles={globalBase} />
      <Global styles={globalMarkdown} />
    </>
  )
}

export function setThemeMode(mode: ThemeMode) {
  chrome.storage.local.set({ [THEME_STORAGE_KEY]: mode })
  applyTheme(mode)
}

export function mountPage(Page: ComponentType) {
  createRoot(document.getElementById('root')!).render(
    <>
      <AppGlobal />
      <Page />
    </>
  )
}
