import { describe, it, expect } from 'vitest';
import { validateThemeCss } from '../../src/utils/css-validator.js';

describe('CSS Theme Validator', () => {
  it('accepts valid --mf-* variables', () => {
    const result = validateThemeCss('--mf-font-body: "DM Sans", sans-serif;');
    expect(result.valid).toBe(true);
    expect(result.rejected).toHaveLength(0);
  });

  it('accepts multiple --mf-* variables', () => {
    const css = `
      --mf-font-body: serif;
      --mf-color-heading: #1a1916;
      --mf-line-height: 1.75;
      --mf-max-width: 720px;
    `;
    const result = validateThemeCss(css);
    expect(result.valid).toBe(true);
  });

  it('rejects non --mf-* properties', () => {
    const result = validateThemeCss('background-image: url("evil");');
    expect(result.valid).toBe(false);
    expect(result.rejected).toContain('background-image');
  });

  it('rejects mixed valid and invalid properties', () => {
    const css = '--mf-font-body: serif; position: absolute; --mf-color-heading: #000;';
    const result = validateThemeCss(css);
    expect(result.valid).toBe(false);
    expect(result.rejected).toContain('position');
    expect(result.rejected).not.toContain('--mf-font-body');
  });

  it('rejects empty property names', () => {
    const result = validateThemeCss(': value;');
    expect(result.valid).toBe(false);
  });

  it('accepts empty string', () => {
    const result = validateThemeCss('');
    expect(result.valid).toBe(true);
    expect(result.rejected).toHaveLength(0);
  });

  it('rejects properties inside selectors (not just variables)', () => {
    const css = '.mf-preview h1 { font-size: 24px; }';
    const result = validateThemeCss(css);
    expect(result.valid).toBe(false);
  });

  it('handles CSS with comments gracefully', () => {
    const css = '/* theme override */ --mf-font-body: serif;';
    const result = validateThemeCss(css);
    expect(result.valid).toBe(true);
  });
});
