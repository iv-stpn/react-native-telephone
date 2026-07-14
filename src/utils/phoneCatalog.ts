// Catalog layer: the country dataset and every lookup over it — config by ISO
// code, the filtered/ordered catalog, calling-code defaults, area-code pinning,
// and BCP-47 locale → country. Depends only on country-data-ts; sits below the
// parse/E.164 logic in ./phone (which imports from here). Split out so ./phone
// stays focused and under the file-length budget.

import { type CountryCode, isCountryCode } from 'country-data-ts/countries';
import {
  CALLING_CODE_AREA_PREFIXES,
  CALLING_CODE_DEFAULTS,
  COUNTRY_PHONE_DATA,
  type CountryPhoneConfig,
} from 'country-data-ts/phone-data';

const catalog: readonly CountryPhoneConfig[] = COUNTRY_PHONE_DATA;

/** Fast lookup of a country's phone config by ISO code. */
const CONFIG_BY_CODE: ReadonlyMap<CountryCode, CountryPhoneConfig> = new Map(catalog.map((config) => [config.code, config]));

const COUNTRY_SEGMENT_SEPARATOR_REGEX = /[-_]/;

/** Returns the default (biggest) country for a shared calling code, if any. */
export function getDefaultCountryForCallingCode(callingCode: string): CountryCode | undefined {
  return CALLING_CODE_DEFAULTS.get(callingCode);
}

/** Strips a calling code down to its bare digits (e.g. "+1" → "1"). */
export function getCallingCodeDigits(callingCode: string): string {
  return callingCode.replace(/\D/g, '');
}

/** Drops a leading trunk prefix from a national number, when present. */
export function trimTrunkPrefix(value: string, trunkPrefix: string | null): string {
  if (!(trunkPrefix && value.startsWith(trunkPrefix))) return value;
  return value.slice(trunkPrefix.length);
}

/**
 * For a country that shares a calling code and is pinned by exactly ONE area
 * prefix, returns that prefix — the leading national digits that identify the
 * country (e.g. "+44" Guernsey → "1481", "+1" Bahamas → "242").
 *
 * Returns `undefined` for:
 * - the default country of a shared code, which has no pinning prefix (e.g. GB
 *   for "+44", US for "+1");
 * - countries pinned by several prefixes, where no single area code represents
 *   the country (e.g. Kazakhstan via "6" and "7", Bonaire via "31"/"41"/"7",
 *   Canada via dozens of NANP area codes);
 * - countries that don't share a calling code at all.
 *
 * Callers use this to show the area code beside the calling code in the picker
 * and to prefill the national field when such a country is selected.
 */
export function getUniqueAreaCode(config: CountryPhoneConfig): string | undefined {
  const prefixes = CALLING_CODE_AREA_PREFIXES.get(config.callingCode);
  if (!prefixes) return;

  let matchCount = 0;
  let prefix: string | undefined;
  for (const [candidate, code] of prefixes) {
    if (code === config.code) {
      matchCount += 1;
      prefix = candidate;
    }
  }
  return matchCount === 1 ? prefix : undefined;
}

/**
 * Resolves the country implied by the leading national digits (area code) for a
 * shared calling code, using `CALLING_CODE_AREA_PREFIXES`. The longest matching
 * prefix wins. Returns `undefined` for unshared codes, partial input that
 * matches no full prefix, or prefixes belonging to the default country.
 */
export function resolveAreaCountry(callingCode: string, nationalDigits: string): CountryCode | undefined {
  const prefixes = CALLING_CODE_AREA_PREFIXES.get(callingCode);
  if (!prefixes) return;

  let bestPrefix = '';
  let bestCode: CountryCode | undefined;
  for (const [prefix, code] of prefixes) {
    if (prefix.length > bestPrefix.length && nationalDigits.startsWith(prefix)) {
      bestPrefix = prefix;
      bestCode = code;
    }
  }
  return bestCode;
}

/**
 * Whether the given national digits, under a shared calling code, belong to
 * `country` — i.e. their area-code prefix pins `country`, or (when `country`
 * is the code's default) no non-default prefix matches. Returns `true` for an
 * unshared calling code (the digits can only belong to its one country).
 *
 * Used to decide whether a typed number can carry over when the user switches
 * to another country sharing the same calling code: selecting Canada while
 * "+1 (684)" (American Samoa) is entered does not belong to Canada, so the
 * field is reset rather than carrying a foreign area code over.
 */
export function nationalBelongsToCountry(callingCode: string, nationalDigits: string, country: CountryCode): boolean {
  // Unshared calling code: no area-code disambiguation, so the digits can't
  // carry a foreign area code — they belong to the country that owns the code.
  const prefixes = CALLING_CODE_AREA_PREFIXES.get(callingCode);
  if (!prefixes) return true;

  const areaCountry = resolveAreaCountry(callingCode, nationalDigits);
  if (areaCountry === country) return true;
  if (areaCountry !== undefined) return false;
  // No non-default prefix matched: the number belongs to the code's default
  // country (if any), and only to that country.
  return getDefaultCountryForCallingCode(callingCode) === country;
}

/** Returns the phone config for a country code, or `undefined` when unknown. */
export function getCountryPhoneConfig(code: CountryCode): CountryPhoneConfig | undefined {
  return CONFIG_BY_CODE.get(code);
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
  const segments = locale.split(COUNTRY_SEGMENT_SEPARATOR_REGEX);

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
