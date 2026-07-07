---
"react-native-telephone": minor
---

Show the area code beside the calling code in the country picker for countries that share a calling code but are pinned by exactly one area prefix, and prefill the national field with that area code when one is selected.

Countries like Guernsey (`+44 1481`), Jersey (`+44 1534`), Isle of Man (`+44 1624`), the Bahamas (`+1 (242)`), Mayotte (`+262 639`), and Åland (`+358 18`) share a calling code with a larger default country but are identified by a single leading area code. The picker now lists that area code next to the calling code, mask-formatted (so NANP area codes appear in parentheses), and selecting the country seeds the national input with the formatted area code (replacing whatever was typed) so the user can continue with the subscriber number.

Switching within the same calling code to a country with no singular area code now clears the national field when the typed number's area code belongs to a different country — e.g. `+1 (684)` (American Samoa) → Canada resets to just `+1`, while a `204` (Canadian) number → Canada still reflows unchanged. Switching to a different calling code keeps the digits (American Samoa → Andorra yields `+376 684`). Re-selecting the current country is a no-op and no longer drops a typed subscriber number.

Adds `getUniqueAreaCode(config)`, `formatAreaCode(mask, areaCode)`, `nationalBelongsToCountry(callingCode, digits, country)`, and optional `areaCode` / `areaCodeDisplay` fields on `CountryOption`.
