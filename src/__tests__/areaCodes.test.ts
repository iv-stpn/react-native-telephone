import type { CountryCode } from 'country-data-ts/countries';
import { describe, expect, it } from 'vitest';
import { getUniqueAreaCode, nationalBelongsToCountry } from '../utils/areaCodes';
import { requireConfig } from './support/configs';

describe('getUniqueAreaCode', () => {
  const get = (code: CountryCode) => getUniqueAreaCode(requireConfig(code));

  it('returns the single pinning prefix for a one-area-code shared country', () => {
    // +44 crown dependencies and single-area NANP countries.
    expect(get('GG')).toBe('1481');
    expect(get('JE')).toBe('1534');
    expect(get('IM')).toBe('1624');
    expect(get('BS')).toBe('242'); // Bahamas (only NANP area code 242)
    expect(get('AG')).toBe('268'); // Antigua & Barbuda
    expect(get('YT')).toBe('639'); // Mayotte
    expect(get('AX')).toBe('18'); // Åland
  });

  it('returns undefined for the default country of a shared code (no pinning prefix)', () => {
    expect(get('GB')).toBeUndefined(); // +44 default
    expect(get('US')).toBeUndefined(); // +1 default
    expect(get('RU')).toBeUndefined(); // +7 default
    expect(get('IT')).toBeUndefined(); // +39 default
  });

  it('returns undefined when several prefixes pin the country (no single area code)', () => {
    expect(get('KZ')).toBeUndefined(); // +7 via 6 and 7
    expect(get('BQ')).toBeUndefined(); // +599 via 31, 41, and 7
    expect(get('CA')).toBeUndefined(); // +1 via dozens of Canadian area codes
    expect(get('DO')).toBeUndefined(); // +1 via 809, 829, 849
  });

  it("returns undefined for a country that doesn't share its calling code", () => {
    expect(get('FR')).toBeUndefined(); // +33 is unshared
    expect(get('DE')).toBeUndefined();
  });
});

describe('nationalBelongsToCountry', () => {
  it('pins a shared-code number to its area-code country', () => {
    // +1 684 → American Samoa, +1 204 → Canada, +44 1481 → Guernsey.
    expect(nationalBelongsToCountry('+1', '6847331234', 'AS')).toBe(true);
    expect(nationalBelongsToCountry('+1', '2042342222', 'CA')).toBe(true);
    expect(nationalBelongsToCountry('+44', '1481123456', 'GG')).toBe(true);
  });

  it('rejects a shared-code number whose area code belongs elsewhere', () => {
    // 684 is American Samoa, not Canada; 204 is Canada, not the US default.
    expect(nationalBelongsToCountry('+1', '6847331234', 'CA')).toBe(false);
    expect(nationalBelongsToCountry('+1', '2042342222', 'US')).toBe(false);
  });

  it('attributes a default-country number only to the default', () => {
    // 202 is a US area code (absent from the NANP map → default US).
    expect(nationalBelongsToCountry('+1', '2025550123', 'US')).toBe(true);
    expect(nationalBelongsToCountry('+1', '2025550123', 'CA')).toBe(false);
  });

  it('returns true for an unshared calling code', () => {
    expect(nationalBelongsToCountry('+33', '612345678', 'FR')).toBe(true);
  });
});
