import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '로그인',
  description: 'MarkFlow에 로그인하여 팀 지식을 관리하세요.',
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
