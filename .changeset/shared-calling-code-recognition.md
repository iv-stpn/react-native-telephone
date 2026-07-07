---
"react-native-telephone": minor
---

Recognize the country for calling codes shared by several countries, instead of
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
