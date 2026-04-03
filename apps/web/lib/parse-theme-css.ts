/**
 * Parse CSS variable declarations string into a Record for MarkdownEditor themeVars prop.
 * Input:  "--mf-color-heading: #111;\n--mf-font-body: Georgia, serif;"
 * Output: { '--mf-color-heading': '#111', '--mf-font-body': 'Georgia, serif' }
 */
export function parseThemeCss(css: string): Record<string, string> {
  if (!css.trim()) return {};

  const result: Record<string, string> = {};

  // Remove comments
  const cleaned = css.replace(/\/\*[\s\S]*?\*\//g, '');

  const declarations = cleaned.split(';');
  for (const decl of declarations) {
    const trimmed = decl.trim();
    if (!trimmed) continue;

    const colonIdx = trimmed.indexOf(':');
    if (colonIdx <= 0) continue;

    const prop = trimmed.slice(0, colonIdx).trim();
    const value = trimmed.slice(colonIdx + 1).trim();

    if (prop.startsWith('--mf-') && value) {
      result[prop] = value;
    }
  }

  return result;
}
