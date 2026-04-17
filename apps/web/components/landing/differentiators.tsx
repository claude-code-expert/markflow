type Point = {
  title: string;
  desc: string;
};

const points: Point[] = [
  {
    title: '마크다운 그대로, 협업까지',
    desc: '평범한 .md 파일처럼 가볍게 적되, 워크스페이스에서 팀과 함께 편집·공유할 수 있습니다.',
  },
  {
    title: '운영 방식을 직접 선택',
    desc: 'SaaS 클라우드 또는 사내 서버 온프레미스 — 보안 요구와 예산에 맞춰 자유롭게 고르세요.',
  },
  {
    title: '언제든 옮길 수 있는 표준 포맷',
    desc: '모든 문서는 표준 마크다운으로 저장됩니다. 가져오기·내보내기가 자유로워 락인 걱정이 없습니다.',
  },
];

export function Differentiators() {
  return (
    <section className="bg-white py-20 px-8 border-y border-[#E2E0D8]">
      <div className="max-w-[1100px] mx-auto">
        <div className="text-xs font-semibold tracking-[0.1em] uppercase text-[#1A56DB] text-center mb-3">
          Why MarkFlow
        </div>
        <h2 className="font-[var(--font-sora)] text-4xl font-bold tracking-tight text-[#1A1916] text-center mb-12 leading-[1.2]">
          MarkFlow가 다른 점
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {points.map((p, idx) => (
            <div
              key={p.title}
              className="p-7 rounded-[14px] bg-[#F8F7F4] border border-[#E2E0D8]"
            >
              <div className="text-[13px] font-bold text-[#1A56DB] mb-3 tracking-wider">
                {String(idx + 1).padStart(2, '0')}
              </div>
              <div className="font-[var(--font-sora)] text-[17px] font-semibold mb-2.5 text-[#1A1916]">
                {p.title}
              </div>
              <div className="text-[14px] text-[#57564F] leading-relaxed">
                {p.desc}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
