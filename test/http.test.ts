import { httpTest, setDefaultAxiosConfig } from "@heraclius/http-test"
//@ts-ignore
import Koa from "koa"
import { koaBody } from "koa-body"
import { describe, test } from "vitest"
import "../src"
import { BridgeAPI } from "../lib"

setDefaultAxiosConfig({ baseURL: "http://localhost:10001" })

const app = new Koa().use(koaBody())
app.use((context, next) => {
  if (context.url === "/hello") {
    context.response.body = "hello"
  }
  next()
})
app.listen(10000)

//@ts-ignore
await BridgeAPI.connect("test", "http://localhost:10000")
//@ts-ignore
await BridgeAPI.setConfig("test1", "1")
//@ts-ignore
await BridgeAPI.setConfig("test2", { name: "test" })

describe.sequential("bridge", () => {
  test("should provide key and target when proxy", async () => {
    await httpTest({ url: "/proxy?key=12", method: "post" }).expectStatus(400).done()
    await httpTest({ url: "/proxy?target=12", method: "post" }).expectStatus(400).done()
    await httpTest({ url: "/proxy", method: "post" }).expectStatus(400).done()
  })
  test("should proxy correctly", async () => {
    await httpTest({
      url: "/test/hello",
      method: "post",
      data: "hello",
      headers: { "Content-Type": "text/plain" }
    })
      .expectStatus(200)
      .expectBody("hello")
      .done()
  })
  test("should proxy result 404", async () => {
    await httpTest({ url: "/test/hello/123" }).expectStatus(404).done()
  })
  test("should cannot proxy", async () => {
    await httpTest({ url: "/test1/hello" }).expectStatus(404).done()
  })
  test("remove proxy", async () => {
    await httpTest({ url: "/cancel-proxy", method: "post" }).expectStatus(400).done()
    await BridgeAPI.cancel("test")
    await httpTest({ url: "/test/hello" }).expectStatus(404).done()
  })
  test("should exist config value", async () => {
    await httpTest({ url: "/get-config?key=test1", method: "post" }).expectBody(1).done()
    await httpTest({ url: "/get-config?key=test2", method: "post" }).expectBody({ name: "test" }).done()
    await httpTest({ url: "/get-config", method: "post", data: ["test1", "test2"] })
      .expectBody(["1", { name: "test" }])
      .done()
  })
  test("delete config and check", async () => {
    //@ts-ignore
    await fetch("http://localhost:10001/delete-config?key=test1", { method: "post" })
    await httpTest({ url: "/get-config?key=test1", method: "post" }).expectStatus(404).done()
    await httpTest({ url: "/get-config?key=test2", method: "post" }).expectBody({ name: "test" }).done()
  })
})
