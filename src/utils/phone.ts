// Dependency-free phone helpers: E.164 conversion, per-country validation,
// locale → country resolution, and the mask formatter that powers live input
// formatting. Ported from the internal offkeep PhoneInput library, with the
// mask formatter rewritten to correctly emit leading literals (e.g. the "(" in
// the US "([000]) [000]-[0000]" mask) instead of dropping them.

import { COUNTRY_CODES, type CountryCode, isCountryCode } from "../data/countries";
import {
  CALLING_CODE_AREA_PREFIXES,
  CALLING_CODE_DEFAULTS,
  COUNTRY_PHONE_DATA,
  type CountryPhoneConfig,
} from "../data/phone-data";

export { COUNTRY_CODES, type CountryCode, isCountryCode } from "../data/countries";
export {
  CALLING_CODE_AREA_PREFIXES,
  CALLING_CODE_DEFAULTS,
  COUNTRY_PHONE_DATA,
  type CountryPhoneConfig,
  NANP_AREA_CODE_TO_COUNTRY,
} from "../data/phone-data";

/** Returns the default (biggest) country for a shared calling code, if any. */
export function getDefaultCountryForCallingCode(callingCode: string): CountryCode | undefined {
  return CALLING_CODE_DEFAULTS.get(callingCode);
}

/**
 * Resolves the country implied by the leading national digits (area code) for a
 * shared calling code, using `CALLING_CODE_AREA_PREFIXES`. The longest matching
 * prefix wins. Returns `undefined` for unshared codes, partial input that
 * matches no full prefix, or prefixes belonging to the default country.
 */
function resolveAreaCountry(callingCode: string, nationalDigits: string): CountryCode | undefined {
  const prefixes = CALLING_CODE_AREA_PREFIXES.get(callingCode);
  if (!prefixes) return undefined;

  let bestPrefix = "";
  let bestCode: CountryCode | undefined;
  for (const [prefix, code] of prefixes) {
    if (prefix.length > bestPrefix.length && nationalDigits.startsWith(prefix)) {
      bestPrefix = prefix;
      bestCode = code;
    }
  }
  return bestCode;
}

const catalog: readonly CountryPhoneConfig[] = COUNTRY_PHONE_DATA;

/** Fast lookup of a country's phone config by ISO code. */
const CONFIG_BY_CODE: ReadonlyMap<CountryCode, CountryPhoneConfig> = new Map(catalog.map((config) => [config.code, config]));

/** Returns the phone config for a country code, or `undefined` when unknown. */
export function getCountryPhoneConfig(code: CountryCode): CountryPhoneConfig | undefined {
  return CONFIG_BY_CODE.get(code);
}

function getCallingCodeDigits(callingCode: string) {
  return callingCode.replace(/\D/g, "");
}

/** Strips every non-digit character, leaving only `0-9`. */
export function normalizeNationalDigits(value: string) {
  return value.replace(/\D/g, "");
}

function trimTrunkPrefix(value: string, trunkPrefix: string | null) {
  if (!trunkPrefix || !value.startsWith(trunkPrefix)) return value;
  return value.slice(trunkPrefix.length);
}

/**
 * Returns the phone catalog, optionally filtered to `allowedCountries`
 * (preserving the caller's order when a list is given, otherwise the built-in
 * alphabetical-by-code order of the dataset).
 */
export function getCountryPhoneCatalog(allowedCountries?: readonly CountryCode[]): readonly CountryPhoneConfig[] {
  if (!allowedCountries || allowedCountries.length === 0) return catalog;

  const configs: CountryPhoneConfig[] = [];
  for (const code of allowedCountries) {
    const config = CONFIG_BY_CODE.get(code);
    if (config) configs.push(config);
  }
  return configs;
}

/** Extracts the ISO country from a BCP-47 locale (e.g. "en-US" → "US"), or null. */
export function getCountryFromLocale(locale: string): CountryCode | null {
  const segments = locale.split(/[-_]/);
  // The region subtag follows the language (and optional script): skip the
  // language tag, then take the first 2-letter segment — that's the ISO region.
  // Handles 3-segment locales like "zh-Hans-CN" and "en-Latn-US", which the old
  // `segments[1]` lookup missed. A bare language tag ("es") has no region and
  // returns null, even when the language code happens to match a country code.
  for (let index = 1; index < segments.length; index += 1) {
    const segment = segments[index]?.toUpperCase();
    if (segment && segment.length === 2 && isCountryCode(segment)) return segment;
  }
  return null;
}

/**
 * Given an E.164 value, finds the country whose calling code it starts with.
 * Longer calling codes are tested first so "+1" doesn't shadow "+1242". When
 * several countries share a calling code, the number is disambiguated by:
 *   1. Area code — the leading national digits pin the country via
 *      `CALLING_CODE_AREA_PREFIXES` (e.g. +1 204… → Canada, +44 1481… →
 *      Guernsey, +7 7… → Kazakhstan).
 *   2. The default (biggest) country for the code — see `CALLING_CODE_DEFAULTS`
 *      (e.g. +1 → US, +44 → GB), instead of the first catalogue entry.
 *   3. The first catalogue entry sharing the code, as a last resort.
 */
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

export function parseCountryFromE164(
  value: string,
  countries: readonly CountryPhoneConfig[],
  preferred?: CountryCode | null,
): CountryPhoneConfig | null {
  const normalized = value.trim();
  if (!normalized.startsWith("+")) return null;

  const digits = normalizeNationalDigits(normalized);
  if (!digits) return null;

  // When the currently-selected country already shares this calling code, keep
  // it — many countries share a code (every NANP "+1" country, +44 for GB and
  // its crown dependencies, +7 for Russia and Kazakhstan), and without this the
  // parser would flip the selection mid-type. Area-code recognition is allowed
  // to override the sticky preference: typing "+1 204…" while US is selected
  // switches to Canada, because the area code unambiguously belongs to Canada.
  if (preferred) {
    const preferredConfig = countries.find((country) => country.code === preferred);
    if (preferredConfig) {
      const ccDigits = getCallingCodeDigits(preferredConfig.callingCode);
      if (digits.startsWith(ccDigits)) {
        const areaCountry = resolveAreaCountry(preferredConfig.callingCode, digits.slice(ccDigits.length));
        if (areaCountry && areaCountry !== preferred) {
          const override = countries.find((country) => country.code === areaCountry);
          if (override) return override;
        }
        return preferredConfig;
      }
    }
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

/**
 * Builds the E.164 string (`+<calling code><national>`) from an extracted
 * national number. The country's trunk prefix (e.g. the leading "0" many
 * countries dial nationally) is dropped, since E.164 never includes it.
 */
export function toE164(extractedNational: string, country: CountryPhoneConfig) {
  const national = normalizeNationalDigits(extractedNational);
  if (!national) return "";

  return `${country.callingCode}${trimTrunkPrefix(national, country.trunkPrefix)}`;
}

/**
 * Recovers the national digit string from an E.164 value by stripping the
 * country's calling code. Any leading trunk prefix is preserved as typed.
 */
export function nationalFromE164(e164Value: string, country: CountryPhoneConfig) {
  const digits = normalizeNationalDigits(e164Value);
  if (!digits) return "";

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

  if (country.trunkPrefix && !national.startsWith(country.trunkPrefix)) {
    return validator.test(`${country.trunkPrefix}${national}`);
  }

  return false;
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
 * Strips the leading `+<calling code> ` prefix from a full mask, returning just
 * the national portion. Masks store the whole thing (e.g. "+1 ([000]) [000]-[0000]")
 * but the national TextInput only formats the part after the calling code.
 */
export function getNationalMask(config: CountryPhoneConfig) {
  const prefix = `${config.callingCode} `;
  if (config.mask.startsWith(prefix)) return config.mask.slice(prefix.length);
  return config.mask;
}

/**
 * Counts the required digit slots (`0`) inside a mask, ignoring optional slots
 * (`9`). Used to detect when a national number is fully entered so validation
 * can auto-fire.
 */
export function countRequiredMaskDigits(mask: string) {
  let count = 0;
  let inBracket = false;

  for (const char of mask) {
    if (char === "[") inBracket = true;
    else if (char === "]") inBracket = false;
    else if (inBracket && char === "0") count += 1;
  }

  return count;
}

/**
 * Counts every digit slot in a mask — both required (`0`) and optional (`9`).
 * This is the maximum number of digits the mask can display, used to stop the
 * national field from accepting more digits than it can format (so the stored
 * value never diverges from what the user sees).
 */
export function countMaskDigitSlots(mask: string) {
  let count = 0;
  let inBracket = false;

  for (const char of mask) {
    if (char === "[") inBracket = true;
    else if (char === "]") inBracket = false;
    else if (inBracket && (char === "0" || char === "9")) count += 1;
  }

  return count;
}

/** Normalizes free-form calling-code input into `+<digits>` (or bare `+` when empty). */
export function normalizeCallingCode(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits ? `+${digits}` : "+";
}

/**
 * Formats a run of digits against a mask, returning the display string.
 *
 * Mask grammar (national portion):
 * - `[0]` — a required digit slot.
 * - `[9]` — an optional digit slot (consumed only if a digit remains).
 * - any other character (space, `(`, `)`, `-`, `.`) — a literal separator.
 *
 * Literals are buffered and only flushed once the *next* digit is emitted, so a
 * trailing separator never dangles while the user is mid-type. Crucially, this
 * also emits *leading* literals (e.g. the "(" before the area code in the US
 * mask) as soon as the first digit arrives — the offkeep original dropped them.
 *
 * This is the digit-only face of {@link conformToMask}: non-digits in
 * `inputDigits` are stripped first, so the result matches what `conformToMask`
 * produces for the same digit sequence.
 */
export function applyPhoneMask(mask: string, inputDigits: string) {
  return conformToMask(mask, normalizeNationalDigits(inputDigits));
}

function isDigitChar(char: string): boolean {
  return char >= "0" && char <= "9";
}

/**
 * Conforms free-form text (as typed or pasted) to a mask, returning the display
 * string. Unlike {@link applyPhoneMask}, which only ever sees digits, this walks
 * the **raw text** so a separator the user explicitly types is honored: typing
 * `)` right after the area code reveals it at once, instead of being stripped
 * and only reappearing once the next digit "earns" it.
 *
 * Rules, walked in lockstep with the mask:
 * - A mask literal matched by the next text char is emitted immediately
 *   (pending literals flushed first) — this is what reveals a typed separator.
 * - A mask literal met by a digit is buffered as pending, auto-inserted when
 *   the slot consumes that digit (same behavior as `applyPhoneMask`).
 * - A mask literal met by an unrelated char drops the char.
 * - A required slot `[0]` met by a digit emits it; met by a non-digit it drops
 *   the char and **stays on the slot**, so a misplaced separator inside a group
 *   (e.g. `20-4`) doesn't push later digits into the wrong group.
 * - An optional slot `[9]` met by a non-digit is skipped, leaving the char for
 *   the next token (no `[9]` slots exist in the dataset today, but the grammar
 *   allows them).
 * - Digit emission stops once `maxDigits` is reached.
 *
 * For digit-only input the result is identical to `applyPhoneMask`.
 */
export function conformToMask(mask: string, text: string, maxDigits = Infinity): string {
  if (!text) return "";

  let result = "";
  let pendingLiterals = "";
  let emitted = 0;
  let textIdx = 0;
  let maskIdx = 0;

  while (maskIdx < mask.length && textIdx < text.length) {
    const maskChar = mask[maskIdx];

    if (maskChar === "[") {
      const closeIndex = mask.indexOf("]", maskIdx);
      if (closeIndex === -1) break;
      const token = mask.slice(maskIdx + 1, closeIndex);

      let slotIdx = 0;
      while (slotIdx < token.length && textIdx < text.length) {
        const slot = token[slotIdx];
        const char = text[textIdx];
        if (char === undefined) break;

        if (slot !== "0" && slot !== "9") {
          slotIdx += 1;
          continue;
        }

        if (isDigitChar(char)) {
          if (emitted >= maxDigits) {
            textIdx = text.length;
            break;
          }
          result += pendingLiterals + char;
          pendingLiterals = "";
          emitted += 1;
          textIdx += 1;
          slotIdx += 1;
        } else if (slot === "9") {
          // Optional slot with no digit available: skip it, leave the char for
          // the next mask token to evaluate.
          slotIdx += 1;
        } else {
          // Required slot met by a non-digit: drop the char, stay on the slot so
          // the next digit still fills it (a misplaced "-" inside the area code
          // must not shift later digits into the next group).
          textIdx += 1;
        }
      }

      maskIdx = closeIndex + 1;
      continue;
    }

    // Literal separator.
    const char = text[textIdx];
    if (char === undefined) break;
    if (char === maskChar) {
      // The user typed this separator — reveal it immediately.
      result += pendingLiterals + maskChar;
      pendingLiterals = "";
      textIdx += 1;
      maskIdx += 1;
    } else if (isDigitChar(char)) {
      // A digit arrived — buffer the literal until the slot consumes it.
      pendingLiterals += maskChar;
      maskIdx += 1;
    } else {
      // Unrelated character — drop it.
      textIdx += 1;
    }
  }

  return result;
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
  if (national.length > max && national.startsWith(config.trunkPrefix) && maskExcludesTrunk(config)) {
    return national.slice(config.trunkPrefix.length);
  }
  return national;
}

export interface ResolvedPaste {
  country: CountryCode;
  national: string;
  /** `true` when the text was transformed (country switched or trunk stripped);
   *  the caller should format `national` directly. `false` means "keep the raw
   *  text" so user-typed separators are preserved by `conformToMask`. */
  normalized: boolean;
}

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
  if (!digits) return { country: selected.code, national: "", normalized: false };

  const selectedMax = countMaskDigitSlots(getNationalMask(selected));
  const trimmed = text.trim();

  // 1) Explicit international format ("+…"). Parse the country (with the current
  //    selection as the sticky preference) and recover the national digits.
  if (trimmed.startsWith("+")) {
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
      if (national.length <= parsedMax) {
        return { country: parsed.code, national, normalized: true };
      }
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
  ) {
    return { country: selected.code, national: digits.slice(selected.trunkPrefix.length), normalized: true };
  }

  // 4) Default: keep the current country. The caller conforms the raw text so
  //    any separators the user typed are preserved.
  return { country: selected.code, national: digits, normalized: false };
}
