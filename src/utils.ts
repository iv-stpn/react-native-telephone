// Headless entry point: the phone data and pure helper functions, with no React
// or React Native imports. Use this to parse/format/validate phone numbers, or
// to build a custom UI, without depending on the component layer.

export { COUNTRY_CODES, type CountryCode, isCountryCode } from "./data/countries";
export { COUNTRY_PHONE_DATA, type CountryPhoneConfig } from "./data/phone-data";
export { countryCodeToEmoji } from "./utils/emoji";
export { type FlagRenderProps, type RenderFlag } from "./utils/flags";
export { buildCountryOptions, type CountryOption, getRegionLabel } from "./utils/options";
export {
  applyPhoneMask,
  conformToMask,
  countMaskDigitSlots,
  countRequiredMaskDigits,
  getCountryFromLocale,
  getCountryPhoneCatalog,
  getCountryPhoneConfig,
  getNationalMask,
  nationalFromE164,
  normalizeCallingCode,
  normalizeNationalDigits,
  parseCountryFromE164,
  resolvePastedNational,
  toE164,
  validateExtractedPhone,
} from "./utils/phone";
