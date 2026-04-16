import { MarkFlowLogo } from '../mark-flow-logo';

export function Footer() {
  return (
    <footer className="bg-[#1A1916] text-white/70 py-12 px-8" role="contentinfo">
      <div className="max-w-[1100px] mx-auto">
        <div className="mb-10">
          <div className="mb-2.5"><MarkFlowLogo height={22} dark /></div>
          <p className="text-[13px] max-w-[260px] leading-relaxed">
            마크다운이 곧 AI 시대의 표준 문서 형식입니다. MarkFlow는 그 중심에 있습니다.
          </p>
        </div>
        <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row justify-between items-center text-xs">
          <span>&copy; 2026 MarkFlow. All rights reserved.</span>
          <span className="font-[var(--font-sora)] text-[13px] text-white/40 mt-2 sm:mt-0">
            The markdown layer for every team and product
          </span>
        </div>
      </div>
    </footer>
  );
}
