---
"react-native-telephone": patch
---

Hardening pass: phone-data fixes, locale parsing, types, perf, and a11y.

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
