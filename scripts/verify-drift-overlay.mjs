import { existsSync, mkdirSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawn } from 'node:child_process'
import { setTimeout as delay } from 'node:timers/promises'

import { chromium } from 'playwright'

const port = Number(process.env.DRIFT_VERIFY_PORT ?? 3210)
const baseUrl = process.env.DRIFT_VERIFY_URL ?? `http://127.0.0.1:${port}`
const outputDir = '/private/tmp/drift-production-check'
const loopBoundaryChannelTolerance = Number(process.env.DRIFT_VERIFY_CHANNEL_TOLERANCE ?? 1200)
const timestamps = [0, 800, 2200, 3500, 4300, 5200, 5900, 6400]
const konamiKeys = [
  'ArrowUp',
  'ArrowUp',
  'ArrowDown',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowLeft',
  'ArrowRight',
  'b',
  'a',
]

function getChromeExecutablePath() {
  const candidates = [
    process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
  ].filter(Boolean)

  return candidates.find((candidate) => existsSync(candidate))
}

async function waitForServer(url, processHandle) {
  const deadline = Date.now() + 45_000

  while (Date.now() < deadline) {
    if (processHandle.exitCode !== null) {
      throw new Error(`Next dev server exited with code ${processHandle.exitCode}`)
    }

    try {
      const response = await fetch(url)

      if (response.ok || response.status < 500) {
        return
      }
    } catch {
      // Keep polling until Next has bound the port.
    }

    await delay(500)
  }

  throw new Error(`Timed out waiting for ${url}`)
}

function startServer() {
  if (process.env.DRIFT_VERIFY_URL) {
    return null
  }

  return spawn('yarn', ['dev', '--hostname', '127.0.0.1', '--port', String(port)], {
    cwd: resolve(import.meta.dirname, '..'),
    env: { ...process.env, CI: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
}

async function triggerKonami(page) {
  for (const key of konamiKeys) {
    await page.keyboard.press(key)
  }
}

async function captureFrame(page, timestamp) {
  await page.evaluate((time) => {
    window.__driftVerify.advanceTo(time)
  }, timestamp)

  await page.locator('.drift-stage').screenshot({
    path: `${outputDir}/${String(timestamp).padStart(5, '0')}.png`,
  })

  return page.evaluate(() => {
    const canvas = document.querySelector('.drift-canvas')

    if (!(canvas instanceof HTMLCanvasElement)) {
      throw new Error('Drift canvas not found')
    }

    const context = canvas.getContext('2d')

    if (!context) {
      throw new Error('Drift canvas context not available')
    }

    return Array.from(context.getImageData(0, 0, canvas.width, canvas.height).data)
  })
}

function getPixelDiff(firstFrame, secondFrame, width) {
  let diff = 0
  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  for (let index = 0; index < firstFrame.length; index += 1) {
    if (firstFrame[index] !== secondFrame[index]) {
      diff += 1
      const pixelIndex = Math.floor(index / 4)
      const x = pixelIndex % width
      const y = Math.floor(pixelIndex / width)

      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)
    }
  }

  return {
    bounds:
      diff === 0
        ? null
        : {
            maxX,
            maxY,
            minX,
            minY,
          },
    diff,
  }
}

async function run() {
  rmSync(outputDir, { force: true, recursive: true })
  mkdirSync(outputDir, { recursive: true })

  const server = startServer()

  try {
    if (server) {
      server.stdout.on('data', (chunk) => process.stdout.write(chunk))
      server.stderr.on('data', (chunk) => process.stderr.write(chunk))
      await waitForServer(baseUrl, server)
    }

    const executablePath = getChromeExecutablePath()
    const browser = await chromium.launch({
      executablePath,
      headless: true,
    })

    try {
      const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })

      await page.emulateMedia({ reducedMotion: 'no-preference' })

      await page.addInitScript(() => {
        let nextFrameId = 1
        let callbacks = []

        window.__driftVerify = {
          advanceTo(time) {
            const pendingCallbacks = callbacks
            callbacks = []
            pendingCallbacks.forEach(({ callback }) => callback(time))
          },
        }

        window.requestAnimationFrame = (callback) => {
          const id = nextFrameId
          nextFrameId += 1
          callbacks.push({ id, callback })

          return id
        }

        window.cancelAnimationFrame = (id) => {
          callbacks = callbacks.filter((entry) => entry.id !== id)
        }
      })

      await page.goto(baseUrl, { waitUntil: 'networkidle' })
      await triggerKonami(page)
      await page.locator('.drift-overlay').waitFor({ state: 'visible' })

      let firstFrame = null
      let lastFrame = null

      for (const timestamp of timestamps) {
        const frame = await captureFrame(page, timestamp)

        if (timestamp === 0) {
          firstFrame = frame
        }

        if (timestamp === 6400) {
          lastFrame = frame
        }
      }

      const canvasWidth = await page.locator('.drift-canvas').evaluate((canvas) => {
        if (!(canvas instanceof HTMLCanvasElement)) {
          throw new Error('Drift canvas not found')
        }

        return canvas.width
      })
      const { bounds, diff } = getPixelDiff(firstFrame, lastFrame, canvasWidth)

      if (diff > loopBoundaryChannelTolerance) {
        throw new Error(
          `Loop boundary mismatch: ${diff} channel values differ` +
            (bounds
              ? ` within x:${bounds.minX}-${bounds.maxX}, y:${bounds.minY}-${bounds.maxY}`
              : '')
        )
      }

      if (diff > 0) {
        console.log(
          `Loop boundary channel drift within tolerance: ${diff}/${loopBoundaryChannelTolerance}` +
            (bounds
              ? ` within x:${bounds.minX}-${bounds.maxX}, y:${bounds.minY}-${bounds.maxY}`
              : '')
        )
      }

      await page.keyboard.press('Escape')
      await page.locator('.drift-overlay').waitFor({ state: 'detached' })

      console.log(`Drift overlay verification passed. Captures: ${outputDir}`)
    } finally {
      await browser.close()
    }
  } finally {
    if (server) {
      server.kill('SIGTERM')
    }
  }
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
