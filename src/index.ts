// Public entry point. Components, their prop types, and the render-prop contract.

export { CountryPicker } from "./components/CountryPicker";
export type { PhoneInputProps, PhoneValidationMode } from "./components/PhoneInput";
export { PhoneInput } from "./components/PhoneInput";
export { COLORS, defaultStyles, SIZES } from "./components/styles";
export type {
  CountryOption,
  FlagRenderProps,
  PhoneInputSize,
  PhoneInputStyles,
  RenderContainerProps,
  RenderCountryPickerProps,
  RenderFlag,
} from "./components/types";
// Country data + phone config types, re-exported for convenience.
export type { CountryCode } from "./data/countries";
export { COUNTRY_CODES, isCountryCode } from "./data/countries";
export type { CountryPhoneConfig } from "./data/phone-data";
export {
  CALLING_CODE_AREA_PREFIXES,
  CALLING_CODE_DEFAULTS,
  COUNTRY_PHONE_DATA,
  NANP_AREA_CODE_TO_COUNTRY,
} from "./data/phone-data";
// Flag helpers (emoji glyph + the default renderer), for building custom flags.
export { countryCodeToEmoji, defaultRenderFlag } from "./utils/flags";
export { getDefaultCountryForCallingCode } from "./utils/phone";
