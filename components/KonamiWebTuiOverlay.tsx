'use client'

import type { ComponentType } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'

type DriftLoopOverlayProps = {
  onClose: () => void
}

type DriftLoopOverlayComponent = ComponentType<DriftLoopOverlayProps>

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

const driftLoopStylesheetId = 'drift-loop-overlay-stylesheet'

let driftLoopStylesheetPromise: Promise<void> | null = null
let driftLoopOverlayPromise: Promise<DriftLoopOverlayComponent> | null = null

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

function loadDriftLoopStylesheet() {
  if (driftLoopStylesheetPromise) {
    return driftLoopStylesheetPromise
  }

  driftLoopStylesheetPromise = new Promise((resolve, reject) => {
    const existingLink = document.getElementById(driftLoopStylesheetId) as HTMLLinkElement | null

    if (existingLink?.dataset.loaded === 'true' || existingLink?.sheet) {
      resolve()
      return
    }

    const link = existingLink ?? document.createElement('link')
    link.id = driftLoopStylesheetId
    link.rel = 'stylesheet'
    link.href = '/static/drift-loop-overlay.css'

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
        driftLoopStylesheetPromise = null
        reject(new Error('Failed to load the drift loop overlay stylesheet.'))
      },
      { once: true }
    )

    if (!existingLink) {
      document.head.append(link)
    }
  })

  return driftLoopStylesheetPromise
}

function loadDriftLoopOverlay() {
  driftLoopOverlayPromise ??= import('@/components/DriftLoopOverlay').then(
    (module) => module.default
  )

  return driftLoopOverlayPromise
}

export default function KonamiWebTuiOverlay() {
  const [isOpen, setIsOpen] = useState(false)
  const [DriftLoopOverlay, setDriftLoopOverlay] = useState<DriftLoopOverlayComponent | null>(null)
  const isLoading = useRef(false)
  const isMounted = useRef(false)
  const sequenceIndex = useRef(0)

  useEffect(() => {
    isMounted.current = true

    return () => {
      isMounted.current = false
    }
  }, [])

  const openDriftLoopOverlay = useCallback(async () => {
    if (isLoading.current) {
      return
    }

    isLoading.current = true

    try {
      const [Overlay] = await Promise.all([loadDriftLoopOverlay(), loadDriftLoopStylesheet()])

      if (isMounted.current) {
        setDriftLoopOverlay(() => Overlay)
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
          void openDriftLoopOverlay()
          sequenceIndex.current = 0
        }

        return
      }

      sequenceIndex.current = key === konamiSequence[0] ? 1 : 0
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [openDriftLoopOverlay])

  if (!isOpen || !DriftLoopOverlay) {
    return null
  }

  return <DriftLoopOverlay onClose={() => setIsOpen(false)} />
}
