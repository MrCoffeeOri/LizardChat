import express, { json } from 'express'
import cors from 'cors'
import { userRouter } from './Routes/User.js'
import { groupRouter } from './Routes/Group.js'
import { messageRouter } from './Routes/Message.js'
import { queryRouter } from './Routes/Query.js'
import { inviteRouter } from './Routes/Invite.js'
import { users, authLogs, groups, authTokens } from './DB.js'
import AuthMidlleware from './AuthMidlleware.js'

const app = express()
const port = process.env.DOOR || 5000

await users.read()
await authLogs.read()
await groups.read()
await authTokens.read()

app.use(json())
app.use(cors())
app.use("/", express.static('public'))
app.use("/api/query", queryRouter)
app.use("/api/user", userRouter)
app.use("/api/group", groupRouter)
app.use("/api/message", messageRouter)
app.use("/api/invite", inviteRouter)

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`)
})