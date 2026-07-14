// Area-code logic for shared calling codes: pinning a country by its leading
// national digits and deciding whether a national number belongs to a country.
// Its only external dependency is CALLING_CODE_AREA_PREFIXES; the default-country
// lookup it needs comes from ./callingCodeDefaults. Split from the catalog so the
// picker (which only wants getUniqueAreaCode) doesn't drag in unrelated externals.
// Re-exported from ./phone.

import type { CountryCode } from 'country-data-ts/countries';
import { CALLING_CODE_AREA_PREFIXES, type CountryPhoneConfig } from 'country-data-ts/phone-data';
import { getDefaultCountryForCallingCode } from './callingCodeDefaults';

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
