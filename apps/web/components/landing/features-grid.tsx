const features = [
  {
    icon: '✏️',
    color: 'bg-[#EEF3FF]',
    title: 'Dual-Pane Editor',
    desc: 'CodeMirror 6 기반의 소스 편집과 실시간 렌더링 프리뷰. CommonMark + GFM + KaTeX 지원. 스크롤 동기화.',
  },
  {
    icon: '🔗',
    color: 'bg-[#F0FDFA]',
    title: 'Document Linking',
    desc: '문서 간 연관 관계, Prev/Next 네비게이션, 위키링크([[문서명]]) 구문으로 지식 그래프 구성.',
  },
  {
    icon: '👥',
    color: 'bg-[#F5F3FF]',
    title: 'Real-time Collab',
    desc: 'Yjs CRDT 기반 최대 30인 동시 편집. 원격 커서, 인라인 댓글, 스레드형 토론 지원.',
  },
  {
    icon: '🎨',
    color: 'bg-[#F0FDF4]',
    title: 'CSS Theme System',
    desc: '워크스페이스 단위 CSS 커스터마이징. 5가지 프리셋 + CodeMirror 기반 직접 편집. CSS 변수 오버라이드.',
  },
  {
    icon: '📦',
    color: 'bg-[#FFFBEB]',
    title: 'Embed Anywhere',
    desc: 'NPM 패키지(@markflow/editor) · iframe + Guest Token · REST API 세 가지 방식으로 어떤 프로젝트에도 통합.',
  },
  {
    icon: '📥',
    color: 'bg-[#FFF1F2]',
    title: 'Import / Export',
    desc: '.md · .zip · HTML · PDF 완전 지원. 폴더 구조 보존 ZIP 내보내기. Puppeteer 기반 서버사이드 PDF.',
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              data-testid="feature-card"
              className="p-6 rounded-[14px] border border-[#E2E0D8] bg-[#F8F7F4] transition-all hover:bg-white hover:shadow-md hover:-translate-y-0.5"
            >
              <div className={`w-[42px] h-[42px] rounded-[10px] flex items-center justify-center mb-3.5 text-lg ${f.color}`}>
                {f.icon}
              </div>
              <div className="font-[var(--font-sora)] text-[15px] font-semibold mb-2">{f.title}</div>
              <div className="text-[13.5px] text-[#57564F] leading-relaxed">{f.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
