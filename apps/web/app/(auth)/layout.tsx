import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    template: '%s | MarkFlow',
    default: '인증 | MarkFlow',
  },
  description: 'MarkFlow 계정으로 팀 지식을 관리하세요.',
  robots: { index: false, follow: false },
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
