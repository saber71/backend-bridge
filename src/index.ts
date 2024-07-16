import Koa from "koa"
import { koaBody } from "koa-body"
import { proxy } from "./proxy.ts"
import { router } from "./router.ts"

export const app = new Koa()
app.use(proxy).use(koaBody()).use(router.routes()).use(router.allowedMethods()).listen(10001)
