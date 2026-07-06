import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/codes.ts", "src/utils.ts"],
  format: ["cjs", "esm"],
  dts: true,
  sourcemap: false,
  clean: true,
  external: ["react", "react-dom", "react-native", "react-native-web"],
  treeshake: true,
  minify: false,
});
