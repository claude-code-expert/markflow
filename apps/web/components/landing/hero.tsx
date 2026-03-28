import Link from 'next/link';

export function Hero() {
  return (
    <section className="max-w-[1100px] mx-auto px-8 pt-20 pb-[70px] flex flex-col items-center text-center">
      <div className="inline-flex items-center gap-2 bg-[#EEF3FF] text-[#1343B0] px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wide mb-6">
        <span>✦</span> AI 시대의 마크다운 워크플로우
      </div>

      <h1 className="font-[var(--font-sora)] text-[clamp(38px,5vw,58px)] font-bold leading-[1.12] tracking-tight text-[#1A1916] max-w-[720px] mb-5">
        Write in <em className="not-italic text-[#1A56DB]">Markdown</em>.<br />
        Think in context.
      </h1>

      <p className="text-lg text-[#57564F] max-w-[540px] leading-relaxed mb-9">
        팀의 지식을 마크다운으로 작성하고, 태그로 연결하고, 어디에서나 임베드하세요.
        MarkFlow는 마크다운 중심의 팀 지식 관리 플랫폼입니다.
      </p>

      <div className="flex items-center gap-3.5 mb-[60px]">
        <Link
          href="/register"
          className="px-6 py-3 bg-[#1A56DB] text-white text-[15px] font-medium rounded-[10px] shadow-md hover:bg-[#1343B0] transition-colors"
        >
          ✦ &nbsp;Start for free
        </Link>
        <Link
          href="/login"
          className="px-6 py-3 bg-white text-[#57564F] text-[15px] font-medium rounded-[10px] border-[1.5px] border-[#CBC9C0] hover:bg-[#F1F0EC] hover:text-[#1A1916] transition-colors"
        >
          View demo →
        </Link>
      </div>

      {/* Editor Preview Mockup */}
      <div className="w-full max-w-[980px] bg-white rounded-[18px] border border-[#E2E0D8] shadow-xl overflow-hidden">
        <div className="h-11 bg-[#F1F0EC] border-b border-[#E2E0D8] flex items-center px-4 gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
          <div className="flex-1 bg-[#E8E7E1] h-6 rounded ml-3" />
        </div>
        <div className="flex h-[420px]">
          {/* Sidebar */}
          <div className="w-[220px] border-r border-[#E2E0D8] p-4">
            <div className="text-[11px] font-semibold text-[#9A9890] tracking-wider uppercase mb-2.5">My Notes</div>
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-[#EEF3FF] text-[#1A56DB] text-xs font-medium">
              <span>📄</span> Getting Started
            </div>
            <div className="flex items-center gap-2 px-2 py-1.5 pl-7 text-[#57564F] text-xs">
              <span>📄</span> Architecture
            </div>
            <div className="flex items-center gap-2 px-2 py-1.5 pl-7 text-[#57564F] text-xs">
              <span>📄</span> API Reference
            </div>
            <div className="flex items-center gap-2 px-2 py-1.5 text-[#57564F] text-xs">
              <span>📁</span> Design System
            </div>
            <div className="flex items-center gap-2 px-2 py-1.5 text-[#57564F] text-xs">
              <span>📁</span> Meetings
            </div>
          </div>
          {/* Editor Pane */}
          <div className="flex-1 p-5 bg-[#F8F7F4] font-mono text-[13px] text-[#57564F] leading-[1.8] overflow-hidden">
            <span className="text-[#7C3AED]"># Getting Started with MarkFlow</span><br /><br />
            <span className="text-[#0D9488]">## Overview</span><br /><br />
            MarkFlow is a <span className="text-[#1A56DB]">**markdown-first**</span> knowledge<br />
            management platform for teams.<br /><br />
            <span className="text-[#0D9488]">## Key Features</span><br /><br />
            - <span className="text-[#D97706]">[[Dual Editor]]</span> with live preview<br />
            - Real-time collaboration<br />
            - CSS theme per workspace<br />
            - Embed anywhere with NPM/iframe
          </div>
          {/* Preview Pane */}
          <div className="flex-1 p-5 border-l border-[#E2E0D8]">
            <div className="font-[var(--font-sora)] text-[22px] font-bold text-[#1A1916] mb-3">Getting Started with MarkFlow</div>
            <div className="text-base font-semibold text-[#1A1916] mb-2">Overview</div>
            <p className="text-[13px] text-[#57564F] leading-relaxed mb-3">MarkFlow is a <strong>markdown-first</strong> knowledge management platform for teams.</p>
            <div className="text-base font-semibold text-[#1A1916] mb-2">Key Features</div>
            <ul className="text-[13px] text-[#57564F] leading-[2] pl-[18px] list-disc">
              <li>Dual Editor with live preview</li>
              <li>Real-time collaboration</li>
              <li>CSS theme per workspace</li>
              <li>Embed anywhere</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
