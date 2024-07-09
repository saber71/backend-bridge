import { httpTest, setDefaultAxiosConfig } from "@heraclius/http-test"
//@ts-ignore
import Koa from "koa"
import { describe, test } from "vitest"
import { setProxyTarget } from "../dist"
import "../www.js"

setProxyTarget("test", "http://localhost:10000")
setDefaultAxiosConfig({ baseURL: "http://localhost:10001" })

const app = new Koa()
app.use((context, next) => {
  if (context.url === "/hello") {
    context.response.body = "hello"
  }
  next()
})
app.listen(10000)

describe.sequential("bridge", () => {
  test("should proxy correctly", async () => {
    await httpTest({ url: "/test/hello" }).expectStatus(200).expectBody("hello").done()
  })
  test("should proxy result 404", async () => {
    await httpTest({ url: "/test/hello/123" }).expectStatus(404).done()
  })
  test("should cannot proxy", async () => {
    await httpTest({ url: "/test1/hello" }).expectStatus(404).done()
  })
})
