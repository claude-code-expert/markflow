import { describe, it, expect } from 'vitest';
import { validateImageFile } from '../imageValidation';

// Helper: create a File with specific type and size
function createFile(name: string, type: string, size: number): File {
  const file = new File(['x'], name, { type });
  Object.defineProperty(file, 'size', { value: size, writable: false });
  return file;
}

describe('validateImageFile', () => {
  describe('Type validation', () => {
    it.each([
      ['image/png', 'test.png'],
      ['image/jpeg', 'test.jpg'],
      ['image/gif', 'test.gif'],
      ['image/webp', 'test.webp'],
      ['image/svg+xml', 'test.svg'],
    ])('accepts %s', (mimeType, filename) => {
      const file = createFile(filename, mimeType, 1024);
      const result = validateImageFile(file);
      expect(result).toEqual({ valid: true });
    });

    it('rejects application/pdf', () => {
      const file = createFile('doc.pdf', 'application/pdf', 1024);
      const result = validateImageFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('지원하지 않는 파일 형식');
    });

    it('rejects text/plain', () => {
      const file = createFile('readme.txt', 'text/plain', 1024);
      const result = validateImageFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('지원하지 않는 파일 형식');
    });
  });

  describe('Size validation', () => {
    it('accepts exactly 10MB file', () => {
      const file = createFile('large.png', 'image/png', 10 * 1024 * 1024);
      const result = validateImageFile(file);
      expect(result).toEqual({ valid: true });
    });

    it('rejects file exceeding 10MB by 1 byte', () => {
      const file = createFile('too-large.png', 'image/png', 10 * 1024 * 1024 + 1);
      const result = validateImageFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('파일 크기가 너무 큽니다');
    });

    it('rejects 0 byte empty file', () => {
      const file = createFile('empty.png', 'image/png', 0);
      const result = validateImageFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('빈 파일');
    });
  });
});
