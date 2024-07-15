import { externalDepsPlugin } from "@heraclius/external-deps-plugin"
import * as path from "node:path"
import { resolve } from "path"
import swc from "unplugin-swc"
import { defineConfig } from "vite"
import dtsPlugin from "vite-plugin-dts"

const __dirname = path.resolve(".")

export const multiEntry = [
  {
    entry: resolve(__dirname, "src/index.ts"),
    fileName: "www"
  },
  {
    entry: resolve(__dirname, "lib/index.ts"),
    fileName: "lib"
  }
]

export const plugins = () => [dtsPlugin({ rollupTypes: true }), swc.vite(), externalDepsPlugin()]

export default defineConfig({
  plugins: plugins(),
  build: {
    lib: {
      ...multiEntry[0],
      formats: ["es"]
    }
  }
})
