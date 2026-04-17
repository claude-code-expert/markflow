type Item = {
  q: string;
  a: string;
};

const items: Item[] = [
  {
    q: '무료로 어디까지 사용할 수 있나요?',
    a: '개인과 소규모 팀(최대 5명)은 마크다운 편집·문서 연결·테마 커스터마이징·가져오기 내보내기 등 핵심 기능을 무료로 사용할 수 있습니다. 실시간 공동 편집, 링크 AI 요약, 온프레미스 설치, PDF 내보내기는 Pro 플랜에서 제공됩니다.',
  },
  {
    q: '제 데이터는 어디에 저장되나요?',
    a: '클라우드(SaaS)로 사용하실 경우 한국 리전 서버에 저장되며, 모든 데이터는 전송·저장 시 암호화됩니다. 온프레미스 설치 시에는 회사 내부 서버에서만 데이터가 처리되므로 외부로 어떤 정보도 전송되지 않습니다.',
  },
  {
    q: '다른 도구에서 문서를 옮겨올 수 있나요?',
    a: '네. Markdown(.md), HTML, PDF 형식의 가져오기를 지원하며, 폴더 구조도 보존됩니다. 노션·옵시디언·이전 위키 도구에서 손실 없이 이전할 수 있습니다.',
  },
  {
    q: '언제든 해지할 수 있나요?',
    a: '약정 없이 월 단위로 사용하시며 언제든 해지 가능합니다. 해지 시에도 모든 문서를 마크다운·HTML 형식으로 내려받아 보관할 수 있어 데이터 락인이 없습니다.',
  },
  {
    q: '온프레미스 설치는 어떻게 진행되나요?',
    a: '하단 "문의하기"를 통해 연락 주시면 사내 환경 진단 후 설치 가이드와 라이선스를 안내해드립니다. 일반적으로 Docker 기반으로 1일 이내 설치가 가능합니다.',
  },
];

export function FAQ() {
  return (
    <section id="faq" className="bg-[#F8F7F4] py-20 px-8">
      <div className="max-w-[820px] mx-auto">
        <div className="text-xs font-semibold tracking-[0.1em] uppercase text-[#1A56DB] text-center mb-3">
          FAQ
        </div>
        <h2 className="font-[var(--font-sora)] text-4xl font-bold tracking-tight text-[#1A1916] text-center mb-12 leading-[1.2]">
          자주 묻는 질문
        </h2>
        <div className="space-y-3">
          {items.map((item) => (
            <details
              key={item.q}
              className="group rounded-[12px] bg-white border border-[#E2E0D8] open:shadow-sm transition-shadow"
            >
              <summary className="flex items-center justify-between px-5 py-4 cursor-pointer list-none font-[var(--font-sora)] text-[15px] font-semibold text-[#1A1916] hover:text-[#1A56DB]">
                <span>{item.q}</span>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-4 h-4 shrink-0 transition-transform group-open:rotate-180 text-[#9A9890]"
                  aria-hidden="true"
                >
                  <polyline points="6,9 12,15 18,9" />
                </svg>
              </summary>
              <div className="px-5 pb-5 -mt-1 text-[14px] text-[#57564F] leading-relaxed">
                {item.a}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
