// Builds the list of selectable countries for the picker. Kept separate from
// the component so the (Intl-powered) localization and search-label logic is
// testable in isolation and doesn't drag JSX into the phone utilities.

import type { CountryCode } from "../data/countries";
import type { CountryPhoneConfig } from "../data/phone-data";
import { formatAreaCode, getCountryPhoneCatalog, getNationalMask, getUniqueAreaCode } from "./phone";

/**
 * A single selectable country in the picker: its phone config, a (possibly
 * localized) display name, and a pre-lowercased label used for search matching.
 */
export interface CountryOption {
  config: CountryPhoneConfig;
  /** Localized display name, falling back to the dataset's English name. */
  name: string;
  /** `"${name} ${code} ${callingCode} ${areaCode?}"` lowercased, for substring search. */
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
}

/**
 * Localizes a country name via `Intl.DisplayNames` when available (e.g. "DE" in
 * an `fr` locale → "Allemagne"), falling back to the provided English name on
 * older runtimes that lack `Intl.DisplayNames` (some Hermes builds) or an
 * unmapped code.
 */
export function getRegionLabel(locale: string, code: CountryCode, fallbackName: string): string {
  if (typeof Intl === "undefined" || typeof Intl.DisplayNames !== "function") return fallbackName;

  try {
    const regionNames = new Intl.DisplayNames([locale], { type: "region" });
    return regionNames.of(code) ?? fallbackName;
  } catch {
    return fallbackName;
  }
}

/**
 * Builds the picker's country options, optionally restricted to (and ordered
 * by) `allowedCountries`. Names are localized to `locale`; the result is sorted
 * alphabetically by localized name using the locale's collation.
 */
export function buildCountryOptions(locale: string, allowedCountries?: readonly CountryCode[]): CountryOption[] {
  const collator = new Intl.Collator(locale);

  return getCountryPhoneCatalog(allowedCountries)
    .map((config) => {
      const name = getRegionLabel(locale, config.code, config.name);
      const areaCode = getUniqueAreaCode(config);
      const areaCodeDisplay = areaCode ? formatAreaCode(getNationalMask(config), areaCode) : undefined;
      const searchableLabel = `${name} ${config.code} ${config.callingCode}${areaCode ? ` ${areaCode}` : ""}`.toLowerCase();
      return { config, name, searchableLabel, areaCode, areaCodeDisplay };
    })
    .sort((a, b) => collator.compare(a.name, b.name));
}
