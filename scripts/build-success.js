const { existsSync, mkdirSync, copyFileSync } = require("fs");
const { join } = require("path");

const distDir = join(__dirname, "..", "dist");
const packageJsonPath = join(__dirname, "..", "package.json");
const readmePath = join(__dirname, "..", "README.md");
const licensePath = join(__dirname, "..", "LICENSE");

// Copy package.json with some modifications
const packageJson = require(packageJsonPath);

// Remove scripts and devDependencies from the distributed package.json
const distPackageJson = {
  ...packageJson,
  scripts: undefined,
  devDependencies: undefined,
  // Ensure proper entry points are set
  main: "./index.js",
  module: "./index.mjs",
  types: "./index.d.ts",
  exports: {
    ".": {
      import: "./index.mjs",
      require: "./index.js",
      types: "./index.d.ts",
    },
  },
};

// Write the modified package.json to dist
require("fs").writeFileSync(
  join(distDir, "package.json"),
  JSON.stringify(distPackageJson, null, 2)
);

// Copy README and LICENSE to dist
if (existsSync(readmePath)) {
  copyFileSync(readmePath, join(distDir, "README.md"));
}

if (existsSync(licensePath)) {
  copyFileSync(licensePath, join(distDir, "LICENSE"));
}

console.log("✅ Build successful!");
console.log("📦 Package files copied to dist/");
