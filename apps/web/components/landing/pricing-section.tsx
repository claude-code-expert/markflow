import Link from 'next/link';

const plans = [
  {
    name: 'Free',
    price: '$0',
    sub: '개인 사용자 / 소규모 팀',
    features: ['Root 워크스페이스 1개', '팀원 최대 5명', '저장공간 1GB', '버전 히스토리 20개', 'NPM 패키지 임베드'],
    cta: '시작하기',
    featured: false,
  },
  {
    name: 'Team',
    price: '$12',
    priceSub: '/멤버/월',
    sub: '성장하는 팀에 최적',
    features: [
      '워크스페이스 무제한', '팀원 무제한', '저장공간 50GB',
      '버전 히스토리 100개 + diff', '실시간 공동편집 (Yjs)',
      'CSS 테마 커스터마이징', 'Guest Token + iframe 임베드',
    ],
    cta: '팀 플랜 시작',
    featured: true,
  },
  {
    name: 'Enterprise',
    price: '문의',
    sub: '대규모 조직 / 보안 요건',
    features: [
      '모든 Team 기능 포함', 'SSO / SAML', '저장공간 무제한',
      '커스텀 도메인 공개 페이지', 'AI 글쓰기 보조 (Claude API)', 'SLA 보장 · 전담 지원',
    ],
    cta: '영업팀 문의',
    featured: false,
  },
];

export function PricingSection() {
  return (
    <section id="pricing" className="py-20 px-8 max-w-[1100px] mx-auto">
      <div className="text-xs font-semibold tracking-[0.1em] uppercase text-[#1A56DB] text-center mb-3">
        Pricing
      </div>
      <h2 className="font-[var(--font-sora)] text-4xl font-bold tracking-tight text-[#1A1916] text-center mb-10 mx-auto">
        합리적인 팀 요금제
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`relative bg-white border rounded-[18px] p-7 ${
              plan.featured
                ? 'border-[#1A56DB] shadow-[0_0_0_1px_#1A56DB]'
                : 'border-[#E2E0D8]'
            }`}
          >
            {plan.featured && (
              <span className="absolute -top-[11px] left-6 bg-[#1A56DB] text-white px-3 py-0.5 rounded-full text-[11px] font-semibold">
                Most Popular
              </span>
            )}
            <div className="font-[var(--font-sora)] text-sm font-semibold text-[#57564F] mb-2">{plan.name}</div>
            <div className="font-[var(--font-sora)] text-4xl font-bold text-[#1A1916] leading-none mb-1">
              {plan.price}
              {plan.priceSub && <sub className="text-sm text-[#57564F] font-normal ml-0.5">{plan.priceSub}</sub>}
            </div>
            <p className="text-xs text-[#9A9890] mt-1.5">{plan.sub}</p>

            <ul className="my-5 space-y-1">
              {plan.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-[13.5px] text-[#57564F] py-1">
                  <span className="text-[#16A34A] font-bold shrink-0">✓</span>
                  {f}
                </li>
              ))}
            </ul>

            <Link
              href="/register"
              className={`block w-full text-center py-2.5 rounded-md text-sm font-medium transition-colors ${
                plan.featured
                  ? 'bg-[#1A56DB] text-white hover:bg-[#1343B0]'
                  : 'bg-white text-[#57564F] border-[1.5px] border-[#CBC9C0] hover:bg-[#F1F0EC]'
              }`}
            >
              {plan.cta}
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
