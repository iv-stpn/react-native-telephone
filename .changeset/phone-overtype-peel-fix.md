---
"react-native-telephone": patch
---

Fix national-number reset when typing one digit past the mask for countries whose national numbers begin with their own calling code (e.g. Mauritania `+222`, Russia `+7`).

Typing `22 22 22 22` then `2` in a `+222` field reset the display to `22 22 22` instead of dropping just the extra digit. The paste resolver peeled the calling code (`222`) off the front whenever the input exceeded the mask, but peeling consumes as many digits as the calling code has — so a 1–2 digit overtype ate real national digits. Peeling now only fires when the input exceeds the mask by at least the calling code's own length, i.e. when there are enough excess digits to actually be a prefixed calling code. A genuine `+222`-prefixed paste still peels correctly.
