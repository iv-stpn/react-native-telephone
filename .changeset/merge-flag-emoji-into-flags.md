---
"react-native-telephone": minor
---

Consolidate the flag modules: `countryCodeToEmoji` now lives in its own pure
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
