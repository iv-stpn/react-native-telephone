---
"react-native-telephone": minor
---

Picker search, accessibility, and autofill improvements; hand-maintained dataset.

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
