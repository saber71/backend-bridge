import * as fs from "node:fs"
import { build } from "vite"
import viteConfig, { multiEntry, plugins } from "./vite.config"

// 库模式多入口打包

let emptyOutDir = true
const config = viteConfig
for (let entry of multiEntry) {
  if (!fs.existsSync(entry.entry)) continue
  //@ts-ignore
  await build({
    configFile: false,
    ...config,
    plugins: plugins(),
    build: {
      ...config.build,
      lib: {
        ...config.build.lib,
        ...entry
      },
      emptyOutDir
    }
  })
  emptyOutDir = false
}
