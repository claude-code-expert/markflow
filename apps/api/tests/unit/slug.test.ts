/**
 * T068 -- Slug Generation Unit Tests
 *
 * User Story 3: Document & Category Management
 *
 * Tests the slug generation utility used for auto-generating
 * URL-friendly slugs from document titles.
 */
import { describe, it, expect } from 'vitest';
import { generateSlug } from '../../src/utils/slug.js';

// ─────────────────────────────────────────────
// Basic slug generation
// ─────────────────────────────────────────────
describe('generateSlug', () => {
  describe('English titles', () => {
    it('should convert English title to lowercase-with-hyphens', () => {
      const slug = generateSlug('Getting Started Guide');
      expect(slug).toBe('getting-started-guide');
    });

    it('should handle single-word title', () => {
      const slug = generateSlug('Introduction');
      expect(slug).toBe('introduction');
    });

    it('should handle already lowercase title', () => {
      const slug = generateSlug('hello world');
      expect(slug).toBe('hello-world');
    });

    it('should collapse multiple spaces into single hyphen', () => {
      const slug = generateSlug('Too   Many    Spaces');
      expect(slug).toBe('too-many-spaces');
    });

    it('should trim leading and trailing whitespace', () => {
      const slug = generateSlug('  Trimmed Title  ');
      expect(slug).toBe('trimmed-title');
    });
  });

  describe('Korean titles', () => {
    it('should strip Korean characters and use any English words', () => {
      const slug = generateSlug('React 컴포넌트 가이드');
      expect(slug).toContain('react');
      // Korean characters should not appear in slug
      expect(slug).not.toMatch(/[가-힣]/);
    });

    it('should produce a fallback slug for Korean-only title', () => {
      const slug = generateSlug('한국어 제목');
      // Should produce a fallback since no Latin characters
      expect(slug).toBeTruthy();
      expect(slug.length).toBeGreaterThan(0);
      // Should not contain Korean characters
      expect(slug).not.toMatch(/[가-힣]/);
    });

    it('should handle mixed Korean and English', () => {
      const slug = generateSlug('API 스펙 v1.2 문서');
      expect(slug).toContain('api');
      expect(slug).not.toMatch(/[가-힣]/);
    });
  });

  describe('Special characters', () => {
    it('should remove special characters', () => {
      const slug = generateSlug('Hello, World! (v2.0)');
      expect(slug).not.toContain(',');
      expect(slug).not.toContain('!');
      expect(slug).not.toContain('(');
      expect(slug).not.toContain(')');
    });

    it('should handle ampersands and symbols', () => {
      const slug = generateSlug('Design & Architecture');
      expect(slug).not.toContain('&');
      // Should still have the words
      expect(slug).toContain('design');
      expect(slug).toContain('architecture');
    });

    it('should handle hyphens in the title', () => {
      const slug = generateSlug('State-of-the-Art Design');
      expect(slug).toContain('state');
      expect(slug).toContain('art');
      expect(slug).toContain('design');
    });

    it('should remove leading/trailing hyphens from result', () => {
      const slug = generateSlug('---Leading Hyphens---');
      expect(slug).not.toMatch(/^-/);
      expect(slug).not.toMatch(/-$/);
    });

    it('should handle numbers', () => {
      const slug = generateSlug('Chapter 3: Getting Started');
      expect(slug).toContain('chapter');
      expect(slug).toContain('3');
      expect(slug).toContain('getting');
      expect(slug).toContain('started');
    });
  });

  describe('Edge cases', () => {
    it('should produce a fallback slug for empty string', () => {
      const slug = generateSlug('');
      expect(slug).toBeTruthy();
      expect(slug.length).toBeGreaterThan(0);
    });

    it('should produce a fallback slug for whitespace-only string', () => {
      const slug = generateSlug('   ');
      expect(slug).toBeTruthy();
      expect(slug.length).toBeGreaterThan(0);
    });

    it('should produce a fallback slug for special-characters-only string', () => {
      const slug = generateSlug('!@#$%^&*()');
      expect(slug).toBeTruthy();
      expect(slug.length).toBeGreaterThan(0);
    });

    it('should handle very long titles by truncating', () => {
      const longTitle = 'A'.repeat(500) + ' Very Long Title';
      const slug = generateSlug(longTitle);
      // Slug should be reasonably bounded (e.g., <= 300 chars for DB column)
      expect(slug.length).toBeLessThanOrEqual(300);
    });
  });

  describe('Slug uniqueness base (ensureUniqueSlug uses DB)', () => {
    it('should generate consistent slugs for same input', () => {
      const slug1 = generateSlug('Getting Started');
      const slug2 = generateSlug('Getting Started');
      expect(slug1).toBe(slug2);
    });

    it('should produce different slugs for different titles', () => {
      const slug1 = generateSlug('My Doc');
      const slug2 = generateSlug('Your Doc');
      expect(slug1).not.toBe(slug2);
    });

    it('should produce URL-safe output for various inputs', () => {
      const slug = generateSlug('Unique Title');
      expect(slug).toBe('unique-title');
      expect(slug).toMatch(/^[a-z0-9-]+$/);
    });

    it('should handle Fresh Title correctly', () => {
      const slug = generateSlug('Fresh Title');
      expect(slug).toBe('fresh-title');
    });
  });
});
