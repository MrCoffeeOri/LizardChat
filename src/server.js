import express, { json } from 'express'
import cors from 'cors'
import { config } from 'dotenv'
import { Server } from 'socket.io'
import { createServer } from 'http'
import { users, logs, groups, dms, cfmTokens, Find } from './DB.js'
import { LengthUUID, TokenUUID } from './UUID.js'
import { userRouter } from './Routes/user.js'
import { queryRouter } from './Routes/query.js'
import { groupRouter } from './Routes/group.js'

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
app.use("/api/group", groupRouter)
app.use("/api/user", userRouter)
app.use("/api/query", queryRouter)
app.use(express.static('public'))

io.on('connection', async socket => {
    if (!users.data[socket.handshake.auth.userID] || users.data[socket.handshake.auth.userID].authToken != socket.handshake.auth.token)
        return socket.emit('error', { error: "Invalid authentication" })

    socket.data.user = users.data[socket.handshake.auth.userID]
    socket.data.responseUser = UserParser(socket.data.user)
    await socket.join(Object.keys(socket.data.user.dms))
    await socket.join(Object.keys(socket.data.user.groups))
    await socket.join(socket.handshake.auth.userID)
    socket.emit('user', socket.data.responseUser)

    socket.use((packet, next) => {
        if (packet[0] != "auth") {
            if (!socket.data.user)
                return next(new Error('No authentication provided'))

            if (users.data[socket.data.user.id].authToken != socket.handshake.auth.token)
                return socket.disconnect()
        }
        if (packet[0] == "group" || packet[0] == "userInGroup") {
            const id = packet[1].id || packet[1].groupID
            if (packet[1].action != "create" && !groups.data[id])
                socket.emit('error', { error: 'Invalid group' })
            if (packet[1].action == "rename" || packet[1].action == "delete" && groups.data[id].owner !== socket.data.user.id)
                socket.emit('error', { error: 'You are not the owner of this group' })
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

        if (data.action == "delete" || data.action == "edit") {
            if (!dms.data[data.id])
                return socket.emit('error', { error: "No DM found" })

            if (!dms.data[data.id].messages[data.messageID])
                return socket.emit('error', { error: "No message found" })

            if (dms.data[data.id].messages[data.messageID].by != socket.handshake.auth.userID)
                return socket.emit('error', { error: `You cannot ${data.action} messages that you did not send` })
        }
        switch (data.action) {
            case "send":
                if (!dms.data[data.id]) {
                    let dmKey = LengthUUID(Object.keys(dms.data).length)
                    dms.data[dmKey] = { messages: {}, creationDate: new Date().toLocaleString(), users: [socket.handshake.auth.userID, data.to], block: null }
                    users.data[socket.handshake.auth.userID].dms.push(dmKey)
                    users.data[data.to].dms.push(dmKey)
                    await socket.join(dmKey)
                    await users.write()
                }
                const messageID = LengthUUID(Object.keys(dms.data[dmKey].messages).length) 
                dms.data[dmKey].messages[messageID] = { by: socket.handshake.auth.userID, message: data.message, id: messageID, date: new Date().toLocaleString() }
                break;

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

        dms.data[data.id].block = !data.unblock ? { by: socket.handshake.auth.userID, date: new Date().toLocaleString(), reason: data.reason } : null
        io.to(data.id).emit('dmSetBlock', { block: dms.data[data.id].block })
        await dms.write()
    })

    socket.on('group', async data => {
        switch (data.action) {
            case "delete":
                for (const userID in groups.data[data.id].users)
                    if (Object.hasOwnProperty.call(groups.data[data.id].users, userID))
                        delete users.data[userID].groups[data.id]
                
                delete groups.data[data.id]
                io.to(data.id).emit('groupEvent', { id: data.id, action: data.action })
                io.socketsLeave(data.id)
                break

            case "create":
                if (socket.data.responseUser.groups.length == 70 || Object.keys(users.data[socket.data.user.id]).length == 70)
                    return socket.emit('error', { error: "You cannot create more than 70 groups" })
                    
                const group = { name: data.name, description: data.description, id: LengthUUID(Object.keys(groups.data).length), users: {}, messages: {}, owner: socket.data.user.id, inviteToken: TokenUUID(), creationDate: new Date().toLocaleString() }
                group.users[socket.data.user.id] = { name: socket.data.user.name, id: socket.data.user.id, isOwner: true, isBlocked: false }
                groups.data[group.id] = group
                users.data[socket.data.user.id].groups[group.id] = true
                await socket.join(group.id)
                socket.emit('groupEvent', { group: {...group, messages: [], users: [{ name: socket.data.user.name, id: socket.data.user.id, isOwner: true, isBlocked: false }]}, action: data.action })
                break
            
            case "rename":
                groups.data[data.id].name = data.name
                io.to(data.id).emit('groupEvent', { id: data.id, name: data.name, action: "rename" })
                break

            case "join":
                if (data.token != groups.data[data.id].inviteToken)
                    return socket.emit('error', { error: "Invalid token" })
                    
                if (groups.data[data.id].users[socket.data.user.id])
                    return socket.emit('error', { error: 'User is already in this group' })

                groups.data[data.id].users[socket.data.user.id] = { name: socket.data.user.name, id: socket.data.user.id, isOwner: false, isBlocked: false }
                users.data[socket.data.user.id].groups[data.id] = true
                await socket.join(data.id)
                io.to(data.id).emit('usersInGroup', { users: Object.values(groups.data[data.id].users), id: data.id })
                break

            case "leave":
                delete groups.data[data.id].users[socket.data.user.id]
                delete users.data[socket.data.user.id].groups[data.id]
                io.to(data.id).emit('usersInGroup', { users: Object.values(groups.data[data.id].users), id: data.id })
                socket.emit('groupEvent', { id: data.id, name: data.name, action: "leave" })
                await socket.leave(data.id)
                break
        }
        await users.write()
        await groups.write()
    })

    socket.on('userInGroup',  async (data) => {
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
        socket.to(data.groupID).emit('usersInGroup', { users: groups.data[data.groupID].users, id: data.groupID, action: data.action })
    })

    socket.on('createInvite', async (data) => {
        if (!socket.data.user.groups[data.groupID])
            return socket.emit("error", { error: 'User is not in the group' })

        if (socket.data.user.id != groups.data[data.groupID].owner)
            return socket.emit("error", { error: 'You are not the owner of this group' })
            
        if (!users.data[data.to] || data.to === socket.data.user.id)
            return socket.emit("error", { error: 'Invalid user to invite' })

        if (users.data[data.to].invites[socket.data.user.id])
            return socket.emit("error", { error: 'User already has an invite from you' })

        if (groups.data[data.groupID].users[data.to])
            return socket.emit("error", { error: 'User is already in the group' })

        const invite = { from: { name: socket.data.user.name, id: socket.data.user.id }, to: { name: users.data[data.to].name, id: data.to }, id: socket.data.user.id, token: groups.data[data.groupID].inviteToken, group: { id: data.groupID, name: groups.data[data.groupID].name, description: groups.data[data.groupID].description } }
        users.data[data.to].invites[invite.id] = invite
        io.to(data.to).emit('inviteRecived', invite)
        await users.write()
    })

    socket.on('handleInvite', async (data) => {
        const groupID = users.data[socket.data.user.id].invites[data.id].group.id
        if (!groupID || data.token != groups.data[groupID].inviteToken)
            return socket.emit('error', { error: 'Invalid invite' })

        if (data.action === "accept") {
            users.data[socket.data.user.id].groups[groupID] = true
            groups.data[groupID].users[socket.data.user.id] = { name: users.data[socket.data.user.id].name, id: socket.data.user.id, isOwner: false, isBlocked: false }
            io.to(groupID).emit('usersInGroup', { users: Object.values(groups.data[groupID].users), id: groupID })
            await socket.join(groupID)
            await groups.write()
        }
        delete users.data[socket.data.user.id].invites[data.id]
        socket.emit("user", UserParser(users.data[socket.data.user.id]))
        await users.write()
    })

    socket.on('message', async (data) => {
        if (!socket.data.user.groups[data.groupID])
            return socket.emit("error", { error: 'Invalid group' })

        if (groups.data[data.groupID].users[socket.data.user.id].isBlocked)
            return socket.emit("error", { error: 'You are blocked from this group' })

        if (data.action != "send" && !data.messageID && !groups.data[data.groupID].messages[data.messageID])
            return socket.emit("error", { error: 'Message ID is missing or does not exist' })

        if (data.action != "send" && data.action != "view" && groups.data[data.groupID].messages[data.messageID].from.split('-')[1] != socket.data.user.id)
            return socket.emit("error", { error: 'You are not the owner of this message' })

        let message = undefined
        switch (data.action) {
            case "send":
                message = { from: `${socket.data.user.name}-${socket.data.user.id}`, id: LengthUUID(Object.keys(groups.data[data.groupID].messages).length), message: data.message, views: [socket.data.user.id], date: new Date().toLocaleString(), }
                groups.data[data.groupID].messages[message.id] = message
                break

            case "delete":
                delete groups.data[data.groupID].messages[data.messageID]
                break

            case "edit":
                message = groups.data[data.groupID].messages[data.messageID].message = data.message
                break

            case "view":
                if (Find(groups.data[data.groupID].messages[data.messageID].views, view => view == socket.data.user.id))
                    return socket.emit("error", { error: 'You have already viewed this message' })

                groups.data[data.groupID].messages[data.messageID].views.push(socket.data.user.id)
                break
        }

        io.to(data.groupID).emit("message", { message, groupID: data.groupID, action: data.action, messageID: data.messageID })
        await groups.write()
    })

    socket.on('deleteUser', async () => {
        for (const groupID in users.data[socket.data.user.id].groups) {
            if (Object.hasOwnProperty.call(users.data[socket.data.user.id].groups, groupID)) {
                delete groups.data[groupID].users[socket.data.user.id]
                socket.broadcast.to(groupID).emit('usersInGroup', { users: groups.data[groupID].users, id: groupID })
            }
        }
        delete users.data[socket.data.user.id]
        logs.data.push({ userID: socket.data.user.id, ip: socket.handshake.address, host: socket.handshake.url, method: "delete", date: new Date().toLocaleString() })
        await users.write()
        await logs.write()
        socket.disconnect()
    })

    socket.on('disconnect', async () => {
        if (socket.data.user && users.data[socket.data.user.id]) {
            users.data[socket.data.user.id].authToken = undefined
            logs.data.push({ userID: socket.data.user.id, ip: socket.handshake.address, host: socket.handshake.url, method: "logout", date: new Date().toLocaleString() })
            await users.write()
            await logs.write()
        }
    })
})
server.listen(port)

function UserParser(rawUser) {
    let responseUser = {
        name: rawUser.name,
        id: rawUser.id,
        email: rawUser.email,
        dms: [],
        groups: [],
        invites: Object.values(rawUser.invites)
    }
    for (const groupID in rawUser.groups) {
        if (Object.hasOwnProperty.call(rawUser.groups, groupID)) {
            const messages = Object.values(groups.data[groupID].messages)
            let filteredMessages = []
            for (let i = 0; i < (messages.length < 10 ? messages.length : 10); i++)
                filteredMessages.unshift(messages[messages.length - i - 1])

            responseUser.groups.push({ 
                ...groups.data[groupID], 
                users: Object.values(groups.data[groupID].users),
                messages: filteredMessages,
                inviteToken: groups.data[groupID].owner == rawUser.id ? groups.data[groupID].inviteToken : undefined
            });
        }
    }
    for (const dmID in rawUser.dms)
        if (Object.hasOwnProperty.call(rawUser.dms, key))
            responseUser.dms.push({ ...dms.data[dmID], messages: undefined })

    return responseUser
}
