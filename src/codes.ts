// Country-code list and CountryCode union type — forwarded from country-data-ts.
// Use this lightweight subpath when you only need the code list and type guard,
// without pulling in the full phone dataset.
export { COUNTRY_CODES, type CountryCode, isCountryCode } from "country-data-ts/countries";
