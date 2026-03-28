import Link from 'next/link';

export function NavBar() {
  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between px-8 h-[62px] bg-[#F8F7F4]/90 backdrop-blur-xl border-b border-[#E2E0D8]">
      <Link href="/" className="flex items-center gap-2 font-[var(--font-sora)] text-xl font-bold text-[#1A1916]">
        <span className="w-7 h-7 bg-[#1A56DB] rounded-[7px] flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round">
            <polyline points="2,12 5,6 8,14 11,2 14,8" />
          </svg>
        </span>
        MarkFlow
      </Link>

      <div className="flex items-center gap-1">
        <Link href="#features" className="px-3.5 py-2 rounded-md text-sm font-medium text-[#57564F] hover:bg-[#F1F0EC] hover:text-[#1A1916] transition-colors">
          Features
        </Link>
        <Link href="#pricing" className="px-3.5 py-2 rounded-md text-sm font-medium text-[#57564F] hover:bg-[#F1F0EC] hover:text-[#1A1916] transition-colors">
          Pricing
        </Link>
      </div>

      <div className="flex items-center gap-2.5">
        <Link href="/login" className="px-3.5 py-2 text-sm font-medium text-[#57564F] hover:bg-[#F1F0EC] rounded-md transition-colors">
          Sign in
        </Link>
        <Link
          href="/register"
          className="px-4 py-2.5 bg-[#1A56DB] text-white text-sm font-medium rounded-md shadow-sm hover:bg-[#1343B0] transition-colors"
        >
          Get started free
        </Link>
      </div>
    </nav>
  );
}
