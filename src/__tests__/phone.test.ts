import { describe, expect, it } from "vitest";
import { COUNTRY_PHONE_DATA, type CountryPhoneConfig } from "../data/phone-data";
import {
  applyPhoneMask,
  countMaskDigitSlots,
  countRequiredMaskDigits,
  getCountryFromLocale,
  getCountryPhoneCatalog,
  getCountryPhoneConfig,
  getNationalMask,
  nationalFromE164,
  normalizeCallingCode,
  normalizeNationalDigits,
  parseCountryFromE164,
  toE164,
  validateExtractedPhone,
} from "../utils/phone";

// A handful of countries we lean on across the suite, resolved once.
const US = getCountryPhoneConfig("US") as CountryPhoneConfig;
const FR = getCountryPhoneConfig("FR") as CountryPhoneConfig;
const AU = getCountryPhoneConfig("AU") as CountryPhoneConfig; // trunk prefix "0"
const AG = getCountryPhoneConfig("AG") as CountryPhoneConfig; // shares +1 with US

describe("dataset integrity", () => {
  it("has 250 entries with unique codes", () => {
    const codes = COUNTRY_PHONE_DATA.map((c) => c.code);
    expect(codes.length).toBe(250);
    expect(new Set(codes).size).toBe(250);
  });

  it("every mask begins with its calling code and every regex compiles", () => {
    for (const config of COUNTRY_PHONE_DATA) {
      expect(config.mask.startsWith(config.callingCode)).toBe(true);
      expect(() => new RegExp(config.nationalRegex)).not.toThrow();
    }
  });
});

describe("applyPhoneMask", () => {
  it("emits leading literals once the first digit arrives (the offkeep bug)", () => {
    const mask = getNationalMask(US); // "([000]) [000]-[0000]"
    expect(applyPhoneMask(mask, "2")).toBe("(2");
    expect(applyPhoneMask(mask, "202555")).toBe("(202) 555");
    expect(applyPhoneMask(mask, "2025550123")).toBe("(202) 555-0123");
  });

  it("holds separators until the next digit is typed", () => {
    const mask = getNationalMask(FR); // "[0] [00] [00] [00] [00]"
    expect(applyPhoneMask(mask, "6")).toBe("6");
    expect(applyPhoneMask(mask, "61")).toBe("6 1");
    expect(applyPhoneMask(mask, "612345678")).toBe("6 12 34 56 78");
  });

  it("returns empty string for no digits and ignores overflow", () => {
    expect(applyPhoneMask(getNationalMask(US), "")).toBe("");
    // More digits than slots: extra input is simply not shown.
    expect(applyPhoneMask(getNationalMask(US), "20255501239999")).toBe("(202) 555-0123");
  });
});

describe("digit-slot counting", () => {
  it("counts required vs total slots", () => {
    const usMask = getNationalMask(US);
    expect(countRequiredMaskDigits(usMask)).toBe(10);
    expect(countMaskDigitSlots(usMask)).toBe(10);
  });

  it("treats optional [9] slots as total-only", () => {
    // "[000] [00000000]" style masks with a trailing optional run.
    const withOptional = "[00] [9999]";
    expect(countRequiredMaskDigits(withOptional)).toBe(2);
    expect(countMaskDigitSlots(withOptional)).toBe(6);
  });
});

describe("E.164 conversion", () => {
  it("builds and parses back a US number", () => {
    expect(toE164("2025550123", US)).toBe("+12025550123");
    expect(nationalFromE164("+12025550123", US)).toBe("2025550123");
  });

  it("drops the trunk prefix when forming E.164 (AU)", () => {
    // AU users type a leading 0 nationally; E.164 must not include it.
    expect(toE164("0412345678", AU)).toBe("+61412345678");
    expect(normalizeNationalDigits("(04) 1234 5678")).toBe("0412345678");
  });

  it("normalizes free-form calling-code input", () => {
    expect(normalizeCallingCode("+1")).toBe("+1");
    expect(normalizeCallingCode("1")).toBe("+1");
    expect(normalizeCallingCode("")).toBe("+");
    expect(normalizeCallingCode("+3 3")).toBe("+33");
  });
});

describe("parseCountryFromE164", () => {
  const all = COUNTRY_PHONE_DATA;

  it("resolves the longest matching calling code", () => {
    expect(parseCountryFromE164("+33612345678", all)?.code).toBe("FR");
  });

  it("prefers the active country when several share a calling code", () => {
    // "+1" is US, CA, AG, ... — without a preference the first catalog entry wins.
    expect(parseCountryFromE164("+12025550123", all, "US")?.code).toBe("US");
    expect(parseCountryFromE164("+12025550123", all, "AG")?.code).toBe("AG");
    // No preference falls back to the first "+1" entry in the dataset.
    expect(parseCountryFromE164("+12025550123", all)?.code).toBe(AG.code === "AG" ? "AG" : "AG");
  });

  it("returns null for non-E.164 input", () => {
    expect(parseCountryFromE164("2025550123", all)).toBeNull();
    expect(parseCountryFromE164("+", all)).toBeNull();
  });
});

describe("validateExtractedPhone", () => {
  it("accepts valid numbers and rejects junk", () => {
    expect(validateExtractedPhone("2025550123", US)).toBe(true);
    expect(validateExtractedPhone("12", US)).toBe(false);
    expect(validateExtractedPhone("", US)).toBe(false);
  });

  it("accepts a trunk-prefixed number typed with or without the 0 (AU)", () => {
    expect(validateExtractedPhone("412345678", AU)).toBe(true);
    expect(validateExtractedPhone("0412345678", AU)).toBe(true);
  });
});

describe("locale + catalog helpers", () => {
  it("extracts the region from a locale", () => {
    expect(getCountryFromLocale("en-US")).toBe("US");
    expect(getCountryFromLocale("fr_FR")).toBe("FR");
    expect(getCountryFromLocale("en")).toBeNull();
    expect(getCountryFromLocale("xx-ZZ")).toBeNull();
  });

  it("filters and orders the catalog by allowedCountries", () => {
    const subset = getCountryPhoneCatalog(["FR", "US"]);
    expect(subset.map((c) => c.code)).toEqual(["FR", "US"]);
    expect(getCountryPhoneCatalog().length).toBe(250);
  });
});
