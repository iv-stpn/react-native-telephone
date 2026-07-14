// BCP-47 locale → ISO country resolution. Its only external dependency is
// isCountryCode; split from the catalog so consumers that just want the locale
// helper (usePhoneCatalog) don't drag in the phone-data constants, and vice
// versa. Re-exported from ./phone.

import { type CountryCode, isCountryCode } from 'country-data-ts/countries';

const COUNTRY_SEGMENT_SEPARATOR_REGEX = /[-_]/;

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
