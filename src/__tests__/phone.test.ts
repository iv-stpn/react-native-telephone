import { describe, expect, it } from "vitest";
import { COUNTRY_PHONE_DATA, type CountryPhoneConfig, NANP_AREA_CODE_TO_COUNTRY } from "../data/phone-data";
import {
  applyPhoneMask,
  conformToMask,
  countMaskDigitSlots,
  countRequiredMaskDigits,
  getCountryFromLocale,
  getCountryPhoneCatalog,
  getCountryPhoneConfig,
  getDefaultCountryForCallingCode,
  getNationalMask,
  nationalFromE164,
  normalizeCallingCode,
  normalizeNationalDigits,
  parseCountryFromE164,
  resolvePastedNational,
  toE164,
  validateExtractedPhone,
} from "../utils/phone";

// A handful of countries we lean on across the suite, resolved once.
const US = getCountryPhoneConfig("US") as CountryPhoneConfig;
const FR = getCountryPhoneConfig("FR") as CountryPhoneConfig;
const AU = getCountryPhoneConfig("AU") as CountryPhoneConfig; // trunk prefix "0"
const GB = getCountryPhoneConfig("GB") as CountryPhoneConfig; // trunk prefix "0", mask INCLUDES the 0
const DE = getCountryPhoneConfig("DE") as CountryPhoneConfig; // trunk prefix "0", mask INCLUDES the 0

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

  it("defaults shared calling codes to the biggest country, not the first entry", () => {
    // No preference: +1 → US (was Antigua, the alphabetical first), +44 → GB,
    // +7 → RU. A US area code (202) keeps +1 on the US default.
    expect(parseCountryFromE164("+12025550123", all)?.code).toBe("US");
    expect(parseCountryFromE164("+447700900123", all)?.code).toBe("GB");
    expect(parseCountryFromE164("+79123456789", all)?.code).toBe("RU");
  });

  it("recognizes the +1 country from its NANP area code", () => {
    // 204 is Canadian, 268 is Antigua, 809 is Dominican Republic.
    expect(parseCountryFromE164("+12042345678", all)?.code).toBe("CA");
    expect(parseCountryFromE164("+12681234567", all)?.code).toBe("AG");
    expect(parseCountryFromE164("+18091234567", all)?.code).toBe("DO");
    // A US area code resolves to the US default.
    expect(parseCountryFromE164("+12025550123", all)?.code).toBe("US");
  });

  it("overrides the sticky preference when the area code belongs elsewhere", () => {
    // US is selected, but 204 is a Canadian area code → switch to Canada.
    expect(parseCountryFromE164("+12042345678", all, "US")?.code).toBe("CA");
    // A US area code keeps the sticky US selection.
    expect(parseCountryFromE164("+12025550123", all, "US")?.code).toBe("US");
    // Antigua sticks for a US-area-code number (area code 202 isn't Antiguan).
    expect(parseCountryFromE164("+12025550123", all, "AG")?.code).toBe("AG");
  });

  it("does not flip on partial area codes", () => {
    // Only two national digits typed — not enough to read an area code, so the
    // sticky preference wins.
    expect(parseCountryFromE164("+120", all, "US")?.code).toBe("US");
  });

  it("returns null for non-E.164 input", () => {
    expect(parseCountryFromE164("2025550123", all)).toBeNull();
    expect(parseCountryFromE164("+", all)).toBeNull();
  });
});

describe("parseCountryFromE164 — non-NANP shared codes", () => {
  const all = COUNTRY_PHONE_DATA;

  it("recognizes +44 crown dependencies by their area code", () => {
    expect(parseCountryFromE164("+441481123456", all)?.code).toBe("GG");
    expect(parseCountryFromE164("+441534123456", all)?.code).toBe("JE");
    expect(parseCountryFromE164("+441624123456", all)?.code).toBe("IM");
    // A mainland UK mobile stays on the GB default.
    expect(parseCountryFromE164("+447700900123", all)?.code).toBe("GB");
  });

  it("recognizes +7 Kazakhstan by the leading 6/7", () => {
    expect(parseCountryFromE164("+77710009998", all)?.code).toBe("KZ");
    expect(parseCountryFromE164("+76123456789", all)?.code).toBe("KZ");
    // A Russian mobile (9xx) stays on the RU default.
    expect(parseCountryFromE164("+79123456789", all)?.code).toBe("RU");
  });

  it("recognizes the remaining shared-code territories", () => {
    expect(parseCountryFromE164("+262639123456", all)?.code).toBe("YT"); // Mayotte
    expect(parseCountryFromE164("+3581851234", all)?.code).toBe("AX"); // Åland
    expect(parseCountryFromE164("+4779123456", all)?.code).toBe("SJ"); // Svalbard
    expect(parseCountryFromE164("+212528123456", all)?.code).toBe("EH"); // Western Sahara
    expect(parseCountryFromE164("+390669812345", all)?.code).toBe("VA"); // Vatican
    expect(parseCountryFromE164("+672112345", all)?.code).toBe("AQ"); // Australian Antarctic
    // +599: 7 → Bonaire (BQ), 9 → Curaçao (default).
    expect(parseCountryFromE164("+5997123456", all)?.code).toBe("BQ");
    expect(parseCountryFromE164("+5999123456", all)?.code).toBe("CW");
  });

  it("overrides the sticky preference for non-NANP shared codes too", () => {
    // GB selected, but 1534 is Jersey → switch.
    expect(parseCountryFromE164("+441534123456", all, "GB")?.code).toBe("JE");
    // RU selected, but a 7-prefixed number is Kazakhstan → switch.
    expect(parseCountryFromE164("+77710009998", all, "RU")?.code).toBe("KZ");
    // A Russian 9xx number keeps the sticky RU selection.
    expect(parseCountryFromE164("+79123456789", all, "RU")?.code).toBe("RU");
  });

  it("does not flip on partial prefixes", () => {
    // "+44 14" isn't enough to read a 4-digit dependency area code.
    expect(parseCountryFromE164("+4414", all, "GB")?.code).toBe("GB");
  });
});

describe("calling-code defaults", () => {
  it("maps shared calling codes to the biggest country", () => {
    expect(getDefaultCountryForCallingCode("+1")).toBe("US");
    expect(getDefaultCountryForCallingCode("+44")).toBe("GB");
    expect(getDefaultCountryForCallingCode("+7")).toBe("RU");
    expect(getDefaultCountryForCallingCode("+590")).toBe("GP");
    expect(getDefaultCountryForCallingCode("+672")).toBe("NF");
  });

  it("returns undefined for unshared / unknown calling codes", () => {
    expect(getDefaultCountryForCallingCode("+33")).toBeUndefined();
    expect(getDefaultCountryForCallingCode("+999")).toBeUndefined();
  });

  it("every default ISO code has a matching NANP area-code entry only for +1", () => {
    // Sanity: the NANP area-code map covers Canada and the +1 dependencies.
    expect(NANP_AREA_CODE_TO_COUNTRY.get("204")).toBe("CA");
    expect(NANP_AREA_CODE_TO_COUNTRY.get("268")).toBe("AG");
    expect(NANP_AREA_CODE_TO_COUNTRY.get("809")).toBe("DO");
    // US area codes are deliberately absent (US is the +1 default).
    expect(NANP_AREA_CODE_TO_COUNTRY.has("202")).toBe(false);
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

describe("conformToMask", () => {
  const usMask = getNationalMask(US); // "([000]) [000]-[0000]"

  it("matches applyPhoneMask for digit-only input", () => {
    expect(conformToMask(usMask, "2")).toBe(applyPhoneMask(usMask, "2"));
    expect(conformToMask(usMask, "2025550123")).toBe(applyPhoneMask(usMask, "2025550123"));
    expect(conformToMask(usMask, "")).toBe("");
  });

  it("reveals a typed separator before the next digit earns it", () => {
    // Typing ")" right after the area code shows it immediately, instead of
    // swallowing it until the next digit arrives.
    expect(conformToMask(usMask, "(204)")).toBe("(204)");
    // A typed space after the closing paren is honored too.
    expect(conformToMask(usMask, "(204) ")).toBe("(204) ");
    expect(conformToMask(usMask, "(204) 2")).toBe("(204) 2");
  });

  it("drops a misplaced separator inside a group and keeps digits aligned", () => {
    // The "-" inside the area code is dropped; the "4" still fills slot 3.
    expect(conformToMask(usMask, "20-4")).toBe("(204");
    // A "-" after a complete area code is dropped and the ") " auto-inserts.
    expect(conformToMask(usMask, "204-234")).toBe("(204) 234");
  });

  it("caps digit emission at maxDigits", () => {
    expect(conformToMask(usMask, "2042342222999", 10)).toBe("(204) 234-2222");
    // Without maxDigits the surplus digits are formatted up to the mask's end.
    expect(conformToMask(usMask, "2042342222999")).toBe("(204) 234-2222");
  });

  it("drops unrelated characters", () => {
    expect(conformToMask(usMask, "abc204")).toBe("(204");
    expect(conformToMask(usMask, ")204")).toBe("(204");
  });
});

describe("resolvePastedNational", () => {
  const all = COUNTRY_PHONE_DATA;
  const allSet = new Set(all.map((c) => c.code));

  it("parses an international paste and switches country by area code", () => {
    // "+1 204…" is a Canadian number → switch to Canada, national "2042342222".
    const r = resolvePastedNational("+1 (204) 234-2222", US, all, allSet);
    expect(r).toEqual({ country: "CA", national: "2042342222", normalized: true });
  });

  it("keeps a US area code on the US selection", () => {
    const r = resolvePastedNational("+1 (202) 555-0123", US, all, allSet);
    expect(r).toEqual({ country: "US", national: "2025550123", normalized: true });
  });

  it("peels the selected country's calling code when the number is too long (no plus)", () => {
    // "1 204 234 2222" while US is selected → peel the "1", area 204 → Canada.
    const r = resolvePastedNational("1 204 234 2222", US, all, allSet);
    expect(r).toEqual({ country: "CA", national: "2042342222", normalized: true });
  });

  it("parses a +44 paste and strips a stray trunk prefix", () => {
    // GB mask includes the trunk, so the "0" is NOT stripped here.
    const r = resolvePastedNational("+44 7700 900123", US, all, allSet);
    expect(r.country).toBe("GB");
    expect(r.national).toBe("7700900123");
    expect(r.normalized).toBe(true);
  });

  it("strips the trunk prefix for a country whose mask excludes it (FR)", () => {
    // FR mask excludes the trunk "0"; pasting "0612345678" strips it.
    expect(resolvePastedNational("0612345678", FR, all, allSet)).toEqual({
      country: "FR",
      national: "612345678",
      normalized: true,
    });
    // Same via the international form "+33 0612345678".
    expect(resolvePastedNational("+33 0612345678", FR, all, allSet)).toEqual({
      country: "FR",
      national: "612345678",
      normalized: true,
    });
  });

  it("does not strip the trunk when the mask includes it (GB)", () => {
    // GB's mask begins with the trunk "0", so a national "0207946..." keeps it.
    const r = resolvePastedNational("07700 900123", GB, all, allSet);
    expect(r.country).toBe("GB");
    expect(r.national).toBe("07700900123");
    expect(r.normalized).toBe(false);
  });

  it("does not misread a national number as a foreign calling code", () => {
    // Pasting a US-formatted "(204) 234-2222" into a France field must NOT be
    // peeled to Egypt ("+20…"); it stays on France as national digits.
    const r = resolvePastedNational("(204) 234-2222", FR, all, allSet);
    expect(r).toEqual({ country: "FR", national: "2042342222", normalized: false });
  });

  it("returns empty national for blank input", () => {
    expect(resolvePastedNational("", US, all, allSet)).toEqual({
      country: "US",
      national: "",
      normalized: false,
    });
  });

  it("keeps a fitting national number on the current country (no transform)", () => {
    const r = resolvePastedNational("(204) 234-2222", US, all, allSet);
    expect(r).toEqual({ country: "US", national: "2042342222", normalized: false });
  });
});

// Masks whose example includes the trunk must have enough slots to display the
// full national number — otherwise the trailing digit is silently dropped on
// paste/type. DE and GB previously had trunkless-sized masks with trunk-bearing
// examples.
describe("trunk-bearing masks fit their example (DE/GB regression)", () => {
  const all = COUNTRY_PHONE_DATA;
  const allSet = new Set(all.map((c) => c.code));

  it("DE mask holds the full trunk-bearing example", () => {
    const mask = getNationalMask(DE);
    expect(countMaskDigitSlots(mask)).toBe(12);
    expect(applyPhoneMask(mask, "015123456789")).toBe("0151 23456789");
  });

  it("GB mask holds the full trunk-bearing example", () => {
    const mask = getNationalMask(GB);
    expect(countMaskDigitSlots(mask)).toBe(11);
    expect(applyPhoneMask(mask, "07700900123")).toBe("0770 0900123");
  });

  it("does not truncate a national paste that includes the trunk (DE)", () => {
    // National form with trunk: no country switch, no transform — but the digits
    // must survive intact (not sliced to the old 11-slot mask).
    const r = resolvePastedNational("015123456789", DE, all, allSet);
    expect(r.national).toBe("015123456789");
    expect(r.normalized).toBe(false);
    expect(validateExtractedPhone(r.national, DE)).toBe(true);
  });

  it("does not truncate a national paste that includes the trunk (GB)", () => {
    const r = resolvePastedNational("07700900123", GB, all, allSet);
    expect(r.national).toBe("07700900123");
    expect(r.normalized).toBe(false);
    expect(validateExtractedPhone(r.national, GB)).toBe(true);
  });
});
