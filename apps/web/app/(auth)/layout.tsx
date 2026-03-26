import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'MarkFlow KMS - 인증',
  description: '팀 지식 관리 플랫폼',
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg)',
        padding: '24px',
      }}
    >
      {children}
    </div>
  );
}
