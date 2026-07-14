# react-native-telephone

An international phone input for React Native — and for the web,
via [react-native-web](https://necolas.github.io/react-native-web/). You type a
number and get a clean [E.164](https://en.wikipedia.org/wiki/E.164) string back,
with per-country masking, a searchable country picker, and live validation for
250 countries.

**[Try the live demo →](https://iv-stpn.github.io/react-native-telephone/)**

## Features

- **Minimal dependencies.** No `react-native-svg`, no masking library, no flag
  assets. Only `react`, `react-native`, and [`country-data-ts`](https://www.npmjs.com/package/country-data-ts) for the phone dataset.
- **E.164 in, E.164 out.** The value you hold is always ready to store or send.
- **Per-country masking** that formats the national number as you type.
- **Searchable country picker** with a flag button and 250 countries.
- **Live validation** against each country's national-number pattern.
- **Smart paste** that recognizes a full international number and switches
  country for you.
- **Headless helpers** for parsing, formatting, and validating without any UI.

## Contents

- [Installation](#installation)
- [Quick start](#quick-start)
- [How it works](#how-it-works)
- [Controlled value](#controlled-value)
- [Props](#props)
- [Styling](#styling)
- [Validation](#validation)
- [Headless use](#headless-use)
- [Development](#development)
- [License](#license)

## Installation

```bash
npm install react-native-telephone
```

## Quick start

```tsx
import { useState } from "react";
import { PhoneInput } from "react-native-telephone/phone-input";

function Example() {
  const [phone, setPhone] = useState("");

  return (
    <PhoneInput
      label="Phone number"
      value={phone}
      onChangeText={setPhone}
      defaultCountry="US"
    />
  );
}
```

`value` is always the E.164 string (`+14155550123`), so it's ready to store or
send as-is. The masked, human-readable version (`(415) 555-0123`) lives inside
the component — you never have to parse it back.

## How it works

The field is split into two inputs behind one border: an editable **calling
code** (`+1`, `+33`, …) and the **national number**. Type digits into the
national side and they're formatted live against that country's mask. The flag
button on the left opens a searchable picker.

Editing the calling code — or picking a country — reflows the number under the
new mask and keeps the digits you already typed.

A few behaviors worth knowing:

- **Backspace at the start** of an empty national field steps back into the
  calling code, so you can delete your way back to switch countries.
- **Shared calling codes** (every `+1` country, `+44` for the UK and its
  dependencies) stay on your current selection instead of snapping to the first
  match. So a US number doesn't flip to Antigua the moment you type `+1`.
- **Smart paste.** Pasting a full international number — `+1 (204) 234-2222` —
  into either field recognizes the country code (and, for shared codes, the area
  code), switches country if needed, and formats the national number correctly.
  `+1 204…` lands on Canada; a stray trunk prefix is stripped where the mask
  expects it (`+33 0612345678` → `6 12 34 56 78`). A plain national number that
  fits the current country is never misread as a foreign calling code.
- **Typed separators are honored.** Typing the mask's own `(`, `)`, `-`, or
  space shows it immediately instead of swallowing it until the next digit
  arrives. Separators typed in the wrong place are dropped so digits stay aligned.
- **Validation** uses each country's national-number pattern. By default the
  error appears once the number fills the mask, or on blur — see
  [Validation](#validation).

## Controlled value

`PhoneInput` is fully controlled. Feed `value` back through `onChangeText` (as in
the quick start) and it stays in sync. You can also hand it an existing E.164
string and it hydrates the country, calling code, and mask from it:

```tsx
<PhoneInput value="+33612345678" onChangeText={setPhone} />
// → 🇫🇷  +33   6 12 34 56 78
```

## Props

Two props are required: `value` and `onChangeText`. Everything else is optional.

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `value` | `string` | — | Controlled E.164 value. Empty string when blank. **Required.** |
| `onChangeText` | `(value: string) => void` | — | Fires with the next E.164 value on every edit. **Required.** |
| `onCountryChange` | `(country: CountryCode) => void` | — | Fires whenever the country changes. |
| `onValidationChange` | `(isValid: boolean) => void` | — | Fires with validity on every edit and on blur. |
| `allowedCountries` | `CountryCode[]` | all 250 | Restricts the picker to these countries, in this exact order. Omit for all 250, alphabetized. |
| `defaultCountry` | `CountryCode \| null` | locale → first | Initial country when `value` has none. |
| `locale` | `string` | device locale | Localizes country names and picks a default. |
| `label` | `string` | — | Label above the field. |
| `error` | `string` | — | External error; overrides the built-in one. |
| `hint` | `string` | — | Helper text below the field (hidden while an error shows). |
| `invalidError` | `string` | `"Invalid phone number"` | Message for a failed validation. |
| `validationMode` | `"onType" \| "onBlur" \| "never"` | `"onType"` | When the built-in error appears. |
| `placeholder` | `string` | country example | National-field placeholder. |
| `editable` | `boolean` | `true` | |
| `autoFocus` | `boolean` | `false` | |
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | |
| `testID` | `string` | — | Sub-elements get `-calling-code`, `-national`, `-error` suffixes. |

Styling and render props are covered in [Styling](#styling).

## Styling

Three levels, from lightest touch to full control.

**1. Per-slot overrides** via `styles` — a `StyleProp` for each piece of the
default UI (`field`, `nationalInput`, `option`, `panel`, …). Merged on top of
the defaults, so you only set what you want to change:

```tsx
<PhoneInput
  value={phone}
  onChangeText={setPhone}
  styles={{
    field: { borderColor: "#111", borderRadius: 12 },
    nationalInput: { fontFamily: "Menlo" },
    optionSelected: { backgroundColor: "#fef3c7" },
  }}
/>
```

`style` restyles just the root column; `styles.field` restyles the bordered
input row. The full slot list is the `PhoneInputStyles` type, and the default
values live in the exported `defaultStyles` / `COLORS` / `SIZES` if you want to
extend rather than replace them.

**2. Render props** when a slot isn't enough and you need different markup:

- `renderFlag` — draw the flag however you like (SVG, PNG, a library). Gets
  `{ code, emoji, size }`; return any node. This is the escape hatch for the
  Android emoji caveat below.
- `renderContainer` — replace the label / field / error / hint shell around the
  input row.
- `renderCountryPicker` — replace the whole picker modal. Gets the filtered
  options, selection, and an `onSelect` callback, so you can drop in a bottom
  sheet or your own list.

```tsx
import { Image } from "react-native";

<PhoneInput
  value={phone}
  onChangeText={setPhone}
  renderFlag={({ code }) => (
    <Image source={{ uri: `https://flagcdn.com/32x24/${code.toLowerCase()}.png` }} style={{ width: 26, height: 18 }} />
  )}
/>
```

### A note on flags

Flags render as emoji by default. A country's flag emoji is literally its two
ISO letters as Unicode regional-indicator symbols, so there's no image asset or
flag library involved. That's what keeps the package nearly dependency-free — the only runtime dependency is `country-data-ts` for the phone dataset.

The catch: **iOS, macOS, and browsers show them; stock Android does not** (it
falls back to the two letters, e.g. boxed "US"). If you ship to Android and want
real flags, pass `renderFlag` with an image or SVG source — the component never
hard-codes the emoji, it just calls your renderer.

## Validation

Every country carries a national-number regex. `onValidationChange` fires with
the true validity on each edit and on blur, regardless of what's shown on
screen. What `validationMode` controls is only *when* the built-in error message
appears:

- `"onType"` (default) — as soon as the number fills the mask's required
  digits, or on blur.
- `"onBlur"` — only after the field loses focus.
- `"never"` — never shows the built-in error; drive your own from
  `onValidationChange` or the `error` prop.

## Headless use

Need to parse, format, or validate without the UI? The subpaths below are pure — no React, no React Native — so they're safe on a server or in a plain Node script.

| Subpath | Contents |
| --- | --- |
| `react-native-telephone/phone` | Phone utilities + `CountryCode`, `CountryPhoneConfig`, data constants |
| `react-native-telephone/options` | `buildCountryOptions`, `getRegionLabel`, `normalizeForSearch` |
| `react-native-telephone/emoji` | `countryCodeToEmoji` (no React Native import) |
| `react-native-telephone/flags` | `defaultRenderFlag`, `countryCodeToEmoji` |
| `react-native-telephone/styles` | `defaultStyles`, `COLORS`, `SIZES` |
| `react-native-telephone/types` | `PhoneInputStyles`, `RenderCountryPickerProps`, and related types |
| `react-native-telephone/codes` | `COUNTRY_CODES`, `CountryCode`, `isCountryCode` |

```ts
import { toE164, validateExtractedPhone, getCountryPhoneConfig } from "react-native-telephone/phone";

const fr = getCountryPhoneConfig("FR")!;
toE164("0612345678", fr);                 // "+33612345678"  (trunk 0 dropped)
validateExtractedPhone("612345678", fr);  // true
```

```ts
import { COUNTRY_CODES, type CountryCode } from "react-native-telephone/codes";
// or directly from the data package:
import { COUNTRY_CODES, type CountryCode } from "country-data-ts/countries";
```

## Development

```bash
bun install
bun run typecheck   # tsc --noEmit
bun run lint        # biome
bun run test        # vitest
bun run build       # tsup → dist/
bun run demo        # web demo via react-native-web
```

The phone dataset comes from [`country-data-ts`](https://www.npmjs.com/package/country-data-ts).

## License

MIT
