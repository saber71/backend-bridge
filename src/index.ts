import { createProxyMiddleware } from "http-proxy-middleware"
import Koa from "koa"
import koaConnect from "koa-connect"

export const app = new Koa()

const proxyTargetMap: Record<string, string | undefined> = {}

export function setProxyTarget(key: string, target: string) {
  proxyTargetMap[key] = target
}

app.use(async (context, next) => {
  const arr = context.url.split("/").slice(1)
  const proxyTarget = proxyTargetMap[arr[0]]
  if (proxyTarget) {
    const key = "^/" + arr[0]
    await koaConnect(
      createProxyMiddleware({
        target: proxyTarget,
        changeOrigin: true,
        ws: true,
        pathRewrite: { [key]: "" }
      })
    )(context, next)
  } else next()
})
