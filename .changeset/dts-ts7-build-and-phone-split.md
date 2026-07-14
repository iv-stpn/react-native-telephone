---
"react-native-telephone": major
---

Fix the build under TypeScript 7 and make the package subpath-only.

**Build (TypeScript 7 compatibility)**

- Declarations are now emitted by `tsc --emitDeclarationOnly` instead of tsup's bundled `dts` path. `rollup-plugin-dts` loads the classic TypeScript compiler API (`ts.sys`, `createProgram`), which the TS7 native compiler no longer ships, so the old build crashed with `Cannot read properties of undefined (reading 'useCaseSensitiveFileNames')`.
- tsup now uses array entries, so JS/CJS/`.d.ts` co-locate under `dist/components/` and `dist/utils/`.

**Breaking — exports map**

- Removed the root `.` export and the legacy top-level `main`/`module`/`react-native`/`types` fields. The package is now subpath-only: import from `react-native-telephone/phone-input` (and the other subpaths) rather than the bare package name. All existing subpath names are unchanged.

**Refactor (internal only)**

- Split `utils/phoneCatalog.ts` into focused modules by external dependency — `phoneData` (dataset + lookups), `callingCodeDefaults`, `areaCodes`, `locale` — and moved the parse/E.164/validation logic into `phoneParse`. `utils/phone.ts` is now a pure barrel with an unchanged public surface, so importers of `react-native-telephone/phone` are unaffected. This removes stray unused external imports from the per-entry bundles.
