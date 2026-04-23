/**
 * CSS Theme Variable Validator
 * Phase 1: Only --mf-* CSS custom properties are allowed.
 * Full CSS editing is deferred to Phase 2.
 */

interface ValidationResult {
  valid: boolean;
  rejected: string[];
}

export function validateThemeCss(css: string): ValidationResult {
  if (!css.trim()) {
    return { valid: true, rejected: [] };
  }

  const rejected: string[] = [];

  // Remove CSS comments
  const cleaned = css.replace(/\/\*[\s\S]*?\*\//g, '');

  // Reject any content with selectors (braces indicate rule blocks, not just variable declarations)
  if (cleaned.includes('{') || cleaned.includes('}')) {
    // Extract property names from inside rule blocks
    const blockMatch = cleaned.match(/\{([^}]*)\}/g);
    if (blockMatch) {
      for (const block of blockMatch) {
        const inner = block.replace(/[{}]/g, '');
        const props = inner.split(';').map((s) => s.trim()).filter(Boolean);
        for (const prop of props) {
          const colonIdx = prop.indexOf(':');
          if (colonIdx > 0) {
            const name = prop.slice(0, colonIdx).trim();
            if (!name.startsWith('--mf-')) {
              rejected.push(name);
            }
          }
        }
      }
    }
    // If there are selectors, it's invalid regardless
    const selectorPattern = /[.#\w[\]>~+:]/;
    const outsideBraces = cleaned.replace(/\{[^}]*\}/g, '');
    if (selectorPattern.test(outsideBraces.trim())) {
      if (rejected.length === 0) {
        rejected.push('(selector-based CSS not allowed)');
      }
      return { valid: false, rejected };
    }
  }

  // Parse top-level property declarations (no braces)
  const declarations = cleaned.split(';').map((s) => s.trim()).filter(Boolean);

  for (const decl of declarations) {
    const colonIdx = decl.indexOf(':');
    if (colonIdx <= 0) {
      // Malformed declaration
      rejected.push(decl.slice(0, 20));
      continue;
    }

    const propertyName = decl.slice(0, colonIdx).trim();
    if (!propertyName.startsWith('--mf-')) {
      rejected.push(propertyName);
    }
  }

  return {
    valid: rejected.length === 0,
    rejected,
  };
}
