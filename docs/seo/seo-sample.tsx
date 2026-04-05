import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '효율적인 이슈 트래킹을 위한 Tika 활용 가이드 | Tika Wiki', // 키워드 전진 배치
  description:
    'Tika의 Kanban 보드와 BACKLOG, TODO 기능을 활용하여 협업 효율을 극대화하는 방법을 알아보세요. 단순하게 계획하고 대담하게 실행하세요.', // CTA 포함
  alternates: {
    canonical: 'https://tika.app/wiki/guide-to-issue-tracking', // 중복 콘텐츠 방지
  },
  openGraph: {
    title: 'Tika로 시작하는 스마트한 이슈 관리',
    description: 'Plan Simply. Ship Boldly. Tika가 제안하는 프로젝트 관리 표준.',
    url: 'https://tika.app/wiki/guide-to-issue-tracking',
    siteName: 'Tika',
    images: [
      {
        url: 'https://tika.app/og-image-wiki.png', // SNS 공유 시 클릭률 최적화
        width: 1200,
        height: 630,
        alt: 'Tika 서비스 로고 및 가이드 요약 이미지',
      },
    ],
    locale: 'ko_KR',
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tika 이슈 트래킹 가이드',
    description: '단순한 계획, 대담한 실행. Tika의 핵심 기능을 확인하세요.',
    images: ['https://tika.app/og-image-wiki.png'],
  },
};
