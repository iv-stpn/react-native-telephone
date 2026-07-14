---
"react-native-telephone": minor
---

Expose `onFocus`, `onBlur`, `returnKeyType`, and `onSubmitEditing` props on `PhoneInput`. `onFocus`/`onBlur` fire once on true focus entry/exit and are not triggered by the internal calling-code↔national focus hop; `returnKeyType` and `onSubmitEditing` pass through to the national input.
