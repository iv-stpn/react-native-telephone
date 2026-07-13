---
"react-native-telephone": major
---

Replace local data files with `country-data-ts`; remove barrel files in favour of granular subpaths.

**Breaking changes**

- `react-native-telephone` (the main entry) no longer re-exports utilities, data constants, or flag helpers. It now only exports `PhoneInput` and `CountryPicker`.
- `react-native-telephone/utils` is removed. Migrate to the granular subpaths below.
- `CountryCode`, `CountryPhoneConfig`, `COUNTRY_CODES`, `COUNTRY_PHONE_DATA`, and the disambiguation maps now come from `country-data-ts` directly — or from `react-native-telephone/phone`, which re-exports them as typed companions.

**New subpath map**

| Subpath | What it exports |
| --- | --- |
| `react-native-telephone` | `PhoneInput`, `CountryPicker` |
| `react-native-telephone/phone` | All phone utilities + `country-data-ts` data/type re-exports |
| `react-native-telephone/options` | `buildCountryOptions`, `getRegionLabel`, `normalizeForSearch` |
| `react-native-telephone/flags` | `defaultRenderFlag`, `countryCodeToEmoji` |
| `react-native-telephone/emoji` | `countryCodeToEmoji` (no React Native import) |
| `react-native-telephone/styles` | `defaultStyles`, `COLORS`, `SIZES` |
| `react-native-telephone/types` | `PhoneInputStyles`, `RenderCountryPickerProps`, and related types |
| `react-native-telephone/codes` | `COUNTRY_CODES`, `CountryCode`, `isCountryCode` (forwarded from `country-data-ts`) |

**Migration guide**

```ts
// Before
import { PhoneInput, toE164, COUNTRY_CODES } from "react-native-telephone";
import { toE164, getCountryPhoneConfig } from "react-native-telephone/utils";
import { COUNTRY_CODES } from "react-native-telephone/codes";

// After
import { PhoneInput } from "react-native-telephone";
import { toE164, getCountryPhoneConfig, COUNTRY_CODES } from "react-native-telephone/phone";
// or, for codes only:
import { COUNTRY_CODES } from "react-native-telephone/codes";
// or, direct from the source:
import { COUNTRY_CODES } from "country-data-ts/countries";
```

**Other changes**

- The local `src/data/countries.ts` and `src/data/phone-data.ts` data files are replaced by the `country-data-ts` package dependency.
