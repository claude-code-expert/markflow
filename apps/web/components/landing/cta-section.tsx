import Link from 'next/link';

export function CTASection() {
  return (
    <section className="bg-[#1A1916] py-20 px-8">
      <div className="max-w-[720px] mx-auto text-center">
        <h2 className="font-[var(--font-sora)] text-[clamp(30px,4vw,44px)] font-bold tracking-tight text-white mb-5 leading-[1.2]">
          시작할 준비 되셨나요?
        </h2>
        <p className="text-[16px] text-white/70 mb-9 leading-relaxed">
          지금 바로 시작하세요.
          <br className="sm:hidden" />
          온프레이미스 설치가 필요하다면 brewnet.dev@gmail.com으로 문의해주세요. 
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/register"
            className="px-7 py-3.5 bg-white text-[#1A1916] text-[15px] font-semibold rounded-[10px] shadow-md hover:bg-[#F1F0EC] transition-colors"
          >
            무료로 시작하기
          </Link>
          <Link
            href="#features"
            className="px-7 py-3.5 bg-transparent text-white text-[15px] font-medium rounded-[10px] border-[1.5px] border-white/25 hover:bg-white/10 transition-colors"
          >
            기능 다시 보기
          </Link>
        </div>
      </div>
    </section>
  );
}
