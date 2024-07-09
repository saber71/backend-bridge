import Koa from "koa"
import { proxy } from "./proxy.ts"
import { router } from "./router.ts"

export const app = new Koa()
app.use(proxy).use(router.routes()).use(router.allowedMethods())

export * from "./proxy"
