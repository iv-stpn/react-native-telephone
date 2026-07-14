---
"react-native-telephone": patch
---

Internal refactor and tooling refresh. No public API or behavior changes — the exports map, component props, and utility signatures are all unchanged.

**Refactor (internal only)**

- Split the monolithic `PhoneInput.tsx` into focused modules: `PhoneShell`/`PhoneField` for presentation, `usePhoneInput`/`usePhoneCatalog` for state, and `phoneInputController`/`phoneController.types` for the handler logic (using a "latest ref" pattern to keep handler identities stable).
- Split `utils/phone.ts` into `utils/phoneCatalog.ts` (dataset + lookups) and `utils/phoneMask.ts` (the mask engine); `utils/phone.ts` re-exports both, so importers are unaffected.

**Tooling**

- Migrated Biome to the shared `@iv-stpn/biome-config` preset and added the drizzle/react/typescript best-practices plugins.
- Added Husky git hooks (`pre-commit`, `pre-push`) running test/lint/typecheck, with a CI/production-safe install script.
- Bumped dev dependencies (Biome, React Native, TypeScript, one-liner plugin, etc.).
