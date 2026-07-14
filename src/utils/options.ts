// Builds the list of selectable countries for the picker. Kept separate from
// the component so the (Intl-powered) localization and search-label logic is
// testable in isolation and doesn't drag JSX into the phone utilities.

import type { CountryCode } from 'country-data-ts/countries';
import type { CountryPhoneConfig } from 'country-data-ts/phone-data';
import { getUniqueAreaCode } from './areaCodes';
import { getCountryPhoneCatalog } from './phoneData';
import { formatAreaCode, getNationalMask } from './phoneMask';

/**
 * A single selectable country in the picker: its phone config, a (possibly
 * localized) display name, and a pre-lowercased label used for search matching.
 */
export type CountryOption = {
  config: CountryPhoneConfig;
  /** Localized display name, falling back to the dataset's English name. */
  name: string;
  /** `"${name} ${code} ${callingCode} ${areaCode?}"` folded for substring search (see {@link normalizeForSearch}). */
  searchableLabel: string;
  /**
   * The single area-code prefix (raw digits) that pins this country within a
   * shared calling code (e.g. "1481" for Guernsey under "+44"), when exactly one
   * exists. `undefined` for default countries, multi-prefix countries, and
   * unshared codes. Used to prefill the national field and derive E.164 when
   * such a country is selected.
   */
  areaCode?: string;
  /**
   * The area code formatted through the country's mask for display — e.g.
   * "(242)" for the Bahamas, "1481" for Guernsey. `undefined` when `areaCode`
   * is. Shown beside the calling code in the picker and used as the seeded
   * national display value on selection.
   */
  areaCodeDisplay?: string;
};

/**
 * Folds a string for diacritic-insensitive substring search: lowercased with
 * combining marks stripped, so "cote" matches "Côte d'Ivoire" and "reunion"
 * matches "Réunion". Applied to both the option's `searchableLabel` and the
 * user's query so the two are compared on the same footing.
 */
export function normalizeForSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

/**
 * Localizes a country name via `Intl.DisplayNames` when available (e.g. "DE" in
 * an `fr` locale → "Allemagne"), falling back to the provided English name on
 * older runtimes that lack `Intl.DisplayNames` (some Hermes builds) or an
 * unmapped code.
 */
export function getRegionLabel(locale: string, code: CountryCode, fallbackName: string): string {
  if (typeof Intl === 'undefined' || typeof Intl.DisplayNames !== 'function') return fallbackName;

  try {
    const regionNames = new Intl.DisplayNames([locale], { type: 'region' });
    return regionNames.of(code) ?? fallbackName;
  } catch {
    return fallbackName;
  }
}

/**
 * Builds the picker's country options. Names are localized to `locale`.
 *
 * Ordering follows `allowedCountries`: when it's given, options come back in
 * exactly that order, so a consumer can float likely countries to the top
 * (`["US", "CA", "GB", …]`). When it's omitted, the full catalog is sorted
 * alphabetically by localized name using the locale's collation.
 */
export function buildCountryOptions(locale: string, allowedCountries?: readonly CountryCode[]): CountryOption[] {
  const collator = new Intl.Collator(locale);

  const options = getCountryPhoneCatalog(allowedCountries).map((config) => {
    const name = getRegionLabel(locale, config.code, config.name);
    const areaCode = getUniqueAreaCode(config);
    const areaCodeDisplay = areaCode ? formatAreaCode(getNationalMask(config), areaCode) : undefined;
    const searchableLabel = normalizeForSearch(`${name} ${config.code} ${config.callingCode}${areaCode ? ` ${areaCode}` : ''}`);
    return { config, name, searchableLabel, areaCode, areaCodeDisplay };
  });

  // A caller-supplied allowedCountries list is authoritative order (getCountryPhoneCatalog
  // already returns it in that order); only the full catalog is alphabetized.
  return allowedCountries ? options : options.sort((a, b) => collator.compare(a.name, b.name));
}
