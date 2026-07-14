import process from 'node:process';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Vite config for the web demo. React Native components run in the browser via
// react-native-web: every `react-native` import is aliased to `react-native-web`,
// and RN's `__DEV__`/`process.env` globals are defined so the RN runtime is happy.
export default defineConfig({
  root: import.meta.dirname,
  plugins: [react()],
  define: {
    // biome-ignore-start lint/style/noProcessEnv: a build config reading NODE_ENV to inject the dev flag is the canonical, correct use.
    __DEV__: JSON.stringify(process.env.NODE_ENV !== 'production'),
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'development'),
    // biome-ignore-end lint/style/noProcessEnv: end injected env block.
    global: 'window',
  },
  resolve: {
    alias: {
      'react-native': 'react-native-web',
    },
    extensions: ['.web.tsx', '.web.ts', '.tsx', '.ts', '.web.js', '.js'],
  },
  optimizeDeps: {
    include: ['react-native-web'],
    esbuildOptions: {
      resolveExtensions: ['.web.js', '.js', '.ts', '.tsx'],
      loader: { '.js': 'jsx' },
    },
  },
});
