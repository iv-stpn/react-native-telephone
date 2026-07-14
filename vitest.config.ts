import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// react-native-web provides the DOM implementation of the react-native API, so
// the components (which import from "react-native") run in jsdom under test.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'react-native': 'react-native-web',
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    server: {
      deps: {
        inline: ['react-native-web'],
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/__tests__/**', 'src/index.ts'],
    },
  },
});
