import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '이메일 인증',
  description: '이메일 주소를 인증하여 MarkFlow 계정을 활성화하세요.',
};

export default function VerifyEmailLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
