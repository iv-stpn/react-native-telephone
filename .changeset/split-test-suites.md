---
"react-native-telephone": patch
---

Test-only change. No public API or behavior changes.

- Split the monolithic `PhoneInput.test.tsx` into focused component suites (`formatting`, `picker`, `countrySelection`, `paste`, `validation`, `keyboard`, `rendering`) and `phone.test.ts` into per-module util suites (`phoneData`, `phoneMask`, `phoneParse`, `areaCodes`, `callingCodeDefaults`, `locale`), each mirroring the source module it exercises.
- Extracted shared test fixtures (the controlled `Harness` wrapper and the `requireConfig` config helpers) into a non-test `src/__tests__/support/` folder.
- Narrowed the Biome test override to `useFilenamingConvention` for `*.test.*` files so the rest of the ruleset applies to the split suites and their support files.
