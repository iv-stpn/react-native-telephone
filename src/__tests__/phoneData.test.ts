import {
  CALLING_CODE_AREA_PREFIXES,
  CALLING_CODE_DEFAULTS,
  COUNTRY_PHONE_DATA,
  NANP_AREA_CODE_TO_COUNTRY,
} from 'country-data-ts/phone-data';
import { describe, expect, it } from 'vitest';
import { getCountryPhoneCatalog, getCountryPhoneConfig } from '../utils/phoneData';
import { countMaskDigitSlots, getNationalMask, normalizeNationalDigits } from '../utils/phoneMask';
import { validateExtractedPhone } from '../utils/phoneParse';

describe('dataset integrity', () => {
  it('has 250 entries with unique codes', () => {
    const codes = COUNTRY_PHONE_DATA.map((c) => c.code);
    expect(codes.length).toBe(250);
    expect(new Set(codes).size).toBe(250);
  });

  it('every mask begins with its calling code and every regex compiles', () => {
    for (const config of COUNTRY_PHONE_DATA) {
      expect(config.mask.startsWith(config.callingCode)).toBe(true);
      expect(() => new RegExp(config.nationalRegex)).not.toThrow();
    }
  });

  it('every mask begins with calling code + space, so getNationalMask round-trips', () => {
    for (const config of COUNTRY_PHONE_DATA) expect(config.mask.startsWith(`${config.callingCode} `)).toBe(true);
  });

  it("every example fits its mask's digit slots and validates against its regex", () => {
    for (const config of COUNTRY_PHONE_DATA) {
      const exampleDigits = normalizeNationalDigits(config.example);
      const slots = countMaskDigitSlots(getNationalMask(config));
      expect(exampleDigits.length).toBeLessThanOrEqual(slots);
      expect(validateExtractedPhone(exampleDigits, config)).toBe(true);
    }
  });

  it('every disambiguation-map value resolves to a real config', () => {
    for (const code of CALLING_CODE_DEFAULTS.values()) expect(getCountryPhoneConfig(code)).toBeDefined();
    for (const prefixMap of CALLING_CODE_AREA_PREFIXES.values()) {
      for (const code of prefixMap.values()) expect(getCountryPhoneConfig(code)).toBeDefined();
    }
    for (const code of NANP_AREA_CODE_TO_COUNTRY.values()) expect(getCountryPhoneConfig(code)).toBeDefined();
  });
});

describe('getCountryPhoneCatalog', () => {
  it('filters and orders the catalog by allowedCountries', () => {
    const subset = getCountryPhoneCatalog(['FR', 'US']);
    expect(subset.map((c) => c.code)).toEqual(['FR', 'US']);
    expect(getCountryPhoneCatalog().length).toBe(250);
  });
});
