import { NANP_AREA_CODE_TO_COUNTRY } from 'country-data-ts/phone-data';
import { describe, expect, it } from 'vitest';
import { getDefaultCountryForCallingCode } from '../utils/callingCodeDefaults';

describe('getDefaultCountryForCallingCode', () => {
  it('maps shared calling codes to the biggest country', () => {
    expect(getDefaultCountryForCallingCode('+1')).toBe('US');
    expect(getDefaultCountryForCallingCode('+44')).toBe('GB');
    expect(getDefaultCountryForCallingCode('+7')).toBe('RU');
    expect(getDefaultCountryForCallingCode('+590')).toBe('GP');
    expect(getDefaultCountryForCallingCode('+672')).toBe('NF');
  });

  it('returns undefined for unshared / unknown calling codes', () => {
    expect(getDefaultCountryForCallingCode('+33')).toBeUndefined();
    expect(getDefaultCountryForCallingCode('+999')).toBeUndefined();
  });

  it('every default ISO code has a matching NANP area-code entry only for +1', () => {
    // Sanity: the NANP area-code map covers Canada and the +1 dependencies.
    expect(NANP_AREA_CODE_TO_COUNTRY.get('204')).toBe('CA');
    expect(NANP_AREA_CODE_TO_COUNTRY.get('268')).toBe('AG');
    expect(NANP_AREA_CODE_TO_COUNTRY.get('809')).toBe('DO');
    // US area codes are deliberately absent (US is the +1 default).
    expect(NANP_AREA_CODE_TO_COUNTRY.has('202')).toBe(false);
  });
});
