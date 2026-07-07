---
"react-native-telephone": patch
---

Size the calling-code field from the text's real rendered width instead of a per-character estimate.

The field width was computed as `chars × fontSize × 0.5`, an average-glyph guess that could clip or over-pad depending on the font — especially a custom `fontFamily` passed through `styles.callingCodeInput`. Width now comes from an off-screen `Text` probe that renders the code (or `"+"` when empty) through the same style chain the input uses, so `onLayout` reports the exact width the field needs for any font. The old estimate remains only as a first-paint fallback until the initial measurement lands.
