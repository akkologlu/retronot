import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'RetroNot — Retros that stick.'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#0F172A',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          padding: '80px 100px',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Sticky note icon */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '24px',
            marginBottom: '48px',
          }}
        >
          <svg width="72" height="72" viewBox="0 0 32 32" fill="none">
            <polygon points="2,2 24,2 30,8 30,30 2,30" fill="#F59E0B" />
            <polygon points="24,2 24,8 30,8" fill="#B45309" />
            <line x1="6" y1="15" x2="22" y2="15" stroke="#92400E" strokeWidth="2" strokeLinecap="round" />
            <line x1="6" y1="20" x2="22" y2="20" stroke="#92400E" strokeWidth="2" strokeLinecap="round" />
            <line x1="6" y1="25" x2="16" y2="25" stroke="#92400E" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span
            style={{
              fontSize: '56px',
              fontWeight: '400',
              color: '#F8FAFC',
              letterSpacing: '-1px',
              lineHeight: 1,
            }}
          >
            retro
            <span style={{ fontWeight: '700', color: '#F59E0B' }}>not</span>
          </span>
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: '72px',
            fontWeight: '300',
            color: 'rgba(248,250,252,0.9)',
            lineHeight: '1.1',
            letterSpacing: '-2px',
            marginBottom: '40px',
            maxWidth: '900px',
          }}
        >
          Retros that stick.
        </div>

        {/* Sub */}
        <div
          style={{
            fontSize: '28px',
            color: 'rgba(148,163,184,1)',
            fontWeight: '400',
          }}
        >
          Fast, focused retrospectives for high-performing teams.
        </div>

        {/* Decorative amber bar */}
        <div
          style={{
            position: 'absolute',
            bottom: '0',
            left: '0',
            right: '0',
            height: '6px',
            background: '#F59E0B',
          }}
        />
      </div>
    ),
    { ...size }
  )
}
