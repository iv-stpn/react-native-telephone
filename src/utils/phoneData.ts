// The country dataset and the two lookups over it — config by ISO code and the
// filtered/ordered catalog. Isolated here (its only external dependency is
// COUNTRY_PHONE_DATA) so that entries needing just these lookups don't drag in
// the calling-code / area-prefix / locale externals. Re-exported from ./phone.

import type { CountryCode } from 'country-data-ts/countries';
import { COUNTRY_PHONE_DATA, type CountryPhoneConfig } from 'country-data-ts/phone-data';

const catalog: readonly CountryPhoneConfig[] = COUNTRY_PHONE_DATA;

/** Fast lookup of a country's phone config by ISO code. */
const CONFIG_BY_CODE: ReadonlyMap<CountryCode, CountryPhoneConfig> = new Map(catalog.map((config) => [config.code, config]));

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
