import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '회원가입',
  description: 'MarkFlow 계정을 만들고 팀 지식 관리를 시작하세요.',
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
