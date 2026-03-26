'use client';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  onNavigateHome?: () => void;
}

function XIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export function ErrorState({
  title = '오류가 발생했습니다',
  message = '요청을 처리하는 중 문제가 발생했습니다.',
  onRetry,
  onNavigateHome,
}: ErrorStateProps) {
  const hasActions = onRetry || onNavigateHome;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '64px 32px',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            backgroundColor: 'var(--red-lt)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--red)',
            marginBottom: 16,
            flexShrink: 0,
          }}
        >
          <XIcon />
        </div>

        <h3
          style={{
            fontSize: 18,
            fontWeight: 600,
            fontFamily: 'var(--font-heading)',
            color: 'var(--text)',
            margin: '0 0 8px 0',
            lineHeight: 1.4,
          }}
        >
          {title}
        </h3>

        <p
          style={{
            fontSize: 14,
            color: 'var(--text-2)',
            margin: hasActions ? '0 0 24px 0' : 0,
            lineHeight: 1.5,
            maxWidth: 360,
          }}
        >
          {message}
        </p>

        {hasActions && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                style={{
                  backgroundColor: 'var(--accent)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 'var(--radius)',
                  padding: '10px 20px',
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: 'pointer',
                  lineHeight: 1,
                }}
              >
                다시 시도
              </button>
            )}
            {onNavigateHome && (
              <button
                type="button"
                onClick={onNavigateHome}
                style={{
                  backgroundColor: 'transparent',
                  color: 'var(--text-2)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  padding: '10px 20px',
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: 'pointer',
                  lineHeight: 1,
                }}
              >
                홈으로
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
