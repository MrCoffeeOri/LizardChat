import express, { json } from 'express'
import cors from 'cors'
import { userRouter } from './Routes/User.js'
import { groupRouter } from './Routes/Group.js'
import { messageRouter } from './Routes/Message.js'
import { queryRouter } from './Routes/Query.js'

const app = express()
const port = process.env.DOOR || 5000

app.use(json())
app.use(cors())
app.use("/users", userRouter)
app.use("/groups", groupRouter)
app.use("/messages", messageRouter)
app.use("/query", queryRouter)

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`)
})
