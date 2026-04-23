import { test, expect, type Page } from '@playwright/test';

const TEST_USER = {
  email: process.env.E2E_USER_EMAIL ?? 'cafeciel@naver.com',
  password: process.env.E2E_USER_PASSWORD ?? 'skagml12!@',
};

// --- Helpers ---

async function login(page: Page) {
  await page.goto('/login');
  await page.locator('#email').fill(TEST_USER.email);
  await page.locator('#password').fill(TEST_USER.password);
  await page.locator('button[type="submit"]').click();
  // 로그인 성공 → 워크스페이스 목록 또는 문서 목록으로 이동
  await page.waitForURL(/\/[^/]+\/doc|\/workspaces/, { timeout: 15000 });
}

async function navigateToEditor(page: Page) {
  // 워크스페이스 목록이면 "문서" 버튼 클릭하여 진입
  if (page.url().includes('/workspaces')) {
    const docBtn = page.locator('button:has-text("문서"), a:has-text("문서")').first();
    await expect(docBtn).toBeVisible({ timeout: 5000 });
    await docBtn.click();
    await page.waitForURL(/\/[^/]+\/doc/, { timeout: 5000 });
  }

  // 새 문서 생성 — "+" 버튼 또는 "새 문서" 버튼
  const addBtn = page.locator('button:has-text("새 문서"), button[aria-label*="새 문서"], button:has-text("+")').first();
  await expect(addBtn).toBeVisible({ timeout: 5000 });
  await addBtn.click();

  // 모달이 뜨면 제목 입력, 안 뜨면 바로 에디터 페이지로 이동한 것
  const modal = page.locator('[role="dialog"], .modal').first();
  const hasModal = await modal.isVisible({ timeout: 2000 }).catch(() => false);
  if (hasModal) {
    const titleInput = modal.locator('input[type="text"]').first();
    await titleInput.fill('e2e-toolbar-' + Date.now());
    await modal.locator('button:has-text("만들기"), button:has-text("생성")').first().click();
  }

  // 에디터 페이지 로드 대기 (/[ws]/doc/new 또는 /[ws]/doc/[id])
  await page.waitForURL(/\/[^/]+\/doc\//, { timeout: 10000 });

  // CodeMirror 에디터 + 툴바 로드 대기
  const editor = page.locator('.cm-editor');
  await expect(editor).toBeVisible({ timeout: 10000 });
  await expect(page.locator('.mf-toolbar')).toBeVisible({ timeout: 5000 });

  // 기존 내용 지우기
  await editor.locator('.cm-content').click();
  await page.keyboard.press('Meta+a');
  await page.keyboard.press('Backspace');
}

async function getEditorText(page: Page): Promise<string> {
  return page.locator('.cm-content').innerText();
}

async function clickToolbarBtn(page: Page, tooltip: string) {
  await page.locator(`.mf-toolbar-btn[data-tooltip="${tooltip}"]`).click();
}

async function typeInEditor(page: Page, text: string) {
  await page.locator('.cm-content').click();
  await page.keyboard.type(text);
}

async function clearEditor(page: Page) {
  await page.locator('.cm-content').click();
  await page.keyboard.press('Meta+a');
  await page.keyboard.press('Backspace');
}

// --- Tests (직렬 실행 — 로그인 1회) ---

test.describe.serial('에디터 툴바 E2E', () => {
  let sharedPage: Page;

  test.beforeAll(async ({ browser }) => {
    sharedPage = await browser.newPage();
    await login(sharedPage);
    await navigateToEditor(sharedPage);
  });

  test.afterAll(async () => {
    await sharedPage.close();
  });

  // 각 테스트 전에 에디터 내용 비우기
  test.beforeEach(async () => {
    await clearEditor(sharedPage);
  });

  // --- Headings ---
  for (const level of [1, 2, 3, 4, 5, 6] as const) {
    test(`H${level} 버튼 → ${'#'.repeat(level)} 삽입`, async () => {
      await clickToolbarBtn(sharedPage, `Heading ${level}`);
      const text = await getEditorText(sharedPage);
      expect(text).toContain('#'.repeat(level) + ' ');
    });
  }

  // --- 인라인 서식 ---
  test('Bold 버튼 → **text** 삽입', async () => {
    await typeInEditor(sharedPage, 'bold test');
    await sharedPage.keyboard.press('Meta+a');
    await clickToolbarBtn(sharedPage, 'Bold');
    const text = await getEditorText(sharedPage);
    expect(text).toContain('**');
  });

  test('Italic 버튼 → *text* 삽입', async () => {
    await typeInEditor(sharedPage, 'italic test');
    await sharedPage.keyboard.press('Meta+a');
    await clickToolbarBtn(sharedPage, 'Italic');
    const text = await getEditorText(sharedPage);
    expect(text).toContain('*');
  });

  test('Strikethrough 버튼 → ~~text~~ 삽입', async () => {
    await typeInEditor(sharedPage, 'strike test');
    await sharedPage.keyboard.press('Meta+a');
    await clickToolbarBtn(sharedPage, 'Strikethrough');
    const text = await getEditorText(sharedPage);
    expect(text).toContain('~~');
  });

  test('Inline code 버튼 → `code` 삽입', async () => {
    await typeInEditor(sharedPage, 'code test');
    await sharedPage.keyboard.press('Meta+a');
    await clickToolbarBtn(sharedPage, 'Inline code');
    const text = await getEditorText(sharedPage);
    expect(text).toContain('`');
  });

  // --- 리스트 ---
  test('Unordered list 버튼 → - 삽입', async () => {
    await clickToolbarBtn(sharedPage, 'Unordered list');
    const text = await getEditorText(sharedPage);
    expect(text).toContain('- ');
  });

  test('Ordered list 버튼 → 1. 삽입', async () => {
    await clickToolbarBtn(sharedPage, 'Ordered list');
    const text = await getEditorText(sharedPage);
    expect(text).toContain('1. ');
  });

  test('Task list 버튼 → - [ ] 삽입', async () => {
    await clickToolbarBtn(sharedPage, 'Task list');
    const text = await getEditorText(sharedPage);
    expect(text).toContain('- [ ] ');
  });

  // --- 블록 요소 ---
  test('Blockquote 버튼 → > 삽입', async () => {
    await clickToolbarBtn(sharedPage, 'Blockquote');
    const text = await getEditorText(sharedPage);
    expect(text).toContain('> ');
  });

  test('Code block 버튼 → ``` 삽입', async () => {
    await clickToolbarBtn(sharedPage, 'Code block');
    const text = await getEditorText(sharedPage);
    expect(text).toContain('```');
  });

  test('Horizontal rule 버튼 → --- 삽입', async () => {
    await clickToolbarBtn(sharedPage, 'Horizontal rule');
    const text = await getEditorText(sharedPage);
    expect(text).toContain('---');
  });

  // --- 삽입 요소 ---
  test('Link 버튼 → [text](url) 삽입', async () => {
    await clickToolbarBtn(sharedPage, 'Link');
    const text = await getEditorText(sharedPage);
    expect(text).toContain('[');
    expect(text).toContain('](');
  });

  test('Image 버튼 → ![alt](url) 삽입', async () => {
    await clickToolbarBtn(sharedPage, 'Image (URL)');
    const text = await getEditorText(sharedPage);
    expect(text).toContain('![');
    expect(text).toContain('](');
  });

  test('Table 버튼 → 테이블 삽입', async () => {
    await clickToolbarBtn(sharedPage, 'Table');
    const text = await getEditorText(sharedPage);
    expect(text).toContain('|');
  });

  // --- 수식 ---
  test('Inline math 버튼 → $ 삽입', async () => {
    await clickToolbarBtn(sharedPage, 'Inline math ($...$)');
    const text = await getEditorText(sharedPage);
    expect(text).toContain('$');
  });

  test('Math block 버튼 → $$ 삽입', async () => {
    await clickToolbarBtn(sharedPage, 'Math block ($$...$$)');
    const text = await getEditorText(sharedPage);
    expect(text).toContain('$$');
  });

  // --- 프리뷰 렌더링 ---
  test('마크다운 입력 → 프리뷰 렌더링 확인', async () => {
    await typeInEditor(sharedPage, '# Hello World\n\n**bold** and *italic*\n\n- item 1\n- item 2');

    const preview = sharedPage.locator('.mf-preview');
    await expect(preview.locator('h1')).toContainText('Hello World', { timeout: 5000 });
    await expect(preview.locator('strong')).toContainText('bold');
    await expect(preview.locator('em')).toContainText('italic');
    await expect(preview.locator('li').first()).toContainText('item 1');
  });

  test('GFM 테이블 → 프리뷰 렌더링', async () => {
    await typeInEditor(sharedPage, '| Col A | Col B |\n| --- | --- |\n| 1 | 2 |');

    const preview = sharedPage.locator('.mf-preview');
    await expect(preview.locator('table')).toBeVisible({ timeout: 5000 });
    await expect(preview.locator('th').first()).toContainText('Col A');
  });

  test('코드 블록 → 프리뷰 렌더링', async () => {
    await typeInEditor(sharedPage, '```javascript\nconst x = 1;\n```');

    const preview = sharedPage.locator('.mf-preview');
    await expect(preview.locator('pre')).toBeVisible({ timeout: 5000 });
    await expect(preview.locator('code')).toContainText('const x = 1');
  });

  test('수식 → KaTeX 프리뷰 렌더링', async () => {
    await typeInEditor(sharedPage, '$E=mc^2$');

    const preview = sharedPage.locator('.mf-preview');
    await expect(preview.locator('.katex')).toBeVisible({ timeout: 5000 });
  });
});
