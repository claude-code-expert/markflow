# React & Content Deployment SEO/GEO Guidelines (2024-2026 Edition)

이 가이드는 React(Next.js) 환경에서 컴포넌트를 설계하거나 개별 문서(Wiki, MD, HTML)를 배포할 때, 검색 엔진(SEO)과 AI 생성형 엔진(GEO) 및 접근성(A11y)을 극대화하기 위한 표준입니다.

## 1. 시맨틱 구조 및 GEO 최적화
* **H1 태그의 단일성**: 페이지당 반드시 하나의 `<h1>`만 사용하며, 문서의 핵심 주제를 명확하게 기술합니다.
* **구조적 위계 (H2-H6)**: 논리적 흐름에 따라 계층을 건너뛰지 않고 사용합니다. (AI는 이 계층을 통해 문서의 문맥을 파악합니다.)
* **시맨틱 랜드마크**: `<header>`, `<nav>`, `<main>`, `<article>`, `<section>`, `<footer>`를 사용하여 페이지의 각 영역을 명확히 구분합니다.
* **AI 읽기 최적화 (GEO)**: 문서 최상단에 핵심 내용을 요약한 **TL;DR(Too Long; Didn't Read)** 또는 '핵심 요약' 섹션을 포함하면 AI 엔진이 정보를 발췌하기 용이해집니다.

## 2. 메타 데이터 및 소셜 그래프
* **동적 Head 제어**: Next.js의 `Metadata API`를 사용하여 각 페이지(또는 개별 문서)마다 고유한 `title`, `description`, `canonical` URL을 설정합니다.
    * `title`: 핵심 키워드를 앞쪽에 배치, 60자 이내 권장.
    * `description`: 155자 이내, 사용자 클릭을 유도하는 Call-to-Action(CTA) 포함.
* **Open Graph & Twitter Card**: SNS 공유 시 가독성을 위해 `og:title`, `og:description`, `og:image`를 필수 설정합니다.
* **Favicon & App Icon**: 브랜드 아이덴티티를 위해 표준 파비콘과 Apple Touch Icon을 설정합니다.

## 3. 기술적 SEO (Technical SEO)
* **URL 구조**: 영문 소문자 사용, 단어 간 하이픈(`-`) 연결, 깊지 않은 디렉토리 구조를 유지합니다.
* **Sitemap & Robots**: `sitemap.xml`과 `robots.txt`를 자동 생성하여 모든 개별 문서가 크롤러에 노출되도록 합니다.
* **내부 링크 (Internal Linking)**: 고립된 페이지가 생기지 않도록 문서 내에 관련 문서 링크를 2~3개 이상 포함하며, '탐색 경로(Breadcrumbs)'를 UI와 스키마에 적용합니다.

## 4. 성능 및 Core Web Vitals (Google 기준)
* **이미지 최적화**: 
    * 포맷: AVIF 또는 WebP 우선 사용.
    * 속성: `alt` 태그 필수(의미 있는 설명), `loading="lazy"` 적용 (단, LCP 요소는 제외).
    * 안정성: CLS 방지를 위해 `width`, `height` 명시.
* **속도 지표 (Threshold)**:
    * **LCP (Largest Contentful Paint)**: 2.5초 이내.
    * **INP (Interaction to Next Paint)**: 200ms 이내 (FID 대체 지표).
    * **CLS (Cumulative Layout Shift)**: 0.1 미만.
* **리소스 최소화**: CSS/JS Minification, 외부 스크립트 지연 로딩(Next.js `next/script` 활용).

## 5. 구조화 데이터 (JSON-LD)
* **스키마 적용**: 문서 성격에 맞는 JSON-LD 스키마를 삽입하여 검색 결과(SERP)의 풍부한 스니펫을 확보합니다.
    * Wiki/기술 문서: `TechArticle`, `Article`
    * FAQ 섹션: `FAQPage`
    * 브랜드/비즈니스: `Organization`, `LocalBusiness`

## 6. 접근성 및 상호작용 (A11y)
* **Interactive Elements**: 클릭 가능한 모든 요소는 `<button>` 또는 `<a>` 태그를 사용하며, 키보드 포커스가 가능해야 합니다.
* **ARIA 활용**: 시각적으로 숨겨진 요소나 상태 변화(아코디언, 모달 등)에는 `aria-expanded`, `aria-label`, `aria-hidden`을 올바르게 적용합니다.
* **폼 라벨링**: 모든 입력 필드는 `<label>`과 연결하거나 `aria-label`을 제공합니다.

## 7. 모바일 퍼스트 및 환경 최적화
* **반응형 레이아웃**: 모든 화면 크기에서 가독성을 보장하며, 터치 대상(버튼 등)의 크기는 최소 44x44px 이상을 유지합니다.
* **Viewport**: `<meta name="viewport" content="width=device-width, initial-scale=1">` 설정을 확인합니다.