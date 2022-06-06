import express, { json } from 'express'
import cors from 'cors'
import { usersRouter } from './Routes/Users.js'
import { groupsRouter } from './Routes/Groups.js'
import { messagesRouter } from './Routes/Messages.js'

const app = express()
const port = process.env.DOOR || 5000

app.use(json())
app.use(cors())
app.use("/users", usersRouter)
app.use("/groups", groupsRouter)
app.use("/messages", messagesRouter)

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`)
})
