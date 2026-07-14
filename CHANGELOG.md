# react-native-telephone

## 2.0.0

### Major Changes

- [`2c33cef`](https://github.com/iv-stpn/react-native-telephone/commit/2c33cef055d0953d5db18363297e05001db5a30e) Thanks [@iv-stpn](https://github.com/iv-stpn)! - Fix the build under TypeScript 7 and make the package subpath-only.

  **Build (TypeScript 7 compatibility)**

  - Declarations are now emitted by `tsc --emitDeclarationOnly` instead of tsup's bundled `dts` path. `rollup-plugin-dts` loads the classic TypeScript compiler API (`ts.sys`, `createProgram`), which the TS7 native compiler no longer ships, so the old build crashed with `Cannot read properties of undefined (reading 'useCaseSensitiveFileNames')`.
  - tsup now uses array entries, so JS/CJS/`.d.ts` co-locate under `dist/components/` and `dist/utils/`.

  **Breaking — exports map**

  - Removed the root `.` export and the legacy top-level `main`/`module`/`react-native`/`types` fields. The package is now subpath-only: import from `react-native-telephone/phone-input` (and the other subpaths) rather than the bare package name. All existing subpath names are unchanged.

  **Refactor (internal only)**

  - Split `utils/phoneCatalog.ts` into focused modules by external dependency — `phoneData` (dataset + lookups), `callingCodeDefaults`, `areaCodes`, `locale` — and moved the parse/E.164/validation logic into `phoneParse`. `utils/phone.ts` is now a pure barrel with an unchanged public surface, so importers of `react-native-telephone/phone` are unaffected. This removes stray unused external imports from the per-entry bundles.

### Patch Changes

- [`832e69b`](https://github.com/iv-stpn/react-native-telephone/commit/832e69b08b63aeb2a24faa40b1b953c1cbff5dce) Thanks [@iv-stpn](https://github.com/iv-stpn)! - Test-only change. No public API or behavior changes.

  - Split the monolithic `PhoneInput.test.tsx` into focused component suites (`formatting`, `picker`, `countrySelection`, `paste`, `validation`, `keyboard`, `rendering`) and `phone.test.ts` into per-module util suites (`phoneData`, `phoneMask`, `phoneParse`, `areaCodes`, `callingCodeDefaults`, `locale`), each mirroring the source module it exercises.
  - Extracted shared test fixtures (the controlled `Harness` wrapper and the `requireConfig` config helpers) into a non-test `src/__tests__/support/` folder.
  - Narrowed the Biome test override to `useFilenamingConvention` for `*.test.*` files so the rest of the ruleset applies to the split suites and their support files.

## 1.0.0

### Major Changes

- [`a838503`](https://github.com/iv-stpn/react-native-telephone/commit/a838503ea1acbd0f41faa1204e2a083bd2d01738) Thanks [@iv-stpn](https://github.com/iv-stpn)! - Replace local data files with `country-data-ts`; remove barrel files in favour of granular subpaths.

  **Breaking changes**

  - `react-native-telephone` (the main entry) no longer re-exports utilities, data constants, or flag helpers. It now only exports `PhoneInput` and `CountryPicker`.
  - `react-native-telephone/utils` is removed. Migrate to the granular subpaths below.
  - `CountryCode`, `CountryPhoneConfig`, `COUNTRY_CODES`, `COUNTRY_PHONE_DATA`, and the disambiguation maps now come from `country-data-ts` directly — or from `react-native-telephone/phone`, which re-exports them as typed companions.

  **New subpath map**

  | Subpath                          | What it exports                                                                    |
  | -------------------------------- | ---------------------------------------------------------------------------------- |
  | `react-native-telephone`         | `PhoneInput`, `CountryPicker`                                                      |
  | `react-native-telephone/phone`   | All phone utilities + `country-data-ts` data/type re-exports                       |
  | `react-native-telephone/options` | `buildCountryOptions`, `getRegionLabel`, `normalizeForSearch`                      |
  | `react-native-telephone/flags`   | `defaultRenderFlag`, `countryCodeToEmoji`                                          |
  | `react-native-telephone/emoji`   | `countryCodeToEmoji` (no React Native import)                                      |
  | `react-native-telephone/styles`  | `defaultStyles`, `COLORS`, `SIZES`                                                 |
  | `react-native-telephone/types`   | `PhoneInputStyles`, `RenderCountryPickerProps`, and related types                  |
  | `react-native-telephone/codes`   | `COUNTRY_CODES`, `CountryCode`, `isCountryCode` (forwarded from `country-data-ts`) |

  **Migration guide**

  ```ts
  // Before
  import { PhoneInput, toE164, COUNTRY_CODES } from "react-native-telephone";
  import { toE164, getCountryPhoneConfig } from "react-native-telephone/utils";
  import { COUNTRY_CODES } from "react-native-telephone/codes";

  // After
  import { PhoneInput } from "react-native-telephone";
  import {
    toE164,
    getCountryPhoneConfig,
    COUNTRY_CODES,
  } from "react-native-telephone/phone";
  // or, for codes only:
  import { COUNTRY_CODES } from "react-native-telephone/codes";
  // or, direct from the source:
  import { COUNTRY_CODES } from "country-data-ts/countries";
  ```

  **Other changes**

  - The local `src/data/countries.ts` and `src/data/phone-data.ts` data files are replaced by the `country-data-ts` package dependency.

### Minor Changes

- [`58419b2`](https://github.com/iv-stpn/react-native-telephone/commit/58419b29ae935173aaa578e81b89063843f35575) Thanks [@iv-stpn](https://github.com/iv-stpn)! - Picker search, accessibility, and autofill improvements; hand-maintained dataset.

  **Behavior**

  - `allowedCountries` now orders the picker as documented. It was described as
    ordering the list, but the options were always re-sorted alphabetically by
    localized name, discarding the passed order. The list now preserves the exact
    order you pass (so you can float likely countries to the top); the full,
    unrestricted catalog is still alphabetized.

  **Accessibility / UX**

  - Country search is now diacritic-insensitive: "cote" matches "Côte d'Ivoire"
    and "reunion" matches "Réunion". Both the option labels and the query are
    folded (lowercased, combining marks stripped) before matching, via the new
    `normalizeForSearch` helper.
  - Picker options now carry native `accessibilityRole="button"` and
    `accessibilityState={{ selected }}` alongside the existing web ARIA, so
    VoiceOver/TalkBack announce them as selectable and report the current
    selection. The search field gained an `accessibilityLabel`.
  - The national and calling-code inputs now advertise phone autofill
    (`textContentType="telephoneNumber"` + `autoComplete="tel"` on the national
    field, `tel-country-code` on the calling code), so the OS/browser offers to
    fill them.
  - Disabled fields now dim their input text (via the previously unused
    `textDisabled` color), pairing with the muted disabled background instead of
    showing full-contrast text.

  **Cleanup**

  - Removed the unused `COLORS.required` color.

  **Tooling / tests**

  - Removed the `gen-phone-data` build script. `src/data/phone-data.ts` is now
    hand-maintained as the source of truth — edit country entries and the
    shared-calling-code disambiguation maps directly.
  - Added `src/__tests__/options.test.ts` covering `buildCountryOptions` (order
    preservation, diacritic-folded search labels), `getRegionLabel`, and
    `normalizeForSearch`.

### Patch Changes

- [`675e6b8`](https://github.com/iv-stpn/react-native-telephone/commit/675e6b87b2e979b8daaae7ee84c00dd09248ef3f) Thanks [@iv-stpn](https://github.com/iv-stpn)! - Internal refactor and tooling refresh. No public API or behavior changes — the exports map, component props, and utility signatures are all unchanged.

  **Refactor (internal only)**

  - Split the monolithic `PhoneInput.tsx` into focused modules: `PhoneShell`/`PhoneField` for presentation, `usePhoneInput`/`usePhoneCatalog` for state, and `phoneInputController`/`phoneController.types` for the handler logic (using a "latest ref" pattern to keep handler identities stable).
  - Split `utils/phone.ts` into `utils/phoneCatalog.ts` (dataset + lookups) and `utils/phoneMask.ts` (the mask engine); `utils/phone.ts` re-exports both, so importers are unaffected.

  **Tooling**

  - Migrated Biome to the shared `@iv-stpn/biome-config` preset and added the drizzle/react/typescript best-practices plugins.
  - Added Husky git hooks (`pre-commit`, `pre-push`) running test/lint/typecheck, with a CI/production-safe install script.
  - Bumped dev dependencies (Biome, React Native, TypeScript, one-liner plugin, etc.).

## 0.4.0

### Minor Changes

- [`e004055`](https://github.com/iv-stpn/react-native-telephone/commit/e00405540f4eaf6bebb0bcf0a023763e7a3cff10) Thanks [@iv-stpn](https://github.com/iv-stpn)! - Smart paste handling and natural separator typing in the national field.

  **Paste recognizes the country code.** Pasting a full international number such
  as `+1 (204) 234-2222` into the national field no longer naively strips every
  non-digit and truncates. The input is parsed for its calling code (and, for
  shared codes, its area code), the country is switched when appropriate, and the
  national number is formatted correctly — `+1 (204) 234-2222` switches to Canada
  and yields `(204) 234-2222` / `+12042342222`. A leading calling code without
  `+` (e.g. `1 204 234 2222` while the US is selected) is peeled the same way,
  and a stray trunk prefix is stripped for countries whose mask excludes it
  (e.g. FR `0612345678` → `6 12 34 56 78`). Detection is conservative: a plain
  national number that fits the current country is never misread as a foreign
  calling code.

  **Typed separators appear immediately.** Typing the mask's own separator
  characters (`(`, `)`, `-`, space) now reveals them at once instead of swallowing
  them until the next digit "earns" them — typing `)` after `(204` shows `(204)`
  right away. Separators typed in the wrong place (e.g. `20-4`) are dropped so
  later digits still land in the right slots.

  **Pasting into the calling-code field works.** A full number pasted into the
  small `+1` field is no longer truncated into a stuck, unroutable stub. It is
  routed through the same paste resolver, so the country is detected, the national
  number fills the national field, the calling-code field is reset to the resolved
  country's code, and focus moves on.

  `applyPhoneMask` is now a thin wrapper over `conformToMask` (digit-only input
  formats identically), removing a duplicate formatter.

  New exports: `conformToMask` (the live formatter that honors user-typed
  literals) and `resolvePastedNational` (the paste resolver), both from the
  package root and the headless `utils` entry.

- [`752a6d4`](https://github.com/iv-stpn/react-native-telephone/commit/752a6d426f87f975d6fa4e6098a46104dc62e638) Thanks [@iv-stpn](https://github.com/iv-stpn)! - Show the area code beside the calling code in the country picker for countries that share a calling code but are pinned by exactly one area prefix, and prefill the national field with that area code when one is selected.

  Countries like Guernsey (`+44 1481`), Jersey (`+44 1534`), Isle of Man (`+44 1624`), the Bahamas (`+1 (242)`), Mayotte (`+262 639`), and Åland (`+358 18`) share a calling code with a larger default country but are identified by a single leading area code. The picker now lists that area code next to the calling code, mask-formatted (so NANP area codes appear in parentheses), and selecting the country seeds the national input with the formatted area code (replacing whatever was typed) so the user can continue with the subscriber number.

  Switching within the same calling code to a country with no singular area code now clears the national field when the typed number's area code belongs to a different country — e.g. `+1 (684)` (American Samoa) → Canada resets to just `+1`, while a `204` (Canadian) number → Canada still reflows unchanged. Switching to a different calling code keeps the digits (American Samoa → Andorra yields `+376 684`). Re-selecting the current country is a no-op and no longer drops a typed subscriber number.

  Adds `getUniqueAreaCode(config)`, `formatAreaCode(mask, areaCode)`, `nationalBelongsToCountry(callingCode, digits, country)`, and optional `areaCode` / `areaCodeDisplay` fields on `CountryOption`.

### Patch Changes

- [`bf8c4c7`](https://github.com/iv-stpn/react-native-telephone/commit/bf8c4c757b4f0c69e9fb159397c665f1e9f2297a) Thanks [@iv-stpn](https://github.com/iv-stpn)! - Size the calling-code field from the text's real rendered width instead of a per-character estimate.

  The field width was computed as `chars × fontSize × 0.5`, an average-glyph guess that could clip or over-pad depending on the font — especially a custom `fontFamily` passed through `styles.callingCodeInput`. Width now comes from an off-screen `Text` probe that renders the code (or `"+"` when empty) through the same style chain the input uses, so `onLayout` reports the exact width the field needs for any font. The old estimate remains only as a first-paint fallback until the initial measurement lands.

- [`ac5a247`](https://github.com/iv-stpn/react-native-telephone/commit/ac5a2478ea5b9719503ebe409280d719d78f3fbc) Thanks [@iv-stpn](https://github.com/iv-stpn)! - Hardening pass: phone-data fixes, locale parsing, types, perf, and a11y.

  **Fixes**

  - The DE and GB masks were sized for the trunkless national form while their
    examples and regexes include the trunk. A full national number typed or pasted
    with the trunk (`07700900123` for GB, `015123456789` for DE) overflowed the
    mask and had its trailing digit silently dropped. Each mask now has the slot
    its own example grouping implies, so the whole number formats and validates.
  - `getCountryFromLocale` only looked at the second locale segment, so
    script-bearing locales like `zh-Hans-CN`, `en-Latn-US`, and `sr-Latn-RS`
    resolved to no country and fell back to the US default. It now walks the
    segments after the language tag and takes the first 2-letter region, while a
    bare language tag (`es`) still returns null even when it collides with a
    country code.

  **Types / API**

  - `optionFlag` in `PhoneInputStyles` is now `StyleProp<ViewStyle>` (it wraps the
    flag node, which is an `<Image>`/SVG for a custom `renderFlag`, not text), so
    sizing an image flag with `width`/`height` no longer type-errors.
  - Removed the never-wired `required` field from `RenderContainerProps` and the
    unreferenced `defaultStyles.required` style.

  **Performance**

  - `parseCountryFromE164` no longer copies and re-sorts the full 250-entry
    catalog on every call; the length-descending sort is cached by input array
    reference. `validateExtractedPhone` caches each config's compiled regex
    instead of recompiling per keystroke.

  **Accessibility**

  - The calling-code and national inputs now carry `accessibilityLabel`s (the
    national field reuses the component `label`), and the country-picker list has
    `accessibilityRole="list"` to pair with its `role="option"` entries.

  **Tooling / tests**

  - `gen-phone-data` reads its upstream source from the first CLI arg or
    `PHONE_DATA_SRC` instead of a hard-coded absolute path.
  - Strengthened the dataset integrity tests (mask prefix spacing, every example
    fits its mask and validates, every disambiguation-map value resolves) and
    added component tests for `onValidationChange`, `validationMode`
    `onBlur`/`never`, backspace-into-calling-code, the render-prop escape hatches,
    `editable={false}`, `allowedCountries`, and locale-based default-country
    fallback.

- [`715405c`](https://github.com/iv-stpn/react-native-telephone/commit/715405c47b07f5d57057b469de02c308d725b87f) Thanks [@iv-stpn](https://github.com/iv-stpn)! - Fix national-number reset when typing one digit past the mask for countries whose national numbers begin with their own calling code (e.g. Mauritania `+222`, Russia `+7`).

  Typing `22 22 22 22` then `2` in a `+222` field reset the display to `22 22 22` instead of dropping just the extra digit. The paste resolver peeled the calling code (`222`) off the front whenever the input exceeded the mask, but peeling consumes as many digits as the calling code has — so a 1–2 digit overtype ate real national digits. Peeling now only fires when the input exceeds the mask by at least the calling code's own length, i.e. when there are enough excess digits to actually be a prefixed calling code. A genuine `+222`-prefixed paste still peels correctly.

## 0.3.0

### Minor Changes

- [`bcdcb30`](https://github.com/iv-stpn/react-native-telephone/commit/bcdcb3076b78ab8ba6e2b993f495bce93a2272e4) Thanks [@iv-stpn](https://github.com/iv-stpn)! - Recognize the country for calling codes shared by several countries, instead of
  always falling back to the first catalogue entry. Disambiguation data now lives
  in `src/data/phone-data.ts` (emitted by `scripts/gen-phone-data.ts`) and ships
  three new exports: `CALLING_CODE_DEFAULTS`, `NANP_AREA_CODE_TO_COUNTRY`, and
  `CALLING_CODE_AREA_PREFIXES`.

  **Area-code recognition.** For every shared calling code where the leading
  national digits unambiguously belong to one country, the number is routed there:

  - `+1` (NANP): 3-digit area code → US / Canada / Caribbean dependency, e.g.
    `+1 204…` → Canada, `+1 268…` → Antigua, `+1 809…` → Dominican Republic. Every
    Canadian area code and NANP dependency is listed in `NANP_AREA_CODE_TO_COUNTRY`.
  - `+44`: `1481` → Guernsey, `1534` → Jersey, `1624` → Isle of Man.
  - `+7`: leading `6`/`7` → Kazakhstan.
  - `+262`: `639` → Mayotte. `+358`: `18` → Åland. `+47`: `79` → Svalbard.
  - `+212`: `528` → Western Sahara. `+39`: `06698` → Vatican.
  - `+599`: `7`/`31`/`41` → Bonaire / Saba / Sint Eustatius.
  - `+672`: `1` → Australian Antarctic.

  Area-code recognition overrides the sticky selection once a full prefix is typed,
  so a US selection switches to Canada when `204` is entered. Codes whose members
  share identical number ranges (e.g. `+590` Guadeloupe / St. Martin / St.
  Barthélemy) are left to the default.

  **Default country per shared calling code.** When a number can't be pinned to a
  specific country, the biggest country for the code is used instead of the
  alphabetically-first entry — `+1` → US, `+44` → GB, `+7` → RU, `+590` →
  Guadeloupe, `+672` → Norfolk Island, and so on. Typing a shared calling code
  into the code field lands on the same default. The full set is in
  `CALLING_CODE_DEFAULTS`, queryable via the new `getDefaultCountryForCallingCode`
  helper (exported from the package root).

## 0.2.0

### Minor Changes

- [`41af170`](https://github.com/iv-stpn/react-native-telephone/commit/41af1708a03689b22c26917800ce06fa309197f6) Thanks [@iv-stpn](https://github.com/iv-stpn)! - Consolidate the flag modules: `countryCodeToEmoji` now lives in its own pure
  `src/utils/emoji.ts`, and `src/utils/flags.tsx` holds the render-prop types and
  the default JSX renderer (importing the helper from `./emoji`).

  `FlagRenderProps` no longer includes an `emoji` field. The default renderer
  computes the emoji itself, and `countryCodeToEmoji` is exported from the
  `utils` entry so consumers building a custom `renderFlag` can call it directly
  when they want the glyph.

  **Migration:** if you have a custom `renderFlag`, replace the `emoji` prop with
  a call to `countryCodeToEmoji`:

  ```ts
  // before
  renderFlag={({ code, emoji, size }) => <Text>{emoji}</Text>

  // after
  import { countryCodeToEmoji } from "react-native-telephone/utils";
  renderFlag={({ code, size }) => <Text>{countryCodeToEmoji(code)}</Text>}
  ```

## 0.1.1

### Patch Changes

- [`1869691`](https://github.com/iv-stpn/react-native-telephone/commit/1869691251a0458c44e93a0c007f8c9f0df4857d) Thanks [@iv-stpn](https://github.com/iv-stpn)! - Add changesets for versioning/publishing and GitHub Actions workflows for CI, release (changesets + npm provenance), and deploying the demo to GitHub Pages. Tooling-only change; the public API is unchanged.
