---
"react-native-telephone": minor
---

Merge `src/utils/flag-emoji.ts` into `src/utils/flags.tsx` (single flag module).

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
