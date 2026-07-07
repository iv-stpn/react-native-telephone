# react-native-telephone

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
