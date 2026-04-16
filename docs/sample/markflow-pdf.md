MarkFlow 프로젝트에 적용할 때 체크포인트
1. 한글 폰트 정확도 확보

Puppeteer/Playwright의 page.pdf()는 기본적으로 폰트 로딩을 기다리지만, 위 코드처럼 document.fonts.ready를 명시적으로 await 하면 FOIT(폰트 깨짐)을 완전히 제거할 수 있습니다.
Pretendard는 jsdelivr CDN에서 안정적으로 서빙됩니다(스펙상 이미 marked도 jsdelivr 표준 정책).

2. 워크스페이스 CSS 테마 주입 (B7 요구사항)

buildHtml()의 workspaceCss 파라미터로 DB에 저장된 워크스페이스 CSS를 인라인 <style> 태그로 주입하는 방식이 가장 안전합니다. 외부 URL로 <link> 걸면 서버리스 환경에서 타임아웃 위험이 있습니다.

3. 비동기 잡 큐 패턴 (스펙과 일치)

005_api-spec_v1_3.md에 이미 pdf 포맷은 202 비동기 응답으로 정의되어 있습니다. BullMQ(이미 AI 파이프라인에 도입 예정)로 감싸면 1~3초 걸리는 PDF 생성을 논블로킹 처리 가능합니다.

4. 서버리스 배포 시 교체 포인트

Vercel/Lambda 배포라면 @sparticuz/chromium-min + puppeteer-core Danielolawoyin 조합이 50MB 번들 제한을 우회하는 표준 방법입니다. 동일한 Chromium 엔진이므로 PDF 출력 품질은 동일합니다.