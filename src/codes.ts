// Lightweight entry point: just the country-code list and union type, so a
// consumer can type against CountryCode without pulling in React/components.

export type { CountryCode } from "./data/countries";
export { COUNTRY_CODES, isCountryCode } from "./data/countries";
