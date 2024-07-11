import Router from "koa-router"
import { removeProxyTarget, setProxyTarget } from "./proxy.ts"

export const router = new Router()

/**
 * 配置路由处理程序，以处理POST请求到'/proxy'的路径。如/proxy?key=test&target=http://localhost:3000
 *
 * 此路径的目的是设置代理目标。通过查询参数'key'和'target'，
 * 它们被用来确定哪个键应该指向哪个目标URL。
 * 如果这两个参数都存在，则将它们用于设置代理目标。
 *
 * @param context 包含请求和响应对象的上下文。
 * @param next 中间件函数，用于继续请求处理链。
 */
router.post("/proxy", (context, next) => {
  // 从查询参数中获取'key'和'target'，并断言它们为字符串类型
  const key = context.query.key as string
  const target = context.query.target as string

  // 检查'target'和'key'是否存在，如果存在，则设置代理目标
  if (target && key) {
    setProxyTarget(key, target)
  }

  // 设置响应体为'ok'，表示请求已被处理
  context.response.body = "ok"

  // 调用下一个中间件或处理程序
  next()
})

/**
 * 接收并处理取消代理的请求。/cancel-proxy?key=xxx
 *
 * 本路由处理来自客户端的取消代理请求。当客户端发送带有特定键值的请求时，
 * 该路由将尝试根据键值移除相应的代理目标。这在客户端需要取消之前设置的代理关系时使用。
 */
router.post("/cancel-proxy", (context, next) => {
  // 从请求的查询参数中获取键值
  const key = context.query.key as string

  // 如果键值存在，则尝试移除对应的代理目标
  if (key) {
    removeProxyTarget(key)
  }
})

// 以键值对缓存配置项
const config: Record<string, any> = {}

/**
 * 配置路由：设置配置项
 * 通过POST请求向/set-config路径发送配置项的键值对，以更新配置。
 * 请求可以携带查询参数key和value，或者将value放在请求体中。路由参数中的value优先
 * 如果key和value都存在，则更新配置对象config的相应属性。
 */
router.post("/set-config", (context, next) => {
  // 从查询参数中获取配置项的键
  const key = context.query.key as string
  // 优先使用查询参数中的值，如果不存在，则使用请求体中的值
  const value = (context.query.value as string) || context.request.body
  // 如果键和值都存在，则更新配置对象
  if (key && value) {
    config[key] = value
  }
  // 设置响应体为空字符串，表示操作已完成
  context.response.body = ""
  // 调用next函数，继续处理后续的中间件或路由
  next()
})

/**
 * 删除配置项的路由处理函数。请求的路径为/delete-config?key=xxx
 *
 * 本函数负责处理删除配置项的请求。它通过查询参数获取要删除的配置项的键，
 * 并从配置对象中删除该键对应的配置项。无论删除操作是否成功，都会继续调用下一个中间件。
 */
router.post("/delete-config", (context, next) => {
  // 从请求的查询参数中获取要删除的配置项的键
  const key = context.query.key as string

  // 如果键存在，则从配置对象中删除该配置项
  if (key) {
    delete config[key]
  }

  // 设置响应体为空字符串，表示删除成功或操作已完成
  context.response.body = ""

  // 继续处理请求的中间件函数链
  next()
})

/**
 * 获取配置信息的路由处理函数。
 *
 * 该路由处理函数用于处理Post请求，请求的路径为/get-config?key=xxx或是在请求体中携带key数组，查询参数中的key优先。它的主要功能是根据请求中的查询参数key，
 * 返回对应配置对象的值。如果key不存在于配置对象中，则返回空字符串。
 */
router.post("/get-config", (context, next) => {
  // 从请求的查询参数中获取key值，并将其类型断言为字符串。
  const key = context.query.key as string
  const keys = context.request.body as string[] | undefined

  if (key) {
    // 根据获取的key值从配置对象中获取对应的值。如果key不存在，则使用空字符串作为默认值。
    context.response.body = config[key] ?? ""
  } else if (keys) {
    context.response.body = keys.map((key) => config[key] ?? "")
  } else {
    context.response.body = ""
  }

  // 调用next函数，继续处理请求的中间件链。
  next()
})
