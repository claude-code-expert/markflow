import { workspaces, eq } from '@markflow/db';
import type { Db } from '@markflow/db';
import { notFound, badRequest } from '../utils/errors.js';
import { validateThemeCss } from '../utils/css-validator.js';

const VALID_PRESETS = ['default', 'github', 'notion', 'dark', 'academic'] as const;
const MAX_CSS_LENGTH = 10_000;

export function createThemeService(db: Db) {
  async function getTheme(workspaceId: string) {
    const [ws] = await db
      .select({ themePreset: workspaces.themePreset, themeCss: workspaces.themeCss })
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId))
      .limit(1);

    if (!ws) throw notFound('Workspace not found');

    return { preset: ws.themePreset, css: ws.themeCss };
  }

  async function updateTheme(workspaceId: string, preset: string, css: string) {
    if (!VALID_PRESETS.includes(preset as typeof VALID_PRESETS[number])) {
      throw badRequest('INVALID_PRESET', `Preset must be one of: ${VALID_PRESETS.join(', ')}`);
    }

    if (css.length > MAX_CSS_LENGTH) {
      throw badRequest('CSS_TOO_LONG', `CSS must be under ${MAX_CSS_LENGTH} characters`);
    }

    if (css.trim()) {
      const validation = validateThemeCss(css);
      if (!validation.valid) {
        throw badRequest('INVALID_CSS', 'CSS contains disallowed properties', {
          rejected: validation.rejected,
        });
      }
    }

    const [updated] = await db
      .update(workspaces)
      .set({ themePreset: preset, themeCss: css, updatedAt: new Date() })
      .where(eq(workspaces.id, workspaceId))
      .returning({ themePreset: workspaces.themePreset, themeCss: workspaces.themeCss });

    if (!updated) throw notFound('Workspace not found');

    return { preset: updated.themePreset, css: updated.themeCss };
  }

  return { getTheme, updateTheme };
}
