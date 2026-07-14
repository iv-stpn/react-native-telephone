// The default (biggest) country for each shared calling code. Isolated here (its
// only external dependency is CALLING_CODE_DEFAULTS) so consumers that just need
// the default lookup don't pull in the dataset or area-prefix externals.
// Re-exported from ./phone.

import type { CountryCode } from 'country-data-ts/countries';
import { CALLING_CODE_DEFAULTS } from 'country-data-ts/phone-data';

/** Returns the default (biggest) country for a shared calling code, if any. */
export function getDefaultCountryForCallingCode(callingCode: string): CountryCode | undefined {
  return CALLING_CODE_DEFAULTS.get(callingCode);
}
