# react-native-telephone

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
