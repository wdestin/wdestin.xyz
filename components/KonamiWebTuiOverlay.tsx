'use client'

import type { ComponentType } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'

type WebTuiDemoOverlayProps = {
  onClose: () => void
}

type WebTuiDemoOverlayComponent = ComponentType<WebTuiDemoOverlayProps>

const konamiSequence = [
  'ArrowUp',
  'ArrowUp',
  'ArrowDown',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowLeft',
  'ArrowRight',
  'B',
  'A',
]

const webTuiStylesheetId = 'webtui-overlay-stylesheet'

let webTuiStylesheetPromise: Promise<void> | null = null
let webTuiDemoOverlayPromise: Promise<WebTuiDemoOverlayComponent> | null = null

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  const tagName = target.tagName.toLowerCase()

  return (
    target.isContentEditable ||
    tagName === 'input' ||
    tagName === 'textarea' ||
    tagName === 'select'
  )
}

function normalizeKey(key: string) {
  return key.length === 1 ? key.toUpperCase() : key
}

function loadWebTuiStylesheet() {
  if (webTuiStylesheetPromise) {
    return webTuiStylesheetPromise
  }

  webTuiStylesheetPromise = new Promise((resolve, reject) => {
    const existingLink = document.getElementById(webTuiStylesheetId) as HTMLLinkElement | null

    if (existingLink?.dataset.loaded === 'true' || existingLink?.sheet) {
      resolve()
      return
    }

    const link = existingLink ?? document.createElement('link')
    link.id = webTuiStylesheetId
    link.rel = 'stylesheet'
    link.href = '/static/webtui-overlay.css'

    link.addEventListener(
      'load',
      () => {
        link.dataset.loaded = 'true'
        resolve()
      },
      { once: true }
    )

    link.addEventListener(
      'error',
      () => {
        webTuiStylesheetPromise = null
        reject(new Error('Failed to load the WebTUI overlay stylesheet.'))
      },
      { once: true }
    )

    if (!existingLink) {
      document.head.append(link)
    }
  })

  return webTuiStylesheetPromise
}

function loadWebTuiDemoOverlay() {
  webTuiDemoOverlayPromise ??= import('@/components/WebTuiDemoOverlay').then(
    (module) => module.default
  )

  return webTuiDemoOverlayPromise
}

export default function KonamiWebTuiOverlay() {
  const [isOpen, setIsOpen] = useState(false)
  const [WebTuiDemoOverlay, setWebTuiDemoOverlay] = useState<WebTuiDemoOverlayComponent | null>(
    null
  )
  const isLoading = useRef(false)
  const isMounted = useRef(false)
  const sequenceIndex = useRef(0)

  useEffect(() => {
    isMounted.current = true

    return () => {
      isMounted.current = false
    }
  }, [])

  const openDemoOverlay = useCallback(async () => {
    if (isLoading.current) {
      return
    }

    isLoading.current = true

    try {
      const [Overlay] = await Promise.all([loadWebTuiDemoOverlay(), loadWebTuiStylesheet()])

      if (isMounted.current) {
        setWebTuiDemoOverlay(() => Overlay)
        setIsOpen(true)
      }
    } catch (error) {
      console.error(error)
    } finally {
      isLoading.current = false
    }
  }, [])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
        sequenceIndex.current = 0
        return
      }

      if (isEditableTarget(event.target)) {
        return
      }

      const key = normalizeKey(event.key)
      const expectedKey = konamiSequence[sequenceIndex.current]

      if (key === expectedKey) {
        sequenceIndex.current += 1

        if (sequenceIndex.current === konamiSequence.length) {
          void openDemoOverlay()
          sequenceIndex.current = 0
        }

        return
      }

      sequenceIndex.current = key === konamiSequence[0] ? 1 : 0
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [openDemoOverlay])

  if (!isOpen || !WebTuiDemoOverlay) {
    return null
  }

  return <WebTuiDemoOverlay onClose={() => setIsOpen(false)} />
}
