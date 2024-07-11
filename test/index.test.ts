import { httpTest, setDefaultAxiosConfig } from "@heraclius/http-test"
//@ts-ignore
import Koa from "koa"
import { describe, test } from "vitest"
import "../www.js"

setDefaultAxiosConfig({ baseURL: "http://localhost:10001" })

const app = new Koa()
app.use((context, next) => {
  if (context.url === "/hello") {
    context.response.body = "hello"
  }
  next()
})
app.listen(10000)

//@ts-ignore
await fetch("http://localhost:10001/proxy?key=test&target=http://localhost:10000", { method: "post" })
//@ts-ignore
await fetch("http://localhost:10001/set-config?key=test1&value=1", { method: "post" })
//@ts-ignore
await fetch("http://localhost:10001/set-config?key=test2&value=2", { method: "post" })

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
  test("remove proxy", async () => {
    await fetch("http://localhost:10001/cancel-proxy?key=test", { method: "post" })
    await httpTest({ url: "/test/hello" }).expectStatus(404).done()
  })
  test("should exist config value", async () => {
    await httpTest({ url: "/get-config?key=test1" }).expectBody(1).done()
    await httpTest({ url: "/get-config?key=test2" }).expectBody(2).done()
  })
  test("delete config and check", async () => {
    //@ts-ignore
    await fetch("http://localhost:10001/delete-config?key=test1", { method: "post" })
    await httpTest({ url: "/get-config?key=test1" }).expectBody("").done()
    await httpTest({ url: "/get-config?key=test2" }).expectBody(2).done()
  })
})
