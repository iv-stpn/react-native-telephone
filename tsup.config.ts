import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/components/PhoneInput.tsx',
    'src/components/CountryPicker.tsx',
    'src/components/styles.ts',
    'src/components/types.ts',
    'src/utils/phone.ts',
    'src/utils/options.ts',
    'src/utils/flags.tsx',
    'src/utils/emoji.ts',
    'src/codes.ts',
  ],
  format: ['cjs', 'esm'],
  // Declarations are emitted by `tsc --emitDeclarationOnly` (see the build
  // script). tsup's dts path uses rollup-plugin-dts, which loads the classic
  // TypeScript compiler API that the TS7 native compiler no longer ships.
  dts: false,
  sourcemap: false,
  clean: true,
  external: ['react', 'react-dom', 'react-native', 'react-native-web'],
  treeshake: true,
  minify: false,
});
