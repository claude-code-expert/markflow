import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '비밀번호 찾기',
  description: 'MarkFlow 계정의 비밀번호를 재설정합니다.',
};

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
