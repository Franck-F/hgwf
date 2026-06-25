import { describe, expect, it } from 'vitest';
import { isLocale, defaultLocale, locales } from '@hgwf/shared';

describe('@hgwf/shared locales', () => {
  it('reconnaît les locales valides', () => {
    expect(isLocale('fr')).toBe(true);
    expect(isLocale('en')).toBe(true);
  });
  it('rejette les locales inconnues', () => {
    expect(isLocale('de')).toBe(false);
    expect(isLocale('')).toBe(false);
  });
  it('expose fr par défaut', () => {
    expect(defaultLocale).toBe('fr');
    expect(locales).toEqual(['fr', 'en']);
  });
});
