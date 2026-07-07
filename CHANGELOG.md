# react-native-telephone

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
