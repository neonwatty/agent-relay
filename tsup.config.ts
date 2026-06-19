import { defineConfig } from "tsup"

export default defineConfig({
  entry: {
    index: "src/index.ts",
    bus: "src/bus.ts",
    cli: "src/cli.ts"
  },
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  banner: {
    js: "#!/usr/bin/env node"
  }
})
