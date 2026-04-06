/**
 * MarkFlow 로고 컴포넌트
 *
 * Mark#Flow — 글자 간격 균일, # 아이콘 블루박스
 * 인라인 SVG로 렌더링하므로 외부 폰트 의존 없음
 */

interface MarkFlowLogoProps {
  /** 전체 높이 (px). 기본 28 */
  height?: number;
  /** 태그라인 표시 여부. 기본 false */
  showTagline?: boolean;
  /** 다크 배경용 (Mark 텍스트를 white로). 기본 false */
  dark?: boolean;
}

export function MarkFlowLogo({ height = 28, showTagline = false, dark = false }: MarkFlowLogoProps) {
  const scale = height / 28;
  const markColor = dark ? '#f1f5f9' : '#1A1916';

  return (
    <span
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        lineHeight: 1,
      }}
    >
      {/* Mark#Flow 로고 */}
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: `${1 * scale}px` }}>
        <span
          style={{
            fontFamily: 'var(--font-sora), Sora, sans-serif',
            fontWeight: 600,
            fontSize: `${20 * scale}px`,
            color: markColor,
            letterSpacing: '-0.02em',
          }}
        >
          Mark
        </span>
        <span
          style={{
            width: `${18 * scale}px`,
            height: `${18 * scale}px`,
            borderRadius: `${4 * scale}px`,
            background: '#1A56DB',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <svg
            width={`${14 * scale}px`}
            height={`${14 * scale}px`}
            viewBox="0 0 14 14"
            fill="none"
          >
            <rect x="1.5" y="4.5" width="11" height="1.8" rx="0.9" fill="white" opacity="0.95" />
            <rect x="1.5" y="7.7" width="11" height="1.8" rx="0.9" fill="white" opacity="0.95" />
            <rect x="4.2" y="1.5" width="1.8" height="11" rx="0.9" fill="white" opacity="0.95" />
            <rect x="8" y="1.5" width="1.8" height="11" rx="0.9" fill="white" opacity="0.95" />
          </svg>
        </span>
        <span
          style={{
            fontFamily: 'var(--font-sora), Sora, sans-serif',
            fontWeight: 700,
            fontSize: `${20 * scale}px`,
            color: '#1A56DB',
            letterSpacing: '-0.02em',
          }}
        >
          Flow
        </span>
      </span>
      {/* 태그라인: Mark#Flow 하단 */}
      {showTagline && (
        <span
          style={{
            fontFamily: 'var(--font-sora), Sora, sans-serif',
            fontWeight: 600,
            fontSize: 10,
            color: dark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.55)',
            letterSpacing: '0.03em',
            marginTop: `${2 * scale}px`,
          }}
        >
          Markdown Knowledge System
        </span>
      )}
    </span>
  );
}
