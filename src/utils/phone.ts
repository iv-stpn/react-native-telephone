// Phone parsing/E.164/validation layer: E.164 conversion, per-country
// validation, and paste resolution. The catalog/lookups live in ./phoneCatalog
// and the mask engine in ./phoneMask; both are re-exported below so the public
// ./phone entry keeps its full surface.

import type { CountryCode } from 'country-data-ts/countries';
import type { CountryPhoneConfig } from 'country-data-ts/phone-data';
import { getCallingCodeDigits, getDefaultCountryForCallingCode, resolveAreaCountry, trimTrunkPrefix } from './phoneCatalog';
import { countMaskDigitSlots, getNationalMask, normalizeNationalDigits } from './phoneMask';

// Cache of `countries` sorted by calling-code length (desc), keyed by the input
// array. parseCountryFromE164 is called on every keystroke of a controlled
// field; without this it copies and re-sorts the full 250-entry catalog each
// call. Keying on the array reference means the common case (the component's
// memoized `configs`) sorts once and reuses forever.
const sortByCallingCodeLengthCache = new WeakMap<readonly CountryPhoneConfig[], CountryPhoneConfig[]>();
function sortByCallingCodeLength(countries: readonly CountryPhoneConfig[]): CountryPhoneConfig[] {
  const cached = sortByCallingCodeLengthCache.get(countries);
  if (cached) return cached;
  const sorted = [...countries].sort(
    (a, b) => getCallingCodeDigits(b.callingCode).length - getCallingCodeDigits(a.callingCode).length,
  );
  sortByCallingCodeLengthCache.set(countries, sorted);
  return sorted;
}

// Resolves the sticky-preference match for parseCountryFromE164: when the
// preferred country shares the value's calling code, keep it — unless the area
// code unambiguously pins another country (e.g. "+1 204…" → Canada while US is
// preferred). Returns `null` when the preference doesn't apply, so the caller
// falls back to the general longest-calling-code search.
function resolvePreferredCountry(
  digits: string,
  countries: readonly CountryPhoneConfig[],
  preferred: CountryCode,
): CountryPhoneConfig | null {
  const preferredConfig = countries.find((country) => country.code === preferred);
  if (!preferredConfig) return null;

  const ccDigits = getCallingCodeDigits(preferredConfig.callingCode);
  if (!digits.startsWith(ccDigits)) return null;

  const areaCountry = resolveAreaCountry(preferredConfig.callingCode, digits.slice(ccDigits.length));
  if (areaCountry && areaCountry !== preferred) {
    const override = countries.find((country) => country.code === areaCountry);
    if (override) return override;
  }
  return preferredConfig;
}

/**
 * Picks one country from a set that all share the same calling code. The area
 * code wins outright when it pins a specific country; otherwise the hardcoded
 * default for the code is used; otherwise the first entry (the historical
 * fallback).
 */
function disambiguateSharedCode(
  digits: string,
  callingCode: string,
  candidates: readonly CountryPhoneConfig[],
): CountryPhoneConfig | null {
  const ccDigits = getCallingCodeDigits(callingCode);
  const areaCountry = resolveAreaCountry(callingCode, digits.slice(ccDigits.length));
  if (areaCountry) {
    const config = candidates.find((country) => country.code === areaCountry);
    if (config) return config;
  }

  const defaultCode = getDefaultCountryForCallingCode(callingCode);
  if (defaultCode) {
    const config = candidates.find((country) => country.code === defaultCode);
    if (config) return config;
  }

  return candidates[0] ?? null;
}

// Compiled-regex cache keyed by config. validateExtractedPhone runs on every
// keystroke (validation + onValidationChange); compiling 250 patterns each call
// is wasteful when the same configs recur.
const validatorCache = new WeakMap<CountryPhoneConfig, RegExp>();
function getValidator(country: CountryPhoneConfig): RegExp {
  let validator = validatorCache.get(country);
  if (!validator) {
    validator = new RegExp(country.nationalRegex);
    validatorCache.set(country, validator);
  }
  return validator;
}

/**
 * Whether a country's national mask excludes its trunk prefix — i.e. the
 * example number does NOT begin with the trunk. True for FR/AU/DE (users dial
 * the `0` nationally but the mask formats without it), false for GB whose mask
 * includes the `0` as its first slot.
 */
function maskExcludesTrunk(config: CountryPhoneConfig): boolean {
  if (!config.trunkPrefix) return false;
  return !normalizeNationalDigits(config.example).startsWith(config.trunkPrefix);
}

/**
 * Strips a leading trunk prefix from a national number when it overruns the
 * mask — only for countries whose mask excludes the trunk. Handles pastes like
 * `+33 0612345678` or `0612345678` so the leading `0` doesn't eat a digit slot.
 */
function stripTrunkIfOverlong(national: string, config: CountryPhoneConfig): string {
  if (!config.trunkPrefix) return national;
  const max = countMaskDigitSlots(getNationalMask(config));
  if (national.length > max && national.startsWith(config.trunkPrefix) && maskExcludesTrunk(config))
    return national.slice(config.trunkPrefix.length);
  return national;
}

export function parseCountryFromE164(
  value: string,
  countries: readonly CountryPhoneConfig[],
  preferred?: CountryCode | null,
): CountryPhoneConfig | null {
  const normalized = value.trim();
  if (!normalized.startsWith('+')) return null;

  const digits = normalizeNationalDigits(normalized);
  if (!digits) return null;

  // When the currently-selected country already shares this calling code, keep
  // it — many countries share a code (every NANP "+1" country, +44 for GB and
  // its crown dependencies, +7 for Russia and Kazakhstan), and without this the
  // parser would flip the selection mid-type.
  if (preferred) {
    const preferredMatch = resolvePreferredCountry(digits, countries, preferred);
    if (preferredMatch) return preferredMatch;
  }

  const sorted = sortByCallingCodeLength(countries);

  const match = sorted.find((country) => digits.startsWith(getCallingCodeDigits(country.callingCode)));
  if (!match) return null;

  // All countries sharing the matched calling code are equally valid prefixes;
  // disambiguate among them rather than taking the first.
  const sameCode = sorted.filter((country) => country.callingCode === match.callingCode);
  return disambiguateSharedCode(digits, match.callingCode, sameCode);
}

/**
 * Builds the E.164 string (`+<calling code><national>`) from an extracted
 * national number. The country's trunk prefix (e.g. the leading "0" many
 * countries dial nationally) is dropped, since E.164 never includes it.
 */
export function toE164(extractedNational: string, country: CountryPhoneConfig) {
  const national = normalizeNationalDigits(extractedNational);
  if (!national) return '';

  return `${country.callingCode}${trimTrunkPrefix(national, country.trunkPrefix)}`;
}

/**
 * Recovers the national digit string from an E.164 value by stripping the
 * country's calling code. Any leading trunk prefix is preserved as typed.
 */
export function nationalFromE164(e164Value: string, country: CountryPhoneConfig) {
  const digits = normalizeNationalDigits(e164Value);
  if (!digits) return '';

  const callingCodeDigits = getCallingCodeDigits(country.callingCode);
  if (digits.startsWith(callingCodeDigits)) return digits.slice(callingCodeDigits.length);

  return digits;
}

/**
 * Validates an extracted national number against the country's regex. Countries
 * whose pattern expects the trunk prefix (e.g. AU's `^0?...`) are matched both
 * with and without the prefix, so a number typed either way validates.
 */
export function validateExtractedPhone(extractedNational: string, country: CountryPhoneConfig) {
  const national = normalizeNationalDigits(extractedNational);
  if (!national) return false;

  const validator = getValidator(country);
  if (validator.test(national)) return true;

  if (country.trunkPrefix && !national.startsWith(country.trunkPrefix))
    return validator.test(`${country.trunkPrefix}${national}`);

  return false;
}

export type ResolvedPaste = {
  country: CountryCode;
  national: string;
  /** `true` when the text was transformed (country switched or trunk stripped);
   *  the caller should format `national` directly. `false` means "keep the raw
   *  text" so user-typed separators are preserved by `conformToMask`. */
  normalized: boolean;
};

/**
 * Resolves the country and national digits implied by text pasted/typed into
 * the national field, so a pasted `+1 (204) 234-2222` switches to Canada and
 * yields `2042342222` instead of being naively digit-stripped and truncated.
 *
 * Detection is deliberately conservative — country recognition only fires on an
 * explicit `+` prefix or on the *selected* country's own calling-code prefix,
 * never on arbitrary digit peeling. So pasting `(204) 234-2222` into a France
 * field is NOT misread as Egypt (`+20…`); it falls through to the default and is
 * treated as national digits for the current country.
 */
export function resolvePastedNational(
  text: string,
  selected: CountryPhoneConfig,
  countries: readonly CountryPhoneConfig[],
  allowedSet: ReadonlySet<CountryCode>,
): ResolvedPaste {
  const digits = normalizeNationalDigits(text);
  if (!digits) return { country: selected.code, national: '', normalized: false };

  const selectedMax = countMaskDigitSlots(getNationalMask(selected));
  const trimmed = text.trim();

  // 1) Explicit international format ("+…"). Parse the country (with the current
  //    selection as the sticky preference) and recover the national digits.
  if (trimmed.startsWith('+')) {
    const parsed = parseCountryFromE164(trimmed, countries, selected.code);
    if (parsed && allowedSet.has(parsed.code)) {
      const national = stripTrunkIfOverlong(nationalFromE164(trimmed, parsed), parsed);
      return { country: parsed.code, national, normalized: true };
    }
    // Unresolvable "+…" — fall through and treat the digits as national input.
  }

  // 2) The selected country's calling code is prefixed and the number is too
  //    long to be national — peel the code. Reuses area-code disambiguation,
  //    so `1 204…` while US is selected resolves to Canada.
  //
  //    The peel is only safe when the input exceeds the mask by *at least* the
  //    calling code's own digit length. Peeling consumes that many digits from
  //    the front, so a smaller excess (an overtyped digit or two, not a pasted
  //    calling code) would eat real national digits. This bites countries whose
  //    national numbers can begin with the calling code itself — Mauritania
  //    (+222, nationals start 2–4) or Russia (+7, nationals start 7) — where
  //    typing one digit past the mask used to peel "222"/"7" off the front and
  //    silently truncate "22 22 22 22 2" back to "22 22 22".
  const callingCodeDigits = getCallingCodeDigits(selected.callingCode);
  if (callingCodeDigits && digits.startsWith(callingCodeDigits) && digits.length >= selectedMax + callingCodeDigits.length) {
    const synthetic = `+${digits}`;
    const parsed = parseCountryFromE164(synthetic, countries, selected.code);
    if (parsed && allowedSet.has(parsed.code)) {
      const national = stripTrunkIfOverlong(nationalFromE164(synthetic, parsed), parsed);
      const parsedMax = countMaskDigitSlots(getNationalMask(parsed));
      if (national.length <= parsedMax) return { country: parsed.code, national, normalized: true };
    }
  }

  // 3) A national number that overruns the mask by exactly the trunk prefix
  //    (e.g. FR `0612345678` → `612345678`), only when the mask excludes the
  //    trunk.
  if (
    selected.trunkPrefix &&
    digits.startsWith(selected.trunkPrefix) &&
    digits.length === selectedMax + selected.trunkPrefix.length &&
    maskExcludesTrunk(selected) &&
    digits.length > selectedMax
  )
    return { country: selected.code, national: digits.slice(selected.trunkPrefix.length), normalized: true };

  // 4) Default: keep the current country. The caller conforms the raw text so
  //    any separators the user typed are preserved.
  return { country: selected.code, national: digits, normalized: false };
}

// biome-ignore lint/performance/noBarrelFile: re-expose country-data-ts/phone-data for convenience.
export {
  CALLING_CODE_AREA_PREFIXES,
  CALLING_CODE_DEFAULTS,
  COUNTRY_PHONE_DATA,
  type CountryPhoneConfig,
  NANP_AREA_CODE_TO_COUNTRY,
} from 'country-data-ts/phone-data';
// Re-expose the catalog layer (split into ./phoneCatalog) from the public ./phone entry.
export {
  getCountryFromLocale,
  getCountryPhoneCatalog,
  getCountryPhoneConfig,
  getDefaultCountryForCallingCode,
  getUniqueAreaCode,
  nationalBelongsToCountry,
} from './phoneCatalog';
// Re-expose the mask engine (split into ./phoneMask) from the public ./phone entry.
export {
  applyPhoneMask,
  conformToMask,
  countMaskDigitSlots,
  countRequiredMaskDigits,
  formatAreaCode,
  getNationalMask,
  normalizeCallingCode,
  normalizeNationalDigits,
} from './phoneMask';
