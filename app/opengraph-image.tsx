import { ImageResponse } from 'next/og'
import siteMetadata from '@/data/siteMetadata'

export const runtime = 'edge'
export const alt = siteMetadata.description
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    <div
      style={{
        alignItems: 'center',
        background: '#f8fafc',
        color: '#111827',
        display: 'flex',
        fontFamily: 'Arial, Helvetica, sans-serif',
        height: '100%',
        justifyContent: 'center',
        padding: '76px',
        width: '100%',
      }}
    >
      <div
        style={{
          border: '2px solid #e5e7eb',
          borderRadius: '28px',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          justifyContent: 'space-between',
          padding: '56px',
          width: '100%',
        }}
      >
        <div style={{ color: '#db2777', display: 'flex', fontSize: 28, fontWeight: 700 }}>
          Software Engineer
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 96, fontWeight: 800, lineHeight: 1 }}>Wid</div>
          <div style={{ color: '#4b5563', fontSize: 36, lineHeight: 1.35, marginTop: 28 }}>
            Software engineer based in Toronto.
          </div>
        </div>
        <div style={{ color: '#6b7280', display: 'flex', fontSize: 28, gap: 26 }}>
          <span>LinkedIn</span>
          <span>GitHub</span>
          <span>X</span>
          <span>Email</span>
        </div>
      </div>
    </div>,
    size
  )
}
