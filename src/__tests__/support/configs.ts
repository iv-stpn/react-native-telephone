import type { CountryCode } from 'country-data-ts/countries';
import type { CountryPhoneConfig } from 'country-data-ts/phone-data';
import { getCountryPhoneConfig } from '../../utils/phoneData';

// Resolves a config or throws — keeps the type non-optional without an `as` cast.
export function requireConfig(code: CountryCode): CountryPhoneConfig {
  const config = getCountryPhoneConfig(code);
  if (!config) throw new Error(`No phone config for ${code}`);
  return config;
}

// A handful of countries leaned on across the suite, resolved once.
export const US = requireConfig('US');
export const FR = requireConfig('FR');
export const AU = requireConfig('AU'); // trunk prefix "0"
export const GB = requireConfig('GB'); // trunk prefix "0", mask INCLUDES the 0
export const DE = requireConfig('DE'); // trunk prefix "0", mask INCLUDES the 0
