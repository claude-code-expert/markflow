type Point = {
  title: string;
  desc: string;
};

const points: Point[] = [
  {
    title: '여기저기 흩어진 문서',
    desc: '노션·위키·구글 독스·슬랙에 문서가 흩어져 있어 무엇이 최신인지, 어디서 찾아야 할지 헷갈립니다.',
  },
  {
    title: '무거운 도구, 잃어버린 가벼움',
    desc: '마크다운으로 빠르게 적고 싶은데, 일반 협업 도구는 너무 무겁고 복잡해서 진입 장벽이 높습니다.',
  },
  {
    title: '데이터 락인의 부담',
    desc: 'SaaS에 모든 지식을 맡기면 다른 도구로 옮기기 어렵고, 사내 보안 요건을 맞추기도 까다롭습니다.',
  },
];

export function PainPoints() {
  return (
    <section className="bg-[#F8F7F4] py-20 px-8">
      <div className="max-w-[1100px] mx-auto">
        <div className="text-xs font-semibold tracking-[0.1em] uppercase text-[#BE123C] text-center mb-3">
          The Problem
        </div>
        <h2 className="font-[var(--font-sora)] text-4xl font-bold tracking-tight text-[#1A1916] text-center mb-12 leading-[1.2]">
          팀의 마크다운 작업,
          <br />이런 점이 답답하지 않으셨나요?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {points.map((p) => (
            <div
              key={p.title}
              className="p-6 rounded-[14px] bg-white border border-[#E2E0D8]"
            >
              <div className="font-[var(--font-sora)] text-[16px] font-semibold mb-2 text-[#1A1916]">
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
