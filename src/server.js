import express, { json } from 'express'
import cors from 'cors'
import { config } from 'dotenv'
import { Server } from 'socket.io'
import { createServer } from 'http'
import { users, logs, groups, dms, cfmTokens } from './DB.js'
import { LengthUUID, TokenUUID } from './UUID.js'
import { userRouter } from './routes/user.js'
import { queryRouter } from './routes/query.js'

const app = express()
const server = createServer(app)
const port = process.env.PORT || 5000
const io = new Server(server)

await users.read()
await logs.read()
await groups.read()
await dms.read()
await cfmTokens.read()

config()
app.use(json())
app.use(cors())
app.use("/api/user", userRouter)
app.use("/api/query", queryRouter)
app.use("/", express.static('static'))

io.on('connection', async (socket) => {
    if (!users.data[socket.handshake.auth.userID] || users.data[socket.handshake.auth.userID].authToken != socket.handshake.auth.token)
        return socket.emit('error', { error: "Invalid authentication" })

    socket.data.user = users.data[socket.handshake.auth.userID]
    await socket.join(users.data[socket.handshake.auth.userID].dms)
    await socket.join(Object.keys(users.data[socket.handshake.auth.userID].groups))
    await socket.join(socket.handshake.auth.userID)
    socket.emit('user', users.data[socket.handshake.auth.userID])

    socket.use((packet, next) => {
        if (packet[0] != "auth") {
            if (!socket.data.user)
                return next(new Error('No authentication provided'))

            if (users.data[socket.data.user.id].authToken != socket.data.user.authToken)
                return next(new Error('User authenticated in another device/instance'))
        }
        next()
    })

    socket.on('dmMessage', async data => {
        if (!data.to || !users.data[data.to])
            return socket.emit('error', { error: "No DM specified/found" })

        if (data.action != "delete" && !data.message)
            return socket.emit('error', { error: "No message specified" })

        if (data.to == socket.handshake.auth.userID)
            return socket.emit('error', { error: "You cannot send messages to yourself" })
        
        switch (data.action) {
            case "send":
                if (!dms.data[data.id]) {
                    let dmKey = LengthUUID(Object.keys(dms.data).length)
                    dms.data[dmKey] = { messages: {}, creationDate: new Date().getDate(), users: [socket.handshake.auth.userID, data.to], block: null }
                    users.data[socket.handshake.auth.userID].dms.push(dmKey)
                    users.data[data.to].dms.push(dmKey)
                    await socket.join(dmKey)
                    await users.write()
                }
                const messageID = LengthUUID(Object.keys(dms.data[dmKey].messages).length) 
                dms.data[dmKey].messages[messageID] = { by: socket.handshake.auth.userID, message: data.message, id: messageID, date: new Date().getDate() }
                break;

            case "delete" || "edit":
                if (!dms.data[data.id])
                    return socket.emit('error', { error: "No DM found" })

                if (!dms.data[data.id].messages[data.messageID])
                    return socket.emit('error', { error: "No message found" })

                if (dms.data[data.id].messages[data.messageID].by != socket.handshake.auth.userID)
                    return socket.emit('error', { error: `You cannot ${data.action} messages that you did not send` })

            case "delete":
                delete dms.data[data.id].messages[data.messageID]
                break;
                
            case "edit":
                dms.data[data.id].messages[data.messageID].message = data.message
                break;
        }
        io.to(data.id).emit('dmMessage', { action: data.action, id: data.messageID, content: data.action != "delete" ? data.message : undefined })
        await dms.write()
    })

    socket.on('dmSetBlock', async data => {
        if (!data.id || !dms.data[data.id])
            return socket.emit('error', { error: "No DM specified/found" })

        if (!data.unblock && dms.data[data.id].block)
            return socket.emit('error', { error: "DM already blocked" })

        dms.data[data.id].block = !data.unblock ? { by: socket.handshake.auth.userID, date: new Date().getDate(), reason: data.reason } : null
        io.to(data.id).emit('dmSetBlock', { block: dms.data[data.id].block })
        await dms.write()
    })

    socket.on('group', async data => {
        if (data.action != "create" && !groups.data[data.id])
            return socket.emit('error', { error: 'Invalid group' })

        if (data.action != "join" && data.action != "leave" && groups.data[data.id].owner !== socket.data.user.id)
            return socket.emit('error', { error: 'You are not the owner of this group' })

        switch (data.action) {
            case "delete":
                for (const userID in groups.data[data.id].users)
                    if (Object.hasOwnProperty.call(groups.data[data.id].users, userID))
                        delete users.data[userID].groups[data.id]
                
                delete groups.data[data.id]
                io.to(data.id).emit('groupEvent', { id: data.id, action: "delete" })
                io.socketsLeave(data.id)
                break

            case "create":
                const group = { name: data.name, id: LengthUUID(Object.keys(groups.data).length), users: {}, owner: socket.data.user.id, inviteToken: TokenUUID(), creationDate: new Date().getDate() }
                group.users[socket.data.userID] = { name: socket.data.user.name, id: socket.data.user.id, isOwner: true, isBlocked: false }
                groups.data[group.id] = group
                users.data[socket.data.userID].groups[group.id] = { name: group.name, id: group.id }
                await socket.join(group.id)
                socket.emit('groupEvent', { id: data.id, group, action: "create" })
                break
            
            case "rename":
                groups.data[data.id].name = data.name
                users.data[socket.data.userID].groups[data.id].name = data.name
                io.to(data.id).emit('groupEvent', { id: data.id, name: data.name, action: "rename" })
                break

            case "join":
                if (groups.data[data.id].users.find(user => user.id == socket.data.userID))
                    return socket.emit('error', { error: 'User is already in this group' })

                groups.data[data.id].users[socket.data.user.id] = { name: socket.data.user.name, id: socket.data.user.id, isOwner: false, isBlocked: false }
                users.data[socket.data.userID].groups[data.id] = { name: groups.data[data.id].name, id: data.id }
                await socket.join(data.id)
                io.to(data.id).emit('usersGroup', { users: groups.data[data.id].users, id: data.id })
                break

            case "leave":
                delete groups.data[groupIndex].users[socket.data.user.id]
                delete users.data[socket.data.userID].groups[data.id]
                await socket.leave(data.id)
                io.to(data.id).emit('usersGroup', { users: groups.data[data.id].users, id: data.id })
                break
        }
        await users.write()
        await groups.write()
    })

    socket.on('userInGroup',  async (data) => {
        if (!groups.data[data.groupID])
            return socket.emit('error', { error: 'Invalid group' })

        if (groups.data[data.groupID].owner !== socket.data.user.id)
            return socket.emit('error', { error: 'You are not the owner of this group' })

        if (!groups.data[data.groupID].users[data.userToInviteID] || data.userToInviteID == socket.data.user.id)
            return socket.emit('error', { error: 'Invalid user' })

        switch (data.action) {
            case "block":
                groups.data[data.groupID].users[data.userToInviteID].isBlocked = true
                break;

            case "unblock":
                groups.data[data.groupID].users[data.userToInviteID].isBlocked = false
                break;

            case "kick":
                delete groups.data[data.groupID].users[data.userToInviteID]
                delete users.data[data.userToInviteID].groups[data.groupID]
                break;

            default:
                return socket.emit('error', { error: 'Invalid action' })
        }
        await users.write()
        await groups.write()
        socket.to(data.groupID).emit('usersGroup', { users: groups.data[data.groupID].users, id: data.groupID, action: data.action })
    })

    socket.on('createInvite', async (data) => {
        if (!socket.data.user.groups[data.groupId])
            return socket.emit("error", { error: 'User is not in the group' })

        if (socket.data.user.id != groups.data[data.groupId].owner)
            return socket.emit("error", { error: 'You are not the owner of this group' })
            
        if (!users.data[data.to] || data.to === socket.data.user.id)
            return socket.emit("error", { error: 'Invalid user to invite' })
        
        const invite = { from: socket.data.userID, to: data.to, token: groups.data[data.groupId].inviteToken, groupID: data.groupId }
        users.data[data.to].invites[invite.token] = invite
        io.to(users.data[data.to].id).emit('inviteRecived', invite)
    })

    socket.on('handleInvite', async (data) => {
        if (!users.data[socket.data.userID].invites[data.token])
            return socket.emit('error', { error: 'Invalid invite' })

        const groupID = users.data[socket.data.userID].invites[data.token].groupID
        if (data.action === "accept") {
            users.data[socket.data.userID].groups[groupID] = { name: groups.data[groupID].name, id: groupID }
            groups.data[groupID].users[socket.data.userID] = { name: users.data[socket.data.userID].name, id: socket.data.userID, isOwner: false, isBlocked: false }
            await socket.join(groupID)
            await groups.write()
            io.to(groupID).emit('groupUserAction', { users: groups.data[groupID].users, groupID })
        }
        delete users.data[socket.data.userID].invites[data.token]
        await users.write()
        socket.emit("user", { user: users.data[socket.data.userID] })
    })

    socket.on('messages', async (data) => {
        if (!socket.data.user.groups[data.groupId])
            return socket.emit("error", { error: 'Invalid group' })

        if (groups.data[data.groupId].users[socket.data.userID].isBlocked)
            return socket.emit("error", { error: 'You are blocked from this group' })
        
        switch (data.action) {
            case "send":
                const message = { from: users.data[socket.data.userID].name, id: LengthUUID(Object.keys(groups.data[data.groupId].messages).length), message: data.message, date: new Date().getDate() }
                groups.data[data.groupId].messages[message.id] = message
                break

            case "delete":
                delete groups.data[data.groupId].messages[data.messageId]
                break

            case "edit":
                groups.data[data.groupId].messages[data.messageId].message = data.message
                break
        }
        io.to(data.groupId).emit("messages", { messages: groups.data[data.groupId].messages, groupID: data.groupId })
        await groups.write()
    })

    socket.on('deleteUser', async () => {
        for (const groupID in users.data[socket.data.user.id].groups) {
            if (Object.hasOwnProperty.call(users.data[socket.data.user.id].groups, groupID)) {
                delete groups.data[groupID].users[socket.data.user.id]
                socket.leave(groupID)
                io.to(groupID).emit('usersGroup', { users: groups.data[groupID].users, id: groupID })
            }
        }
        delete users.data[socket.data.user.id]
        logs.data.push({ userID: socket.data.user.id, ip: socket.handshake.address, host: socket.handshake.url, method: "delete", date: new Date().getDate() })
        await users.write()
        await logs.write()
        socket.disconnect()
    })

    socket.on('disconnect', async () => {
        if (socket.data.user && users.data[socket.data.user.id]) {
            users.data[socket.data.user.id].authToken = undefined
            logs.data.push({ userID: socket.data.user.id, ip: socket.handshake.address, host: socket.handshake.url, method: "logout", date: new Date().getDate() })
            await users.write()
            await logs.write()
        }
    })
})

server.listen(port)