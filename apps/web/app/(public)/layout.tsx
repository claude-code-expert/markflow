import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'MarkFlow — 마크다운 기반 팀 지식 관리 플랫폼',
  description:
    '문서 작성, 카테고리 구조화, 실시간 미리보기, 문서 그래프 시각화를 한곳에서. 마크다운으로 시작하는 스마트한 팀 지식 관리.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'MarkFlow — 마크다운 기반 팀 지식 관리 플랫폼',
    description: '문서 작성, 카테고리 구조화, 실시간 미리보기, 문서 그래프 시각화를 한곳에서.',
    url: '/',
    type: 'website',
  },
};

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
