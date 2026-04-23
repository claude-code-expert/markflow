import { describe, it, expect } from 'vitest';
import { countWords } from '../wordCount';

describe('wordCount', () => {
  it('returns 0 for empty string', () => {
    expect(countWords('')).toBe(0);
  });

  it('returns 0 for whitespace-only string', () => {
    expect(countWords('   \n\t  ')).toBe(0);
  });

  it('counts single word', () => {
    expect(countWords('hello')).toBe(1);
  });

  it('counts multiple words separated by spaces', () => {
    expect(countWords('hello world foo')).toBe(3);
  });

  it('handles multiple spaces between words', () => {
    expect(countWords('hello   world')).toBe(2);
  });

  it('handles newlines as separators', () => {
    expect(countWords('line one\nline two')).toBe(4);
  });

  it('handles markdown syntax gracefully', () => {
    expect(countWords('# Heading\n\n**bold** text')).toBe(4);
  });

  it('counts Korean words', () => {
    expect(countWords('안녕하세요 세계')).toBe(2);
  });

  it('handles mixed Korean and English', () => {
    expect(countWords('Hello 세계 World')).toBe(3);
  });

  it('ignores leading and trailing whitespace', () => {
    expect(countWords('  hello world  ')).toBe(2);
  });
});
