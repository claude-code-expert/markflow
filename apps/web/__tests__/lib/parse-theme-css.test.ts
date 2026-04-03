import { describe, it, expect } from 'vitest';
import { parseThemeCss } from '../../lib/parse-theme-css';

describe('parseThemeCss', () => {
  it('returns empty object for empty string', () => {
    expect(parseThemeCss('')).toEqual({});
  });

  it('returns empty object for whitespace-only string', () => {
    expect(parseThemeCss('   \n\t  ')).toEqual({});
  });

  it('parses a single variable', () => {
    const input = '--mf-color-heading: #111827;';
    expect(parseThemeCss(input)).toEqual({
      '--mf-color-heading': '#111827',
    });
  });

  it('parses multiple variables', () => {
    const input = '--mf-color-heading: #111827;\n--mf-color-text: #374151;';
    expect(parseThemeCss(input)).toEqual({
      '--mf-color-heading': '#111827',
      '--mf-color-text': '#374151',
    });
  });

  it('strips CSS comments before parsing', () => {
    const input = `/* heading color */
--mf-color-heading: #111827;
/* body text */
--mf-color-text: #374151;`;
    expect(parseThemeCss(input)).toEqual({
      '--mf-color-heading': '#111827',
      '--mf-color-text': '#374151',
    });
  });

  it('handles multi-line block comments', () => {
    const input = `/*
 * Theme: default
 * Version: 1.0
 */
--mf-color-heading: #111827;`;
    expect(parseThemeCss(input)).toEqual({
      '--mf-color-heading': '#111827',
    });
  });

  it('parses complex values with commas (font stacks)', () => {
    const input =
      "--mf-font-body: 'Georgia', 'Times New Roman', serif;";
    expect(parseThemeCss(input)).toEqual({
      '--mf-font-body': "'Georgia', 'Times New Roman', serif",
    });
  });

  it('parses font stacks with system-ui', () => {
    const input =
      '--mf-font-body: system-ui, -apple-system, sans-serif;';
    expect(parseThemeCss(input)).toEqual({
      '--mf-font-body': 'system-ui, -apple-system, sans-serif',
    });
  });

  it('parses rgba values with commas', () => {
    const input = '--mf-color-code-bg: rgba(27,31,35,0.05);';
    expect(parseThemeCss(input)).toEqual({
      '--mf-color-code-bg': 'rgba(27,31,35,0.05)',
    });
  });

  it('ignores non --mf- prefixed variables', () => {
    const input = `--mf-color-heading: #111;
--custom-bg: red;
--other-var: blue;
--mf-color-text: #222;`;
    expect(parseThemeCss(input)).toEqual({
      '--mf-color-heading': '#111',
      '--mf-color-text': '#222',
    });
  });

  it('skips malformed declarations without colon', () => {
    const input = `--mf-color-heading #111;
--mf-color-text: #222;`;
    expect(parseThemeCss(input)).toEqual({
      '--mf-color-text': '#222',
    });
  });

  it('skips declarations with empty value', () => {
    const input = `--mf-color-heading: ;
--mf-color-text: #222;`;
    expect(parseThemeCss(input)).toEqual({
      '--mf-color-text': '#222',
    });
  });

  it('handles trailing semicolons and extra whitespace', () => {
    const input = `  --mf-color-heading :  #111  ;  --mf-color-text :  #222  ;  `;
    expect(parseThemeCss(input)).toEqual({
      '--mf-color-heading': '#111',
      '--mf-color-text': '#222',
    });
  });

  it('handles input with no trailing semicolon', () => {
    const input = '--mf-color-heading: #111';
    expect(parseThemeCss(input)).toEqual({
      '--mf-color-heading': '#111',
    });
  });

  it('handles mixed valid and invalid declarations', () => {
    const input = `--mf-ok: valid;
no-prefix: bad;
: empty-prop;
--mf-also-ok: works;
--other: ignored;`;
    expect(parseThemeCss(input)).toEqual({
      '--mf-ok': 'valid',
      '--mf-also-ok': 'works',
    });
  });
});
