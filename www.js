import { app } from "./dist"

const port = 10001
console.log("backend-bridge", "start at port:", port)
app.listen(port)
