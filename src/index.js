const express = require("express")
const app = express()

app.use(express.json())

//#region Middleware testing 
app.use((req, res) => {
    console.log(req.params)
})
//#endregion

app.get("/", (require, response) => {
    response.send("<h1>Maybe?<h1>")
})

app.listen(3000, () => {
    console.log("Server running at localhost:53145")
})