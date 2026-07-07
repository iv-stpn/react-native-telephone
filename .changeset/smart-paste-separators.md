---
"react-native-telephone": minor
---

Smart paste handling and natural separator typing in the national field.

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
