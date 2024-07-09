import { createProxyMiddleware } from "http-proxy-middleware"
import type Koa from "koa"
import koaConnect from "koa-connect"
import { SimpleIntervalJob, Task, ToadScheduler } from "toad-scheduler"

/**
 * 用于存储每个代理中间件的映射表。
 */
const proxyMiddlewareMap: Record<string, Koa.Middleware | undefined> = {}
/**
 * 用于存储每个代理关键字和代理目标、时间戳的映射表。
 */
const proxyTargetMap: Record<string, { timestamp: number; target: string } | undefined> = {}

/**
 * 初始化一个调度器，用于定期执行任务。
 */
const schedule = new ToadScheduler()

/**
 * 创建一个任务，用于检查并移除过期的代理。
 * 任务名称为"check and remove proxy"，任务内容是遍历proxyTargetMap，移除过期的代理。
 */
const task = new Task("check and remove proxy", () => {
  /**
   * 获取当前时间戳，用于与代理的最后使用时间进行比较。
   */
  const now = Date.now()
  /**
   * 定义代理的过期时间阈值，这里为1分钟（60000毫秒）。
   */
  const threshold = 60000
  /**
   * 遍历proxyTargetMap，检查每个代理是否过期。
   * 如果代理过期，则从proxyTargetMap和proxyMiddlewareMap中移除该代理。
   */
  for (let [key, value] of Object.entries(proxyTargetMap)) {
    if (now - value!.timestamp > threshold) {
      delete proxyTargetMap[key]
      delete proxyMiddlewareMap[key]
    }
  }
})

/**
 * 将任务添加到调度器中，以每秒一次的间隔执行。
 * 这样任务就会定期检查并移除过期的代理。
 */
schedule.addSimpleIntervalJob(new SimpleIntervalJob({ seconds: 1 }, task))

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
