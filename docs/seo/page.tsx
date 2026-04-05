import Image from 'next/image';
import Script from 'next/script';

export default function WikiPage() {
  // 1. 구조화 데이터 (Schema.org)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: '효율적인 이슈 트래킹을 위한 Tika 활용 가이드',
    description: 'Tika의 4단계 칸반 보드 시스템을 활용한 프로젝트 관리 방법론 설명',
    image: 'https://tika.app/og-image-wiki.png',
    author: {
      '@type': 'Organization',
      name: 'Tika Team',
    },
    datePublished: '2026-04-05',
    publisher: {
      '@type': 'Organization',
      name: 'Tika',
      logo: { '@type': 'ImageObject', url: 'https://tika.app/logo.png' },
    },
  };

  return (
    <>
      {/* 검색 엔진을 위한 구조화 데이터 주입 */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <article>
        {/* 2. 시맨틱 헤더 영역 */}
        <header className="py-8">
          <h1 className="mb-4 text-4xl font-bold">효율적인 이슈 트래킹을 위한 Tika 활용 가이드</h1>

          {/* GEO 최적화: AI를 위한 핵심 요약 (TL;DR) */}
          <section
            aria-label="핵심 요약"
            className="rounded-lg border-l-4 border-blue-500 bg-slate-50 p-4"
          >
            <h2 className="text-lg font-semibold">💡 핵심 요약 (TL;DR)</h2>
            <ul className="mt-2 ml-5 list-disc">
              <li>
                Tika는 <strong>BACKLOG, TODO, IN PROGRESS, DONE</strong>의 4단계 보드를 제공합니다.
              </li>
              <li>
                복잡한 설정 없이 <strong>'Plan Simply. Ship Boldly.'</strong> 철학을 실천합니다.
              </li>
              <li>협업 효율을 위해 각 티켓에는 명확한 설명과 담당자 지정이 필수입니다.</li>
            </ul>
          </section>
        </header>

        {/* 3. 본문 구조화 (H2, H3 계층) */}
        <main className="prose max-w-none">
          <section>
            <h2>1. 칸반 보드의 4가지 상태 이해하기</h2>
            <p>Tika의 핵심은 직관적인 상태 관리입니다. 각 섹션은 다음과 같은 의미를 갖습니다.</p>

            <h3>BACKLOG & TODO</h3>
            <p>장기적인 아이디어는 백로그에, 당장 실행할 작업은 TODO로 옮겨 관리하세요.</p>

            {/* 성능 최적화 이미지: CLS 방지 및 AVIF/WebP 대응 */}
            <div className="relative h-[400px] w-full">
              <Image
                src="/images/tika-board-demo.avif"
                alt="Tika의 4단계 칸반 보드 구성도"
                fill
                className="object-contain"
                loading="lazy"
              />
            </div>
          </section>

          <section>
            <h2>2. 접근성(A11y)을 고려한 상호작용</h2>
            {/* 시맨틱 버튼 및 ARIA 속성 적용 */}
            <button
              type="button"
              aria-label="이슈 생성 가이드 상세보기"
              className="rounded-md bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
              onClick={() => {
                /* logic */
              }}
            >
              가이드 시작하기
            </button>
          </section>
        </main>

        {/* 4. 푸터 및 내부 링크 (Internal Linking) */}
        <footer className="mt-12 border-t pt-8">
          <nav aria-label="관련 문서 탐색">
            <h2 className="mb-4 text-xl font-semibold">함께 읽어보면 좋은 문서</h2>
            <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <li>
                <a href="/wiki/getting-started" className="text-blue-600 hover:underline">
                  Tika 시작하기: 첫 번째 프로젝트 생성
                </a>
              </li>
              <li>
                <a href="/wiki/keyboard-shortcuts" className="text-blue-600 hover:underline">
                  생산성을 높여주는 단축키 가이드
                </a>
              </li>
            </ul>
          </nav>
        </footer>
      </article>
    </>
  );
}
