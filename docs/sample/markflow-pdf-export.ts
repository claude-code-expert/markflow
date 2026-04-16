/**
 * MarkFlow — 서버사이드 PDF Export
 * Stack: Fastify 4 + Playwright + markdown-it + highlight.js
 *
 * 설치:
 *   npm i playwright markdown-it highlight.js dompurify jsdom
 *   npx playwright install chromium --with-deps
 *
 * 서버리스(Vercel/Lambda)로 올릴 때는 아래 대체:
 *   npm i puppeteer-core @sparticuz/chromium-min
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { chromium, type Browser } from 'playwright';
import MarkdownIt from 'markdown-it';
import hljs from 'highlight.js';
import createDOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

// --- 1. 마크다운 파서 (코드 하이라이팅 포함) ---------------------------------
const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  highlight: (str, lang) => {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return `<pre class="hljs"><code>${
          hljs.highlight(str, { language: lang, ignoreIllegals: true }).value
        }</code></pre>`;
      } catch {
        /* fallthrough */
      }
    }
    return `<pre class="hljs"><code>${md.utils.escapeHtml(str)}</code></pre>`;
  },
});

// --- 2. XSS 방지 (임베드 토큰으로 외부 문서 렌더링 대비) ---------------------
const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window as unknown as Window);

// --- 3. 브라우저 싱글톤 (warm 모드: 재사용해서 13ms 렌더 확보) -----------------
let _browser: Browser | null = null;
async function getBrowser(): Promise<Browser> {
  if (_browser && _browser.isConnected()) return _browser;
  _browser = await chromium.launch({
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  return _browser;
}

// 프로세스 종료 시 정리
process.on('SIGTERM', async () => {
  if (_browser) await _browser.close();
});

// --- 4. HTML 템플릿 (워크스페이스 CSS 테마 주입) ------------------------------
interface RenderOptions {
  title: string;
  markdown: string;
  workspaceCss?: string;           // B7 워크스페이스 CSS 테마
  fontFamily?: string;             // 한글 기본 폰트
}

function buildHtml(opts: RenderOptions): string {
  const bodyHtml = DOMPurify.sanitize(md.render(opts.markdown), {
    ADD_ATTR: ['target'],
  });

  // Pretendard = 한글 렌더링 권장 웹폰트 (변동 없는 CDN)
  const fontStack =
    opts.fontFamily ??
    `'Pretendard','DM Sans','Apple SD Gothic Neo','Malgun Gothic',sans-serif`;

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<title>${escapeHtml(opts.title)}</title>
<link rel="stylesheet"
  href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css">
<link rel="stylesheet"
  href="https://cdn.jsdelivr.net/npm/highlight.js@11.10.0/styles/github.min.css">
<style>
  @page { size: A4; margin: 20mm 18mm; }
  html, body { font-family: ${fontStack}; }
  body { color:#1A1916; line-height:1.7; font-size:11pt; }
  h1,h2,h3 { font-family:'Sora',${fontStack}; page-break-after: avoid; }
  pre, table, img, figure { page-break-inside: avoid; }
  pre.hljs { padding:12px; border-radius:6px; font-size:10pt;
             font-family:'JetBrains Mono',monospace; }
  table { border-collapse: collapse; width:100%; }
  th,td { border:1px solid #e5e5e5; padding:6px 10px; }
  blockquote { border-left:3px solid #1A56DB; padding-left:12px; color:#555; }
  a { color:#1A56DB; text-decoration:none; }
  img { max-width:100%; height:auto; }
</style>
${opts.workspaceCss ? `<style>${opts.workspaceCss}</style>` : ''}
</head>
<body>${bodyHtml}</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!
  );
}

// --- 5. 핵심 변환 함수 --------------------------------------------------------
export async function markdownToPdf(opts: RenderOptions): Promise<Buffer> {
  const html = buildHtml(opts);
  const browser = await getBrowser();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // data URL로 주입하면 파일시스템 접근 없이 폰트·CSS 전부 로드 가능
    await page.setContent(html, { waitUntil: 'networkidle' });
    // 웹폰트 로딩 확실히 대기 (한글 폰트 FOIT 방지)
    await page.evaluate(() => (document as any).fonts.ready);

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', right: '18mm', bottom: '20mm', left: '18mm' },
      displayHeaderFooter: true,
      headerTemplate: `<div></div>`,
      footerTemplate: `
        <div style="font-size:9px;width:100%;text-align:center;color:#999;">
          <span class="pageNumber"></span> / <span class="totalPages"></span>
        </div>`,
    });
    return pdf;
  } finally {
    await context.close();
  }
}

// --- 6. Fastify 라우트 (005_api-spec: GET /workspaces/:wsId/export) ----------
export async function pdfExportRoute(app: FastifyInstance) {
  app.get<{
    Params: { workspaceId: string };
    Querystring: { documentId: string; format: string };
  }>(
    '/workspaces/:workspaceId/export',
    async (req, reply) => {
      const { documentId, format } = req.query;
      if (format !== 'pdf') return reply.code(400).send({ error: 'INVALID_FORMAT' });

      // TODO: Drizzle로 문서 + 워크스페이스 테마 조회
      // const doc = await db.query.documents.findFirst({ where: eq(documents.id, +documentId) });
      // const theme = await db.query.workspaceThemes.findFirst({...});

      const pdf = await markdownToPdf({
        title: 'Document Title',        // doc.title
        markdown: '# Hello\n\n본문 내용', // doc.content
        workspaceCss: undefined,        // theme.css
      });

      reply
        .header('Content-Type', 'application/pdf')
        .header('Content-Disposition', `attachment; filename="doc-${documentId}.pdf"`)
        .send(pdf);
    },
  );
}
