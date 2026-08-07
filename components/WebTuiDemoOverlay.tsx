'use client'

import { useEffect, useRef } from 'react'

type WebTuiDemoOverlayProps = {
  onClose: () => void
}

const terminalLines = [
  'wid@web:~$ yarn add @webtui/css',
  'resolution step: + @webtui/css',
  'link step: ascii controls online',
  'wid@web:~$ run demo --overlay',
  'mounting terminal view...',
  'binding badges, boxes, buttons, progress',
  'status: ridiculous little secret unlocked',
]

function webTui(attributes: Record<string, string>) {
  return attributes
}

export default function WebTuiDemoOverlay({ onClose }: WebTuiDemoOverlayProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeButtonRef.current?.focus()

    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [])

  return (
    <div
      className="webtui-overlay"
      data-webtui-theme="dark"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <section aria-label="WebTUI demo" aria-modal="true" className="webtui-shell" role="dialog">
        <div className="webtui-header">
          <div className="webtui-header-title">
            <span {...webTui({ 'is-': 'badge', 'variant-': 'foreground0', 'cap-': 'round' })}>
              WEBTUI
            </span>
            <span className="webtui-muted webtui-truncate">konami overlay demo</span>
          </div>
          <button
            {...webTui({ 'size-': 'small' })}
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
          >
            close
          </button>
        </div>

        <div className="webtui-body">
          <div {...webTui({ 'is-': 'view' })} className="webtui-terminal">
            <div {...webTui({ 'is-': 'view-content' })} className="webtui-terminal-content">
              <div className="webtui-badge-row">
                <span {...webTui({ 'is-': 'badge', 'variant-': 'background2' })}>demo</span>
                <span
                  {...webTui({ 'is-': 'badge', 'variant-': 'foreground1', 'cap-': 'triangle' })}
                >
                  secret
                </span>
                <span className="webtui-muted">/usr/local/wid/webtui</span>
              </div>

              <pre className="webtui-terminal-lines">
                {terminalLines.map((line) => `> ${line}`).join('\n')}
              </pre>

              <div {...webTui({ 'is-': 'separator' })} className="webtui-separator-space" />

              <div className="webtui-card-grid">
                <div {...webTui({ 'box-': 'square' })} className="webtui-panel">
                  <p className="webtui-panel-title">components</p>
                  <ul className="webtui-list">
                    <li>[x] box utility</li>
                    <li>[x] badges</li>
                    <li>[x] terminal view</li>
                    <li>[x] buttons</li>
                  </ul>
                </div>

                <div {...webTui({ 'box-': 'double' })} className="webtui-panel">
                  <p className="webtui-panel-title">boot progress</p>
                  <div {...webTui({ 'is-': 'progress' })} aria-label="Demo progress" />
                  <p className="webtui-progress-label">72% vibes compiled</p>
                </div>
              </div>
            </div>
          </div>

          <aside {...webTui({ 'box-': 'round' })} className="webtui-sidebar">
            <div>
              <p className="webtui-panel-title">sequence</p>
              <p className="webtui-block-copy">UP UP DOWN DOWN LEFT RIGHT LEFT RIGHT B A</p>
            </div>

            <div {...webTui({ 'is-': 'separator' })} />

            <div>
              <p className="webtui-panel-title">controls</p>
              <div className="webtui-button-row">
                <button {...webTui({ 'box-': 'round' })} type="button">
                  ping
                </button>
                <button {...webTui({ 'box-': 'square' })} type="button">
                  trace
                </button>
              </div>
            </div>

            <div {...webTui({ 'box-': 'square' })} className="webtui-note">
              <p className="webtui-panel-title">note</p>
              <p className="webtui-block-copy">
                Escape closes this panel. The rest of the site stays right where it was.
              </p>
            </div>
          </aside>
        </div>
      </section>
    </div>
  )
}
