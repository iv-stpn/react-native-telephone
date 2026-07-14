// Public `./phone` entry: a barrel re-exporting the phone layer, which is split
// across focused modules so each internal consumer imports only what it uses and
// no unused country-data-ts constant leaks into a per-entry bundle:
//   - ./phoneData            — the dataset + config/catalog lookups
//   - ./callingCodeDefaults  — default country per shared calling code
//   - ./areaCodes            — area-prefix pinning / national-belongs-to logic
//   - ./locale               — BCP-47 locale → ISO country
//   - ./phoneParse           — E.164 conversion, validation, paste resolution
//   - ./phoneMask            — the mask engine
// External consumers get the full surface here; internal modules import from the
// split files directly (never this barrel) to keep the re-exported data
// constants below out of the component bundles.

// biome-ignore lint/performance/noBarrelFile: this IS the public ./phone entry — re-exposing the split modules.
export {
  CALLING_CODE_AREA_PREFIXES,
  CALLING_CODE_DEFAULTS,
  COUNTRY_PHONE_DATA,
  type CountryPhoneConfig,
  NANP_AREA_CODE_TO_COUNTRY,
} from 'country-data-ts/phone-data';
export { getUniqueAreaCode, nationalBelongsToCountry } from './areaCodes';
export { getDefaultCountryForCallingCode } from './callingCodeDefaults';
export { getCountryFromLocale } from './locale';
export { getCountryPhoneCatalog, getCountryPhoneConfig } from './phoneData';
export {
  applyPhoneMask,
  conformToMask,
  countMaskDigitSlots,
  countRequiredMaskDigits,
  formatAreaCode,
  getNationalMask,
  normalizeCallingCode,
  normalizeNationalDigits,
} from './phoneMask';
export {
  nationalFromE164,
  parseCountryFromE164,
  type ResolvedPaste,
  resolvePastedNational,
  toE164,
  validateExtractedPhone,
} from './phoneParse';
