import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'MarkFlow — 마크다운 기반 팀 지식 관리 플랫폼';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(145deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Grid pattern overlay */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            opacity: 0.06,
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        {/* Glow effect top-left */}
        <div
          style={{
            position: 'absolute',
            top: -120,
            left: -80,
            width: 500,
            height: 500,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(26,86,219,0.25) 0%, transparent 70%)',
            display: 'flex',
          }}
        />

        {/* Glow effect bottom-right */}
        <div
          style={{
            position: 'absolute',
            bottom: -160,
            right: -100,
            width: 600,
            height: 600,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 70%)',
            display: 'flex',
          }}
        />

        {/* Floating doc icons */}
        <div
          style={{
            position: 'absolute',
            top: 80,
            left: 100,
            width: 48,
            height: 56,
            borderRadius: 8,
            border: '2px solid rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.04)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: 'rotate(-12deg)',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ width: 24, height: 3, borderRadius: 2, background: 'rgba(26,86,219,0.5)', display: 'flex' }} />
            <div style={{ width: 18, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.15)', display: 'flex' }} />
            <div style={{ width: 22, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.1)', display: 'flex' }} />
          </div>
        </div>

        <div
          style={{
            position: 'absolute',
            top: 120,
            right: 140,
            width: 44,
            height: 52,
            borderRadius: 8,
            border: '2px solid rgba(255,255,255,0.06)',
            background: 'rgba(255,255,255,0.03)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: 'rotate(8deg)',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ width: 22, height: 3, borderRadius: 2, background: 'rgba(99,102,241,0.4)', display: 'flex' }} />
            <div style={{ width: 16, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.12)', display: 'flex' }} />
          </div>
        </div>

        <div
          style={{
            position: 'absolute',
            bottom: 100,
            left: 180,
            width: 40,
            height: 48,
            borderRadius: 6,
            border: '2px solid rgba(255,255,255,0.05)',
            background: 'rgba(255,255,255,0.02)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: 'rotate(6deg)',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div style={{ width: 20, height: 2, borderRadius: 2, background: 'rgba(26,86,219,0.3)', display: 'flex' }} />
            <div style={{ width: 14, height: 2, borderRadius: 2, background: 'rgba(255,255,255,0.08)', display: 'flex' }} />
            <div style={{ width: 18, height: 2, borderRadius: 2, background: 'rgba(255,255,255,0.06)', display: 'flex' }} />
          </div>
        </div>

        {/* Connection lines between docs */}
        <div
          style={{
            position: 'absolute',
            top: 140,
            left: 160,
            width: 200,
            height: 2,
            background: 'linear-gradient(90deg, rgba(26,86,219,0.15), transparent)',
            transform: 'rotate(20deg)',
            display: 'flex',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 160,
            right: 200,
            width: 180,
            height: 2,
            background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.12))',
            transform: 'rotate(-15deg)',
            display: 'flex',
          }}
        />

        {/* Logo: Mark#Flow */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 0,
            marginBottom: 20,
          }}
        >
          {/* "Mark" */}
          <span
            style={{
              fontSize: 72,
              fontWeight: 700,
              color: '#f1f5f9',
              letterSpacing: '-1px',
              fontFamily: 'sans-serif',
            }}
          >
            Mark
          </span>

          {/* # icon */}
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 12,
              background: '#1a56db',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginLeft: 2,
              marginRight: 2,
              boxShadow: '0 4px 20px rgba(26,86,219,0.5)',
              position: 'relative',
            }}
          >
            {/* Hash lines */}
            <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ width: 24, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.95)', display: 'flex' }} />
              <div style={{ width: 24, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.95)', display: 'flex' }} />
            </div>
            <div style={{ position: 'absolute', display: 'flex', flexDirection: 'row', gap: 10 }}>
              <div style={{ width: 4, height: 28, borderRadius: 2, background: 'rgba(255,255,255,0.95)', display: 'flex' }} />
              <div style={{ width: 4, height: 28, borderRadius: 2, background: 'rgba(255,255,255,0.95)', display: 'flex' }} />
            </div>
          </div>

          {/* "Flow" */}
          <span
            style={{
              fontSize: 72,
              fontWeight: 700,
              color: '#1a56db',
              letterSpacing: '-1px',
              fontFamily: 'sans-serif',
            }}
          >
            Flow
          </span>
        </div>

        {/* Tagline */}
        <div
          style={{
            display: 'flex',
            fontSize: 24,
            color: 'rgba(148,163,184,0.9)',
            letterSpacing: '0.5px',
            fontFamily: 'sans-serif',
            fontWeight: 500,
            marginBottom: 40,
          }}
        >
          MARKDOWN KNOWLEDGE SYSTEM
        </div>

        {/* Description */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 32,
            padding: '16px 32px',
            borderRadius: 16,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {[
            { icon: '# ', label: '마크다운 에디터' },
            { icon: '🗂', label: '카테고리 구조화' },
            { icon: '🔗', label: '문서 그래프' },
            { icon: '👥', label: '팀 협업' },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 18,
                color: 'rgba(226,232,240,0.8)',
                fontFamily: 'sans-serif',
              }}
            >
              <span style={{ fontSize: 20 }}>{item.icon}</span>
              <span>{item.label}</span>
            </div>
          ))}
        </div>

        {/* URL badge at bottom */}
        <div
          style={{
            position: 'absolute',
            bottom: 32,
            display: 'flex',
            fontSize: 16,
            color: 'rgba(148,163,184,0.5)',
            fontFamily: 'sans-serif',
            letterSpacing: '1px',
          }}
        >
          markflow.dev
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}
