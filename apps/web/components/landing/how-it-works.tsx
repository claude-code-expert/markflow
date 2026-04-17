type Step = {
  num: string;
  title: string;
  desc: string;
};

const steps: Step[] = [
  {
    num: '01',
    title: '회원가입',
    desc: '이메일로 30초 만에 계정을 만듭니다. 신용카드 등록도 필요 없습니다.',
  },
  {
    num: '02',
    title: '워크스페이스 생성',
    desc: '팀과 프로젝트 단위로 작업 공간을 나누고, 함께할 멤버를 초대합니다.',
  },
  {
    num: '03',
    title: '첫 문서 작성',
    desc: '익숙한 마크다운으로 적으면 곧바로 다듬어진 문서가 됩니다. 이제 시작하세요.',
  },
];

export function HowItWorks() {
  return (
    <section className="bg-[#F8F7F4] py-20 px-8">
      <div className="max-w-[1100px] mx-auto">
        <div className="text-xs font-semibold tracking-[0.1em] uppercase text-[#15803D] text-center mb-3">
          How It Works
        </div>
        <h2 className="font-[var(--font-sora)] text-4xl font-bold tracking-tight text-[#1A1916] text-center mb-12 leading-[1.2]">
          3단계로 시작하기
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          {steps.map((s, idx) => (
            <div key={s.num} className="relative">
              <div className="p-7 rounded-[14px] bg-white border border-[#E2E0D8] h-full">
                <div className="font-[var(--font-sora)] text-[42px] font-bold text-[#1A56DB]/15 leading-none mb-4">
                  {s.num}
                </div>
                <div className="font-[var(--font-sora)] text-[18px] font-semibold mb-2.5 text-[#1A1916]">
                  {s.title}
                </div>
                <div className="text-[14px] text-[#57564F] leading-relaxed">
                  {s.desc}
                </div>
              </div>
              {idx < steps.length - 1 && (
                <div className="hidden md:flex absolute top-1/2 -right-[14px] -translate-y-1/2 items-center justify-center w-7 h-7 rounded-full bg-white border border-[#E2E0D8] text-[#1A56DB] z-10">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-3.5 h-3.5"
                    aria-hidden="true"
                  >
                    <path d="M5 12h14" />
                    <path d="M13 6l6 6-6 6" />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
