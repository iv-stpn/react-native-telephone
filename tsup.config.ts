import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    'phone-input': 'src/components/PhoneInput.tsx',
    'country-picker': 'src/components/CountryPicker.tsx',
    phone: 'src/utils/phone.ts',
    options: 'src/utils/options.ts',
    flags: 'src/utils/flags.tsx',
    emoji: 'src/utils/emoji.ts',
    styles: 'src/components/styles.ts',
    types: 'src/components/types.ts',
    codes: 'src/codes.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  sourcemap: false,
  clean: true,
  external: ['react', 'react-dom', 'react-native', 'react-native-web'],
  treeshake: true,
  minify: false,
});
