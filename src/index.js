import express, { json } from "express"
import { Low, JSONFile } from 'lowdb'

const app = express()
const db = new Low(new JSONFile('database/db.json'))
await db.read(); db.data ||= {}; await db.write()

app.use(json())

app.listen(3000, () => {
    console.log("Server running at localhost:3000")
})

//#region Middleware testing 
app.use((req, res) => {
    console.log(req.params)
    res.send("<h1>Maybe?<h1>")
})
//#endregion

app.get("/", (require, response) => {
    //response.send("<h1>Maybe?<h1>")
})