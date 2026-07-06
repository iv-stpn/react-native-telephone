// Builds the list of selectable countries for the picker. Kept separate from
// the component so the (Intl-powered) localization and search-label logic is
// testable in isolation and doesn't drag JSX into the phone utilities.

import type { CountryCode } from "../data/countries";
import type { CountryPhoneConfig } from "../data/phone-data";
import { getCountryPhoneCatalog } from "./phone";

/**
 * A single selectable country in the picker: its phone config, a (possibly
 * localized) display name, and a pre-lowercased label used for search matching.
 */
export interface CountryOption {
  config: CountryPhoneConfig;
  /** Localized display name, falling back to the dataset's English name. */
  name: string;
  /** `"${name} ${code} ${callingCode}"` lowercased, for substring search. */
  searchableLabel: string;
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
      const searchableLabel = `${name} ${config.code} ${config.callingCode}`.toLowerCase();
      return { config, name, searchableLabel };
    })
    .sort((a, b) => collator.compare(a.name, b.name));
}
