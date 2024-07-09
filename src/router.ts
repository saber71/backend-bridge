import Router from "koa-router"
import { removeProxyTarget, setProxyTarget } from "./proxy.ts"

export const router = new Router()

// /proxy?key=test&target=http://localhost:3000
// 设置代理关键字和代理目标
router.post("/proxy", (context, next) => {
  const key = context.query.key as string
  const target = context.query.target as string
  if (target && key) {
    setProxyTarget(key, target)
  }
  context.response.body = "ok"
  next()
})

// /cancel-proxy?key=test
// 删除代理
router.post("/cancel-proxy", (context, next) => {
  const key = context.query.key as string
  if (key) {
    removeProxyTarget(key)
  }
})
