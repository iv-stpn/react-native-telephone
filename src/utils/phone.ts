// Dependency-free phone helpers: E.164 conversion, per-country validation,
// locale → country resolution, and the mask formatter that powers live input
// formatting. Ported from the internal offkeep PhoneInput library, with the
// mask formatter rewritten to correctly emit leading literals (e.g. the "(" in
// the US "([000]) [000]-[0000]" mask) instead of dropping them.

import { COUNTRY_CODES, type CountryCode, isCountryCode } from "../data/countries";
import { COUNTRY_PHONE_DATA, type CountryPhoneConfig } from "../data/phone-data";

export { COUNTRY_CODES, type CountryCode, isCountryCode } from "../data/countries";
export { COUNTRY_PHONE_DATA, type CountryPhoneConfig } from "../data/phone-data";

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
  const region = segments[1]?.toUpperCase();
  if (region?.length !== 2) return null;
  return isCountryCode(region) ? region : null;
}

/**
 * Given an E.164 value, finds the country whose calling code it starts with.
 * Longer calling codes are tested first so "+1" doesn't shadow "+1242", and
 * (like the source data) the first catalog entry wins when several countries
 * share a calling code (e.g. US/CA both "+1").
 */
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
  // it. Many countries share a code (every NANP "+1" country, or +44 for GB and
  // its crown dependencies), and without this the parser would snap to the first
  // catalogue entry — flipping e.g. a US selection to Antigua the instant a "+1"
  // number is typed. Preferring the active selection disambiguates in the user's
  // favour; the plain calling-code match below still applies for external values.
  if (preferred) {
    const preferredConfig = countries.find((country) => country.code === preferred);
    if (preferredConfig && digits.startsWith(getCallingCodeDigits(preferredConfig.callingCode))) {
      return preferredConfig;
    }
  }

  const sorted = [...countries].sort(
    (a, b) => getCallingCodeDigits(b.callingCode).length - getCallingCodeDigits(a.callingCode).length,
  );

  return sorted.find((country) => digits.startsWith(getCallingCodeDigits(country.callingCode))) ?? null;
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

  const validator = new RegExp(country.nationalRegex);
  if (validator.test(national)) return true;

  if (country.trunkPrefix && !national.startsWith(country.trunkPrefix)) {
    return validator.test(`${country.trunkPrefix}${national}`);
  }

  return false;
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
 */
export function applyPhoneMask(mask: string, inputDigits: string) {
  const digits = normalizeNationalDigits(inputDigits);
  if (!digits) return "";

  let digitIndex = 0;
  let masked = "";
  // Literals seen since the last emitted digit; flushed just before the next one.
  let pendingLiterals = "";

  for (let index = 0; index < mask.length; index += 1) {
    const char = mask[index];

    if (char === "[") {
      const closeIndex = mask.indexOf("]", index);
      if (closeIndex === -1) break;

      const token = mask.slice(index + 1, closeIndex);
      for (const slot of token) {
        const digit = digits[digitIndex];

        if (slot === "0") {
          // Required slot: stop the moment we run out of digits.
          if (digit === undefined) return masked;
          masked += pendingLiterals + digit;
          pendingLiterals = "";
          digitIndex += 1;
        } else if (slot === "9") {
          // Optional slot: consume a digit only when one is available.
          if (digit !== undefined) {
            masked += pendingLiterals + digit;
            pendingLiterals = "";
            digitIndex += 1;
          }
        }
      }

      index = closeIndex;
      continue;
    }

    // Literal separator — hold it until the next digit is actually emitted.
    pendingLiterals += char;
  }

  return masked;
}
