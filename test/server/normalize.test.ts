import { describe, expect, it } from 'vitest';
import { normalizeName } from '../../src/server/lib/normalize.ts';

describe('normalizeName', () => {
  it('lower-cases the name', () => {
    expect(normalizeName('Benkpress')).toBe('benkpress');
  });

  it('trims leading and trailing whitespace', () => {
    expect(normalizeName('  Benkpress  ')).toBe('benkpress');
  });

  it('collapses internal whitespace to a single space', () => {
    expect(normalizeName('Bein   press')).toBe('bein press');
  });

  it('applies Unicode NFKC normalization, e.g. fullwidth characters', () => {
    // U+FF22 U+FF45 U+FF4E U+FF4B U+FF50 U+FF52 U+FF45 U+FF53 U+FF53: fullwidth "Benkpress"
    const fullwidth = '\uFF22\uFF45\uFF4E\uFF4B\uFF50\uFF52\uFF45\uFF53\uFF53';
    expect(normalizeName(fullwidth)).toBe('benkpress');
  });

  it('normalizes combining characters to the same precomposed form', () => {
    const precomposed = '\u00E9'; // "e" with acute accent as a single code point
    const decomposed = 'e\u0301'; // "e" + combining acute accent (U+0301)
    expect(precomposed).not.toBe(decomposed);
    expect(normalizeName(precomposed)).toBe(normalizeName(decomposed));
  });

  it('treats different casing and whitespace as equal', () => {
    expect(normalizeName('Benkpress')).toBe(normalizeName('benkpress '));
  });
});
