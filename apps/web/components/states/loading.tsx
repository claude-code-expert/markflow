const shimmerKeyframes = `
@keyframes shimmer {
  0% { opacity: 0.6 }
  50% { opacity: 1 }
  100% { opacity: 0.6 }
}
`;

interface SkeletonProps {
  width?: string;
  height?: string;
  borderRadius?: string;
}

export function Skeleton({
  width = '100%',
  height = '16px',
  borderRadius = 'var(--radius-sm)',
}: SkeletonProps) {
  return (
    <>
      <style>{shimmerKeyframes}</style>
      <div
        style={{
          width,
          height,
          borderRadius,
          background: 'var(--surface-2)',
          animation: 'shimmer 1.5s ease-in-out infinite',
        }}
      />
    </>
  );
}

export function WorkspaceListSkeleton() {
  return (
    <>
      <style>{shimmerKeyframes}</style>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {Array.from({ length: 3 }, (_, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--surface-2)',
                flexShrink: 0,
                animation: 'shimmer 1.5s ease-in-out infinite',
              }}
            />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div
                style={{
                  width: `${60 + i * 15}%`,
                  height: '16px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--surface-2)',
                  animation: 'shimmer 1.5s ease-in-out infinite',
                }}
              />
              <div
                style={{
                  width: `${40 + i * 10}%`,
                  height: '12px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--surface-2)',
                  animation: 'shimmer 1.5s ease-in-out infinite',
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export function DocumentListSkeleton() {
  return (
    <>
      <style>{shimmerKeyframes}</style>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {Array.from({ length: 5 }, (_, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '8px 12px',
            }}
          >
            <div
              style={{
                width: '20px',
                height: '20px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--surface-2)',
                flexShrink: 0,
                animation: 'shimmer 1.5s ease-in-out infinite',
              }}
            />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div
                style={{
                  width: `${50 + ((i * 17) % 40)}%`,
                  height: '14px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--surface-2)',
                  animation: 'shimmer 1.5s ease-in-out infinite',
                }}
              />
              <div
                style={{
                  width: `${30 + ((i * 13) % 25)}%`,
                  height: '10px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--surface-2)',
                  animation: 'shimmer 1.5s ease-in-out infinite',
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export function EditorSkeleton() {
  return (
    <>
      <style>{shimmerKeyframes}</style>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%' }}>
        {/* Title bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 0',
          }}
        >
          <div
            style={{
              width: '45%',
              height: '28px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--surface-2)',
              animation: 'shimmer 1.5s ease-in-out infinite',
            }}
          />
        </div>
        {/* Content area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div
            style={{
              width: '90%',
              height: '14px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--surface-2)',
              animation: 'shimmer 1.5s ease-in-out infinite',
            }}
          />
          <div
            style={{
              width: '75%',
              height: '14px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--surface-2)',
              animation: 'shimmer 1.5s ease-in-out infinite',
            }}
          />
          <div
            style={{
              width: '85%',
              height: '14px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--surface-2)',
              animation: 'shimmer 1.5s ease-in-out infinite',
            }}
          />
          <div
            style={{
              width: '60%',
              height: '14px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--surface-2)',
              animation: 'shimmer 1.5s ease-in-out infinite',
            }}
          />
          <div
            style={{
              width: '80%',
              height: '14px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--surface-2)',
              animation: 'shimmer 1.5s ease-in-out infinite',
            }}
          />
          <div
            style={{
              width: '70%',
              height: '14px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--surface-2)',
              animation: 'shimmer 1.5s ease-in-out infinite',
            }}
          />
        </div>
      </div>
    </>
  );
}
