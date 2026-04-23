import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '비밀번호 재설정',
  description: '새로운 비밀번호를 설정하여 MarkFlow 계정에 다시 접근하세요.',
};

export default function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
