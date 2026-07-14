import { describe, expect, it } from 'vitest';
import { getCountryFromLocale } from '../utils/locale';

describe('getCountryFromLocale', () => {
  it('extracts the region from a locale', () => {
    expect(getCountryFromLocale('en-US')).toBe('US');
    expect(getCountryFromLocale('fr_FR')).toBe('FR');
    expect(getCountryFromLocale('en')).toBeNull();
    expect(getCountryFromLocale('xx-ZZ')).toBeNull();
  });

  it('extracts the region from a 3-segment locale with a script subtag', () => {
    expect(getCountryFromLocale('zh-Hans-CN')).toBe('CN');
    expect(getCountryFromLocale('en-Latn-US')).toBe('US');
    expect(getCountryFromLocale('sr-Latn-RS')).toBe('RS');
  });

  it('ignores a 3-digit numeric region and a bare language tag', () => {
    expect(getCountryFromLocale('es-419')).toBeNull();
    // "es" is both a language and a country code, but a bare language tag has
    // no region — it must not resolve to Spain.
    expect(getCountryFromLocale('es')).toBeNull();
  });
});
