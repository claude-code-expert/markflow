const footerLinks = [
  {
    title: 'Product',
    links: ['Features', 'Pricing', 'Changelog'],
  },
  {
    title: 'Developer',
    links: ['Docs', 'API Reference', 'NPM Package'],
  },
  {
    title: 'Company',
    links: ['About', 'Blog', 'Privacy'],
  },
];

export function Footer() {
  return (
    <footer className="bg-[#1A1916] text-white/70 py-12 px-8">
      <div className="max-w-[1100px] mx-auto">
        <div className="flex flex-col md:flex-row justify-between mb-10 gap-8">
          <div>
            <div className="font-[var(--font-sora)] text-lg font-bold text-white mb-2.5">MarkFlow</div>
            <p className="text-[13px] max-w-[260px] leading-relaxed">
              마크다운이 곧 AI 시대의 표준 문서 형식입니다. MarkFlow는 그 중심에 있습니다.
            </p>
          </div>
          {footerLinks.map((section) => (
            <div key={section.title}>
              <h4 className="text-white/90 text-[13px] font-semibold mb-3">{section.title}</h4>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link}>
                    <span className="text-[13px] text-white/60 hover:text-white cursor-pointer transition-colors">
                      {link}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
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
