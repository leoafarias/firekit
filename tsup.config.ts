import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  minify: false,
  bundle: true,
  skipNodeModulesBundle: true,
  external: [
    "class-validator",
    "class-transformer",
    "class-transformer-validator",
    "reflect-metadata",
    "uuid",
  ],
  treeshake: true,
  target: "node16",
  outDir: "dist",
  onSuccess: "node scripts/build-success.js",
});
