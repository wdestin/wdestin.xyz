import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawn } from 'node:child_process'
import { setTimeout as delay } from 'node:timers/promises'

import AxeBuilder from '@axe-core/playwright'
import { chromium } from 'playwright'

const port = Number(process.env.A11Y_VERIFY_PORT ?? 3211)
const baseUrl = process.env.A11Y_VERIFY_URL ?? `http://127.0.0.1:${port}`
const testWebsiteId = '00000000-0000-4000-8000-000000000000'
const axeTags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
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
  if (process.env.A11Y_VERIFY_URL) {
    return null
  }

  return spawn('yarn', ['dev', '--hostname', '127.0.0.1', '--port', String(port)], {
    cwd: resolve(import.meta.dirname, '..'),
    env: {
      ...process.env,
      CI: '1',
      NEXT_UMAMI_ID: process.env.NEXT_UMAMI_ID ?? testWebsiteId,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
}

function getDirective(csp, directiveName) {
  const directive = csp
    .split(';')
    .map((value) => value.trim())
    .find((value) => value.startsWith(`${directiveName} `))

  assert.ok(directive, `Missing ${directiveName} directive`)
  return directive.split(/\s+/).slice(1)
}

async function configureAnalyticsRoutes(page, analyticsRequests) {
  await page.route('https://cloud.umami.is/**', async (route) => {
    analyticsRequests.cloud = true
    await route.fulfill({
      body: "void fetch('https://gateway.umami.is/api/send', { method: 'POST', mode: 'no-cors' })",
      contentType: 'application/javascript',
      status: 200,
    })
  })

  await page.route('https://gateway.umami.is/**', async (route) => {
    analyticsRequests.gateway = true
    await route.fulfill({ status: 204 })
  })
}

async function openPage(browser, { colorScheme, path, viewport }) {
  const context = await browser.newContext({ viewport })
  const page = await context.newPage()
  const analyticsRequests = { cloud: false, gateway: false }
  const cspMessages = []

  await page.emulateMedia({ colorScheme, reducedMotion: 'no-preference' })
  await configureAnalyticsRoutes(page, analyticsRequests)
  page.on('console', (message) => {
    if (message.text().includes('Content Security Policy')) {
      cspMessages.push(message.text())
    }
  })

  const response = await page.goto(`${baseUrl}${path}`, { waitUntil: 'domcontentloaded' })
  assert.ok(response, `No response received for ${path}`)
  await page.locator('body').waitFor()
  await page.waitForFunction(() => document.readyState === 'complete')
  await page.waitForTimeout(100)

  return { analyticsRequests, context, cspMessages, page, response }
}

async function triggerKonami(page) {
  for (const key of konamiKeys) {
    await page.keyboard.press(key)
  }

  await page.locator('[role="dialog"]').waitFor({ state: 'visible' })
}

async function assertNoAxeViolations(page, label) {
  const results = await new AxeBuilder({ page }).withTags(axeTags).analyze()

  if (results.violations.length === 0) {
    return
  }

  const details = results.violations
    .map((violation) => {
      const targets = violation.nodes.flatMap((node) => node.target).join(', ')
      return `${violation.id}: ${violation.help} (${targets})`
    })
    .join('\n')

  assert.fail(`${label} has accessibility violations:\n${details}`)
}

async function verifyCspAndAnalytics(browser) {
  const { analyticsRequests, context, cspMessages, page, response } = await openPage(browser, {
    colorScheme: 'light',
    path: '/',
    viewport: { height: 720, width: 1280 },
  })
  let blockedOriginReachedNetwork = false

  await page.route('https://example.com/**', async (route) => {
    blockedOriginReachedNetwork = true
    await route.fulfill({ body: '', contentType: 'application/javascript', status: 200 })
  })

  try {
    const csp = (await response.allHeaders())['content-security-policy']
    assert.ok(csp, 'Content-Security-Policy response header is missing')

    const scriptSources = getDirective(csp, 'script-src')
    const connectSources = getDirective(csp, 'connect-src')

    assert.ok(scriptSources.includes('https://cloud.umami.is'))
    assert.ok(!scriptSources.includes('analytics.umami.is'))
    assert.ok(!scriptSources.includes('us.umami.is'))
    assert.ok(connectSources.includes('https://gateway.umami.is'))
    assert.ok(!connectSources.includes('https://cloud.umami.is'))
    assert.ok(!connectSources.includes('analytics.umami.is'))
    assert.ok(!connectSources.includes('us.umami.is'))

    await page.locator('script[src="https://cloud.umami.is/script.js"]').waitFor({
      state: 'attached',
    })
    assert.ok(analyticsRequests.cloud, 'The Umami Cloud script was not requested')
    assert.ok(analyticsRequests.gateway, 'The Umami gateway was not contacted')
    assert.deepEqual(cspMessages, [], `Allowed Umami requests caused a CSP violation`)

    await page.evaluate(() => {
      const script = document.createElement('script')
      script.src = 'https://example.com/blocked.js'
      document.head.append(script)
    })
    await page.waitForTimeout(100)

    assert.equal(
      blockedOriginReachedNetwork,
      false,
      'An unlisted script origin reached the network'
    )
    assert.ok(
      cspMessages.some((message) => message.includes('https://example.com/blocked.js')),
      'An unlisted script origin did not produce a CSP violation'
    )
  } finally {
    await context.close()
  }
}

async function verifyPageAudits(browser) {
  const scenarios = [
    { colorScheme: 'light', path: '/', viewport: { height: 720, width: 1280 } },
    { colorScheme: 'dark', path: '/', viewport: { height: 720, width: 1280 } },
    { colorScheme: 'light', path: '/', viewport: { height: 568, width: 320 } },
    { colorScheme: 'dark', path: '/', viewport: { height: 568, width: 320 } },
    {
      colorScheme: 'light',
      path: '/',
      textScale: 2,
      viewport: { height: 720, width: 640 },
    },
    { colorScheme: 'light', path: '/missing-page', viewport: { height: 720, width: 1280 } },
    { colorScheme: 'dark', path: '/missing-page', viewport: { height: 720, width: 1280 } },
    { colorScheme: 'light', path: '/missing-page', viewport: { height: 568, width: 320 } },
    { colorScheme: 'dark', path: '/missing-page', viewport: { height: 568, width: 320 } },
    {
      colorScheme: 'light',
      dialog: true,
      path: '/',
      viewport: { height: 720, width: 1280 },
    },
    {
      colorScheme: 'dark',
      dialog: true,
      path: '/',
      viewport: { height: 720, width: 1280 },
    },
    {
      colorScheme: 'light',
      dialog: true,
      path: '/',
      viewport: { height: 568, width: 320 },
    },
    {
      colorScheme: 'dark',
      dialog: true,
      path: '/',
      viewport: { height: 568, width: 320 },
    },
  ]

  for (const scenario of scenarios) {
    const { context, page } = await openPage(browser, scenario)
    const label = `${scenario.path} ${scenario.colorScheme} ${scenario.viewport.width}px`

    try {
      if (scenario.textScale) {
        await page.evaluate((textScale) => {
          document.documentElement.style.fontSize = `${textScale * 100}%`
        }, scenario.textScale)
      }

      if (scenario.dialog) {
        await page.locator('nav[aria-label="Profile links"] a').first().focus()
        await triggerKonami(page)
      }

      await assertNoAxeViolations(page, label)
      const hasHorizontalOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth
      )
      assert.equal(hasHorizontalOverflow, false, `${label} has horizontal overflow`)
    } finally {
      await context.close()
    }
  }
}

async function verifyKeyboardAndDialog(browser) {
  const { context, page } = await openPage(browser, {
    colorScheme: 'light',
    path: '/',
    viewport: { height: 720, width: 1280 },
  })
  const firstProfileLink = page.locator('nav[aria-label="Profile links"] a').first()

  try {
    await page.keyboard.press('Tab')
    await firstProfileLink.waitFor({ state: 'visible' })
    assert.equal(
      await firstProfileLink.evaluate((element) => element === document.activeElement),
      true
    )

    const profileLinkStyles = await firstProfileLink.evaluate((element) => {
      const styles = getComputedStyle(element)
      const bounds = element.getBoundingClientRect()

      return {
        height: bounds.height,
        ring: styles.getPropertyValue('--tw-ring-shadow'),
        width: bounds.width,
      }
    })
    assert.match(profileLinkStyles.ring, /2px/, 'Profile link focus ring is not visible')
    assert.ok(profileLinkStyles.height >= 24 && profileLinkStyles.width >= 24)

    await triggerKonami(page)
    const closeButton = page.getByRole('button', { name: 'Close drift animation' })
    assert.equal(await closeButton.evaluate((element) => element === document.activeElement), true)
    assert.equal(await page.locator('#site-content').getAttribute('aria-hidden'), 'true')
    assert.equal(await page.locator('#site-content').evaluate((element) => element.inert), true)

    const closeButtonSize = await closeButton.evaluate((element) => {
      const bounds = element.getBoundingClientRect()
      return { height: bounds.height, width: bounds.width }
    })
    assert.ok(closeButtonSize.height >= 24 && closeButtonSize.width >= 24)
    await assertNoAxeViolations(page, 'open animation dialog')

    await page.keyboard.press('Tab')
    assert.equal(await closeButton.evaluate((element) => element === document.activeElement), true)
    await page.keyboard.press('Shift+Tab')
    assert.equal(await closeButton.evaluate((element) => element === document.activeElement), true)

    await page.keyboard.press('Escape')
    await page.locator('[role="dialog"]').waitFor({ state: 'detached' })
    assert.equal(
      await firstProfileLink.evaluate((element) => element === document.activeElement),
      true
    )
    assert.equal(await page.locator('#site-content').getAttribute('aria-hidden'), null)
    assert.equal(await page.locator('#site-content').evaluate((element) => element.inert), false)

    await triggerKonami(page)
    await page.locator('.drift-overlay').dispatchEvent('mousedown')
    await page.locator('[role="dialog"]').waitFor({ state: 'detached' })
    assert.equal(
      await firstProfileLink.evaluate((element) => element === document.activeElement),
      true
    )

    await triggerKonami(page)
    await page.getByRole('button', { name: 'Close drift animation' }).click()
    await page.locator('[role="dialog"]').waitFor({ state: 'detached' })
    assert.equal(
      await firstProfileLink.evaluate((element) => element === document.activeElement),
      true
    )
  } finally {
    await context.close()
  }
}

async function verifyNotFoundFocus(browser) {
  const { context, page } = await openPage(browser, {
    colorScheme: 'light',
    path: '/missing-page',
    viewport: { height: 568, width: 320 },
  })

  try {
    await page.keyboard.press('Tab')
    const homeLink = page.getByRole('link', { name: 'Back to homepage' })
    const ring = await homeLink.evaluate((element) =>
      getComputedStyle(element).getPropertyValue('--tw-ring-shadow')
    )
    assert.match(ring, /2px/, '404-page link focus ring is not visible')
  } finally {
    await context.close()
  }
}

async function verifyReducedMotion(browser) {
  const context = await browser.newContext({ viewport: { height: 568, width: 320 } })
  const page = await context.newPage()
  const analyticsRequests = { cloud: false, gateway: false }

  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' })
  await configureAnalyticsRoutes(page, analyticsRequests)

  try {
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded' })
    await page.waitForFunction(() => document.readyState === 'complete')
    await page.waitForTimeout(100)
    const firstProfileLink = page.locator('nav[aria-label="Profile links"] a').first()
    await firstProfileLink.focus()

    const transitionProperty = await firstProfileLink.evaluate(
      (element) => getComputedStyle(element).transitionProperty
    )
    assert.equal(transitionProperty, 'none')

    await triggerKonami(page)
    const firstFrame = await page.locator('.drift-canvas').evaluate((canvas) => {
      if (!(canvas instanceof HTMLCanvasElement)) {
        throw new Error('Drift canvas not found')
      }

      return canvas.toDataURL()
    })
    await page.waitForTimeout(250)
    const secondFrame = await page.locator('.drift-canvas').evaluate((canvas) => {
      if (!(canvas instanceof HTMLCanvasElement)) {
        throw new Error('Drift canvas not found')
      }

      return canvas.toDataURL()
    })

    assert.equal(firstFrame, secondFrame, 'Reduced-motion canvas continued animating')
  } finally {
    await context.close()
  }
}

async function run() {
  const server = startServer()

  try {
    if (server) {
      server.stdout.on('data', (chunk) => process.stdout.write(chunk))
      server.stderr.on('data', (chunk) => process.stderr.write(chunk))
      await waitForServer(baseUrl, server)
    }

    const executablePath = getChromeExecutablePath()
    const browser = await chromium.launch({ executablePath, headless: true })

    try {
      await verifyCspAndAnalytics(browser)
      await verifyPageAudits(browser)
      await verifyKeyboardAndDialog(browser)
      await verifyNotFoundFocus(browser)
      await verifyReducedMotion(browser)
    } finally {
      await browser.close()
    }

    console.log('Accessibility and CSP verification passed.')
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
