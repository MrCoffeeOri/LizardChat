import express, { json } from 'express'
import cors from 'cors'
import { userRouter } from './Routes/User.js'
import { groupRouter } from './Routes/Group.js'
import { messageRouter } from './Routes/Message.js'
import { queryRouter } from './Routes/Query.js'
import { inviteRouter } from './Routes/Invite.js'
import { users, authLogs, groups } from './DB.js'

const app = express()
const port = process.env.DOOR || 5000

await users.read()
await authLogs.read()
await groups.read()

app.use(json())
app.use(cors())
app.use("/query", queryRouter)
app.use("/user", userRouter)
app.use("/group", groupRouter)
app.use("/message", messageRouter)
app.use("/invite", inviteRouter)

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`)
})