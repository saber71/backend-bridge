import axios from "axios"
import { AsyncTask, SimpleIntervalJob, ToadScheduler } from "toad-scheduler"

export namespace BridgeAPI {
  const SCHEDULE_CONFIG = "config"

  export let axiosInstance = axios.create({
    baseURL: "http://localhost:10001"
  })

  /**
   * 初始化一个调度器实例。
   * @remarks
   * 调度器用于定期执行任务。
   */
  const scheduler = new ToadScheduler()

  /**
   * 连接桥接服务。
   * @param key - 桥接服务的密钥。
   * @param proxyTarget - 需要被代理的目标地址。
   * @remarks
   */
  export function connect(key: string, proxyTarget: string) {
    cancelOnExit(key)
    return axiosInstance({
      url: "/proxy",
      params: { key, target: proxyTarget },
      method: "post"
    })
  }

  /**
   * 取消桥接服务的连接。
   * @remarks
   * 该函数停止调度器，取消定期任务。
   */
  export function cancel(key: string) {
    return axiosInstance({ url: "/cancel-proxy?key=" + key, method: "post" })
  }

  const configCache: Record<string, any> = {}

  /**
   * 请求配置项的键值。
   *
   * 该函数通过发送一个POST请求到指定的URL来获取配置信息。
   * 请求的URL是固定的"/get-config"，而请求的数据是传入的键名数组。函数返回一个Promise，
   * 解析的结果是服务器返回的配置项数组。如果服务器返回的数据为空，函数将返回一个空数组。
   *
   * @param keys 需要查询配置的键名数组。
   * @returns 返回一个Promise，解析后得到配置项的数组。
   */
  export function requestConfigKey(...keys: string[]): Promise<any[]> {
    return axiosInstance({ url: "/get-config", method: "post", data: keys }).then((res) => {
      const values = res.data || []
      for (let i = 0; i < keys.length; i++) {
        configCache[keys[i]] = values[i]
      }
      return values
    })
  }

  /**
   * 设置配置项的函数。
   *
   * 通过调用后端接口来设置指定的配置项。此函数封装了axios请求，用于向服务器发送配置项设置请求。
   * 主要用于在客户端应用中动态调整一些配置参数，而无需重新加载整个应用。
   *
   * @param key 配置项的键。指定要设置的配置项的名称，必须是字符串。
   * @param value 配置项的值。配置项对应的值，可以是任意类型。
   * @returns 返回一个axios的Promise对象，该对象用于处理异步请求的结果。
   */
  export function setConfig(key: string, value: any) {
    configCache[key] = value
    const headers = {
      "Content-Type": "text/plain"
    }
    if (typeof value === "object") headers["Content-Type"] = "application/json"
    // 构造axios请求，通过POST方法设置配置项
    return axiosInstance({ url: "/set-config?key=" + key, method: "post", data: value, headers })
  }

  /**
   * 删除配置项。
   *
   * 本函数用于从配置缓存中删除指定的配置项，并通过HTTP请求向服务器确认删除操作。
   * 删除配置项后，如果其他地方还在使用这个配置项，它们将需要重新获取最新的配置。
   *
   * @param key 配置项的键。这个键用于唯一标识要删除的配置项。
   * @returns 返回一个axios的Promise，表示删除操作的异步结果。
   */
  export function deleteConfig(key: string) {
    // 从配置缓存中删除指定的配置项
    delete configCache[key]
    // 向服务器发送删除配置项的请求
    return axiosInstance({ url: "/delete-config?key=" + key, method: "post" })
  }

  const callbacks: Record<string, (value: any) => void> = {}

  /**
   * 监听配置项的键值变化。
   * 当指定的配置项发生变化时，通过回调函数通知调用者。
   *
   * @param key 需要监听的配置项键
   * @param callback 当配置项值发生变化时调用的回调函数
   */
  export function listenConfigKey(key: string, callback: (value: any) => void) {
    callbacks[key] = callback
    startListen()
  }

  /**
   * 停止监听指定的配置项键值变化。
   *
   * @param key 需要停止监听的配置项键
   */
  export function stopListenConfigKey(key: string) {
    delete callbacks[key]
    if (Object.keys(callbacks).length === 0) scheduler.removeById(SCHEDULE_CONFIG)
  }

  /**
   * 开始监听配置更新。
   * 该函数定期从服务器获取配置更新，并调用相应的回调函数通知调用者。
   * 如果检测到配置有变化，则更新本地缓存并触发回调。
   * 如果没有找到特定的调度任务配置，则不执行任何操作。
   */
  function startListen() {
    // 检查是否存在特定的调度任务配置，如果不存在，则不执行任何操作。
    if (!scheduler.existsById(SCHEDULE_CONFIG)) return

    // 创建一个新的异步任务，用于定期获取配置更新。
    const task = new AsyncTask(SCHEDULE_CONFIG, async () => {
      // 获取所有回调函数的键，这些回调将被用于处理配置更新。
      const keys = Object.keys(callbacks)

      // 从服务器请求最新的配置数据。
      const res = await axiosInstance({ url: "/get-config", method: "post", data: keys })

      // 遍历响应数据，检查并处理任何配置变化。
      for (let i = 0; i < keys.length; i++) {
        const value = res.data[i]
        const key = keys[i]

        // 如果当前配置项的值与缓存中的值不同，则更新缓存并触发回调。
        if (configCache[key] !== value) {
          configCache[key] = value
          callbacks[key](value)
        }
      }
    })

    // 将异步任务添加到调度器中，以每30秒的间隔执行。
    scheduler.addSimpleIntervalJob(new SimpleIntervalJob({ seconds: 30 }, task, { id: SCHEDULE_CONFIG }))
  }

  /**
   * 在进程退出或收到SIGINT信号时取消桥接函数。
   *
   * 此函数旨在确保在Node.js进程意外退出或用户发送SIGINT信号（例如，通过Ctrl+C）时，
   * 可以取消特定的桥接操作。通过在进程的"exit"和"SIGINT"事件上注册一个回调函数，
   * 它可以在进程终止之前执行必要的清理工作。
   *
   * @param key 用于标识要取消的桥接操作的唯一键。这个键用于调用cancelBridge函数来取消操作。
   */
  function cancelOnExit(key: string) {
    // 注册一个退出事件的监听器，以便在进程退出时执行清理操作。
    process.on("exit", fn)
    // 注册一个SIGINT事件的监听器，以便在收到SIGINT信号时执行清理操作。
    process.on("SIGINT", fn)

    // 定义一个异步函数作为事件监听器的回调函数。
    async function fn() {
      // 调用cancelBridge函数来取消指定的桥接操作。
      return await cancel(key)
    }
  }
}
