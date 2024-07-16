import { createProxyMiddleware } from "http-proxy-middleware"
import type Koa from "koa"
import koaConnect from "koa-connect"

/**
 * 用于存储每个代理中间件的映射表。
 */
const proxyMiddlewareMap: Record<string, Koa.Middleware | undefined> = {}
/**
 * 用于存储每个代理关键字和代理目标、时间戳的映射表。
 */
const proxyTargetMap: Record<string, { timestamp: number; target: string } | undefined> = {}

// 删除对应key的代理
export function removeProxyTarget(key: string) {
  delete proxyTargetMap[key]
  delete proxyMiddlewareMap[key]
}

/**
 * 设置特定键对应的代理目标URL，并创建相应的代理中间件。
 * @param key {string} - 用于标识代理的键。
 * @param target {string} - 代理的目标URL。
 */
export function setProxyTarget(key: string, target: string) {
  const timestamp = Date.now()
  const proxyTarget = proxyTargetMap[key]
  if (proxyTarget?.target === target) {
    proxyTarget.timestamp = timestamp
    return
  }
  proxyTargetMap[key] = { target, timestamp }
  const prefix = "^/" + key
  proxyMiddlewareMap[key] = koaConnect(
    createProxyMiddleware({
      target,
      changeOrigin: true,
      ws: true,
      pathRewrite: { [prefix]: "" }
    })
  )
}

/**
 * Koa中间件函数，用于根据请求URL决定是否使用HTTP代理。
 * @param context {Koa.Context} - Koa的上下文对象。
 * @param next {Koa.Next} - Koa的下一个中间件函数。
 * @returns {Promise<void>} - 表示异步操作的Promise对象。
 */
export const proxy: Koa.Middleware = async (context: Koa.Context, next: Koa.Next): Promise<void> => {
  // 从请求URL中获取路径参数，用于查找对应的代理中间件。
  const arr = context.url.split("/").slice(1)
  // 根据路径参数中的第一个元素查找代理中间件。
  const middleware = proxyMiddlewareMap[arr[0]]

  // 如果找到代理中间件，则使用它处理请求。
  if (middleware) {
    await middleware(context, next)
  } else {
    // 如果没有找到代理中间件，则继续处理下一个中间件。
    next()
  }
}
