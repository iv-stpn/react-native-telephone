import type { CountryCode } from 'country-data-ts/countries';
import type { CountryPhoneConfig } from 'country-data-ts/phone-data';
import { useMemo } from 'react';
import { getCountryFromLocale } from '../utils/locale';
import { buildCountryOptions, type CountryOption } from '../utils/options';
import { parseCountryFromE164 } from '../utils/phoneParse';
import type { PhoneInputProps } from './PhoneInput';

/** Resolves the device locale, falling back to "en-US" when Intl is unavailable. */
function getDeviceLocale(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale || 'en-US';
  } catch {
    return 'en-US';
  }
}

export type PhoneCatalog = {
  resolvedLocale: string;
  countryOptions: CountryOption[];
  allowedSet: ReadonlySet<CountryCode>;
  configs: CountryPhoneConfig[];
  configByCode: ReadonlyMap<CountryCode, CountryPhoneConfig>;
  countriesByCallingCode: ReadonlyMap<string, CountryOption[]>;
  derivedDefaultCountry: CountryCode;
  initialCountry: CountryCode;
};

// Derives every catalog-shaped value (options, lookups, default country) from the
// locale/allowed-countries props. Split out so the main hook body stays small.
export function usePhoneCatalog(props: PhoneInputProps): PhoneCatalog {
  const { locale, allowedCountries, defaultCountry, value } = props;
  const resolvedLocale = useMemo(() => locale ?? getDeviceLocale(), [locale]);

  const countryOptions = useMemo(() => buildCountryOptions(resolvedLocale, allowedCountries), [resolvedLocale, allowedCountries]);
  const allowedSet = useMemo(() => new Set(countryOptions.map((option) => option.config.code)), [countryOptions]);
  const configs = useMemo(() => countryOptions.map((option) => option.config), [countryOptions]);
  const configByCode = useMemo(() => new Map(configs.map((config) => [config.code, config])), [configs]);

  const countriesByCallingCode = useMemo(() => {
    const map = new Map<string, CountryOption[]>();
    for (const option of countryOptions) {
      const key = option.config.callingCode;
      const entries = map.get(key);
      if (entries) entries.push(option);
      else map.set(key, [option]);
    }
    return map;
  }, [countryOptions]);

  // Default country when `value` carries no country: explicit prop → locale → first option.
  const derivedDefaultCountry = useMemo<CountryCode>(() => {
    if (defaultCountry && allowedSet.has(defaultCountry)) return defaultCountry;
    const localeCountry = getCountryFromLocale(resolvedLocale);
    if (localeCountry && allowedSet.has(localeCountry)) return localeCountry;
    return countryOptions[0]?.config.code ?? 'US';
  }, [defaultCountry, resolvedLocale, countryOptions, allowedSet]);

  // Country implied by the current `value` (if it's an E.164 string), else the default.
  const initialCountry = useMemo<CountryCode>(() => {
    const parsed = parseCountryFromE164(value, configs);
    if (parsed && allowedSet.has(parsed.code)) return parsed.code;
    return derivedDefaultCountry;
  }, [value, configs, allowedSet, derivedDefaultCountry]);

  return {
    resolvedLocale,
    countryOptions,
    allowedSet,
    configs,
    configByCode,
    countriesByCallingCode,
    derivedDefaultCountry,
    initialCountry,
  };
}
