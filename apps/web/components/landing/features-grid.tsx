import type { ReactNode } from 'react';

type Feature = {
  icon: ReactNode;
  bg: string;
  fg: string;
  title: string;
  desc: string;
  badge?: 'PRO';
};

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-[22px] h-[22px]"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const features: Feature[] = [
  {
    bg: 'bg-[#EEF3FF]',
    fg: 'text-[#1A56DB]',
    title: '보면서 편집하는 에디터',
    desc: '왼쪽에서 마크다운을 입력하면 오른쪽에 결과가 바로 보입니다. 표·체크리스트·수식·코드 강조까지 그대로 표시되고, 양쪽 화면이 함께 스크롤되어 긴 문서도 편합니다.',
    icon: (
      <Icon>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="6" y1="9" x2="9" y2="9" />
        <line x1="6" y1="12" x2="9" y2="12" />
        <line x1="6" y1="15" x2="8" y2="15" />
        <line x1="15" y1="9" x2="18" y2="9" />
        <line x1="15" y1="12" x2="18" y2="12" />
        <line x1="15" y1="15" x2="17" y2="15" />
      </Icon>
    ),
  },
  {
    bg: 'bg-[#F0FDFA]',
    fg: 'text-[#0D9488]',
    title: '문서 연결',
    desc: '[[문서명]]을 적는 것만으로 다른 문서를 간편하게 참조합니다. 문서 간 연결이 자동으로 지식 그래프로 시각화되고, 이전·다음 문서로 이동도 가능합니다.',
    icon: (
      <Icon>
        <path d="M10 14l4-4" />
        <path d="M13.5 6.5l2-2a4 4 0 0 1 5.66 5.66l-2 2a4 4 0 0 1-5.66 0" />
        <path d="M10.5 17.5l-2 2a4 4 0 0 1-5.66-5.66l2-2a4 4 0 0 1 5.66 0" />
      </Icon>
    ),
  },
  {
    bg: 'bg-[#FEF3C7]',
    fg: 'text-[#B45309]',
    title: '팀 워크스페이스',
    desc: '팀과 프로젝트를 워크스페이스 단위로 나누어 관리합니다. 각 워크스페이스 안에서 카테고리로 문서를 체계적으로 정리하세요.',
    icon: (
      <Icon>
        <rect x="3" y="3" width="7.5" height="7.5" rx="1.5" />
        <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" />
        <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" />
        <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" />
      </Icon>
    ),
  },
  {
    bg: 'bg-[#F0FDF4]',
    fg: 'text-[#15803D]',
    title: '프리젠테이션 모드',
    desc: '작성한 마크다운을 그대로 슬라이드로 변환해 발표할 수 있습니다. 별도로 다시 꾸밀 필요 없이 문서 한 벌로 문서와 발표 자료를 동시에 만듭니다.',
    icon: (
      <Icon>
        <rect x="3" y="4" width="18" height="12" rx="1.5" />
        <line x1="8" y1="20" x2="16" y2="20" />
        <line x1="12" y1="16" x2="12" y2="20" />
        <path d="M7 12 L10 9 L12.5 11.5 L17 7" />
      </Icon>
    ),
  },
  {
    bg: 'bg-[#FFF7ED]',
    fg: 'text-[#C2410C]',
    title: '테마 커스터마이징',
    desc: '미리 준비된 5가지 프리셋 테마 중에서 고르거나, 직접 색상·글꼴을 수정해 워크스페이스를 원하는 모습으로 꾸밀 수 있습니다.',
    icon: (
      <Icon>
        <path d="M12 3c-5 0-9 4-9 9s4 9 9 9c1.4 0 2.2-1 2.2-2.2 0-.6-.3-1.2-.7-1.6-.4-.4-.7-1-.7-1.6 0-1.3 1-2.4 2.4-2.4H16.5c2.5 0 4.5-2 4.5-4.5C21 6.4 17 3 12 3z" />
        <circle cx="7.5" cy="10.5" r="1" fill="currentColor" stroke="none" />
        <circle cx="10" cy="7" r="1" fill="currentColor" stroke="none" />
        <circle cx="14" cy="7" r="1" fill="currentColor" stroke="none" />
        <circle cx="16.5" cy="10.5" r="1" fill="currentColor" stroke="none" />
      </Icon>
    ),
  },
  {
    bg: 'bg-[#FFFBEB]',
    fg: 'text-[#A16207]',
    title: '가져오기·내보내기',
    desc: 'Markdown·HTML·PDF 형식으로 문서를 자유롭게 주고받습니다. 다른 도구로 옮기거나 외부 자료를 끌어오는 데 제약이 없습니다. (PDF는 Pro)',
    icon: (
      <Icon>
        <line x1="4" y1="8" x2="16" y2="8" />
        <polyline points="13,5 16,8 13,11" />
        <line x1="20" y1="16" x2="8" y2="16" />
        <polyline points="11,13 8,16 11,19" />
      </Icon>
    ),
  },
  {
    bg: 'bg-[#F5F3FF]',
    fg: 'text-[#7C3AED]',
    title: '실시간 공동 편집',
    desc: '같은 문서를 여러 명이 동시에 편집할 수 있습니다. 다른 사람의 커서가 실시간으로 보이고, 충돌 없이 자연스럽게 내용이 합쳐집니다.',
    badge: 'PRO',
    icon: (
      <Icon>
        <circle cx="9" cy="8" r="3.2" />
        <path d="M3 20c0-3.3 2.7-5.8 6-5.8s6 2.5 6 5.8" />
        <circle cx="17" cy="9.5" r="2.3" />
        <path d="M15.5 20c0-2.2 1.5-3.8 3-3.8s2.5 1.2 2.5 3.8" />
      </Icon>
    ),
  },
  {
    bg: 'bg-[#FDF2F8]',
    fg: 'text-[#BE185D]',
    title: '링크 AI 요약',
    desc: '문서에 붙여넣은 외부 웹페이지 링크를 AI가 자동으로 분석해 핵심 내용을 요약해 줍니다. 링크만 넣으면 요점이 바로 정리됩니다.',
    badge: 'PRO',
    icon: (
      <Icon>
        <path d="M10 4 L11 7.5 L14.5 8.5 L11 9.5 L10 13 L9 9.5 L5.5 8.5 L9 7.5 Z" />
        <path d="M18 3 L18.6 4.5 L20.1 5.1 L18.6 5.7 L18 7.2 L17.4 5.7 L15.9 5.1 L17.4 4.5 Z" />
        <path d="M18.5 15 L19.1 16.6 L20.7 17.2 L19.1 17.8 L18.5 19.4 L17.9 17.8 L16.3 17.2 L17.9 16.6 Z" />
      </Icon>
    ),
  },
  {
    bg: 'bg-[#F1F5F9]',
    fg: 'text-[#334155]',
    title: '온프레미스 설치',
    desc: '회사 내부 서버에 직접 설치해 모든 데이터를 외부로 내보내지 않고 사용할 수 있습니다. 보안·컴플라이언스가 까다로운 조직에 적합합니다.',
    badge: 'PRO',
    icon: (
      <Icon>
        <rect x="3" y="4" width="18" height="7" rx="1.5" />
        <rect x="3" y="13" width="18" height="7" rx="1.5" />
        <circle cx="7" cy="7.5" r="0.6" fill="currentColor" stroke="none" />
        <circle cx="9.5" cy="7.5" r="0.6" fill="currentColor" stroke="none" />
        <circle cx="7" cy="16.5" r="0.6" fill="currentColor" stroke="none" />
        <circle cx="9.5" cy="16.5" r="0.6" fill="currentColor" stroke="none" />
        <line x1="17" y1="7.5" x2="19" y2="7.5" />
        <line x1="17" y1="16.5" x2="19" y2="16.5" />
      </Icon>
    ),
  },
];

export function FeaturesGrid() {
  return (
    <section id="features" className="bg-white border-y border-[#E2E0D8] py-20 px-8">
      <div className="max-w-[1100px] mx-auto">
        <div className="text-xs font-semibold tracking-[0.1em] uppercase text-[#1A56DB] mb-3">
          Core Features
        </div>
        <h2 className="font-[var(--font-sora)] text-4xl font-bold tracking-tight text-[#1A1916] mb-12 max-w-[480px] leading-[1.2]">
          마크다운을 팀의 언어로
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              data-testid="feature-card"
              className="p-6 rounded-[14px] border border-[#E2E0D8] bg-[#F8F7F4] transition-all hover:bg-white hover:shadow-md hover:-translate-y-0.5"
            >
              <div className="flex items-start justify-between mb-3.5">
                <div
                  className={`w-[42px] h-[42px] rounded-[10px] flex items-center justify-center ${f.bg} ${f.fg}`}
                >
                  {f.icon}
                </div>
                {f.badge === 'PRO' && (
                  <span className="text-[10px] font-bold tracking-[0.08em] px-2 py-0.5 rounded-md bg-gradient-to-r from-[#1A56DB] to-[#7C3AED] text-white">
                    PRO
                  </span>
                )}
              </div>
              <div className="font-[var(--font-sora)] text-[15px] font-semibold mb-2 text-[#1A1916]">
                {f.title}
              </div>
              <div className="text-[13.5px] text-[#57564F] leading-relaxed">
                {f.desc}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
