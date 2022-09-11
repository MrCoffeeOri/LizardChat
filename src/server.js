import express, { json } from 'express'
import cors from 'cors'
import { config } from 'dotenv'
import { Server } from 'socket.io'
import { createServer } from 'http'
import { users, logs, groups, dms, cfmTokens } from './DB.js'
import { LengthUUID, TokenUUID } from './UUID.js'
import { userRouter } from './Routes/user.js'
import { queryRouter } from './Routes/query.js'
import { chatRouter } from './Routes/chat.js'

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
app.use("/api/chat", chatRouter)
app.use("/api/user", userRouter)
app.use("/api/query", queryRouter)
app.use(express.static('public'))

io.on('connection', async socket => {
    if (!users.data[socket.handshake.auth.userID] || users.data[socket.handshake.auth.userID].authToken != socket.handshake.auth.token)
        return socket.emit('error', { error: "Invalid authentication" })

    socket.data.user = users.data[socket.handshake.auth.userID]
    await socket.join(Object.keys(socket.data.user.dms))
    await socket.join(Object.keys(socket.data.user.groups))
    await socket.join(socket.handshake.auth.userID)
    socket.emit('user', UserParser(socket.data.user))

    socket.use((packet, next) => {
        if (packet[0] != "auth") {
            if (!socket.data.user)
                return next(new Error('No authentication provided'))

            if (users.data[socket.data.user.id].authToken != socket.handshake.auth.token) {
                users.data[socket.data.user.id].otherInstance = true
                return socket.disconnect()
            }
        }
        if (packet[0] == "group" || packet[0] == "userInGroup" || packet[0] == "createInvite") {
            const id = packet[1].id || packet[1].groupID
            if ((packet[1].action != "create" || packet[0] == "createInvite") && !groups.data[id])
                return socket.emit('error', { error: 'Invalid group' })

            if ((packet[1].action == "rename" || packet[1].action == "delete" || packet[0] == "createInvite") && groups.data[id].owner !== socket.data.user.id)
                return socket.emit('error', { error: 'You are not the owner of this group' })
        }
        next()
    })

    socket.on('DM', async data => {
        if (data.action != "create" && (!data.id || !dms.data[data.id]))
            return socket.emit('error', { error: "No DM specified or found" })

        let parsedDM = undefined
        let block = undefined
        switch (data.action) {
            case "create":
            if (!data.userID || !users.data[data.userID])
                return socket.emit('error', { error: "Invalid user" })

            for (const dmID in users.data[socket.data.user.id].dms)
                if (Object.hasOwnProperty.call(users.data[socket.data.user.id].dms, dmID) && dms.data[dmID].users[data.userID])
                    return socket.emit('error', { error: "DM already created" })

            const dmID = LengthUUID(Object.keys(dms.data).length)
            const otherUserSocket = (await io.sockets.in(data.userID).fetchSockets())[0]
            dms.data[dmID] = { id: dmID, users: { [socket.data.user.id]: { name: socket.data.user.name, id: socket.data.user.id }, [data.userID]: { name: users.data[data.userID].name, id: data.userID } }, creationDate: new Date(), messages: {} }
            users.data[socket.data.user.id].dms[dmID] = true
            users.data[data.userID].dms[dmID] = true
            await socket.join(dmID)
            otherUserSocket && otherUserSocket.join(dmID)
            parsedDM = ChatParser(dmID)
            data.id = dmID
            await users.write()
            break;
            
            case "leave":
                for (const userID in dms.data[data.id].users)
                    if (Object.hasOwnProperty.call(dms.data[data.id].users, userID))
                        delete users.data[userID].dms[data.id]

                delete dms.data[data.id]
                await users.write()
                break;
                    
            case "setBlock":
                if (data.block && dms.data[data.id].block)
                    return socket.emit('error', { error: "DM already blocked" })

                dms.data[data.id].block = data.block ? { by: socket.handshake.auth.userID, date: new Date(), reason: data.reason } : undefined
                block = dms.data[data.id].block
                break;
        }
        await dms.write()
        io.to(data.id).emit("DM", { id: data.id, action: data.action, dm: parsedDM, block })
        data.action == "leave" && io.socketsLeave(data.id)
    })

    socket.on('group', async data => {
        switch (data.action) {
            case "delete":
                for (const userID in groups.data[data.id].users)
                    if (Object.hasOwnProperty.call(groups.data[data.id].users, userID))
                        delete users.data[userID].groups[data.id]
                
                delete groups.data[data.id]
                io.to(data.id).emit('group', { id: data.id, action: data.action })
                io.socketsLeave(data.id)
                break

            case "create":
                if (Object.keys(users.data[socket.data.user.id]).length == 70)
                    return socket.emit('error', { error: "You cannot create more than 70 groups" })
                    
                const group = { name: data.name, description: data.description, id: LengthUUID(Object.keys(groups.data).length), users: {}, messages: {}, owner: socket.data.user.id, inviteToken: TokenUUID(), creationDate: new Date() }
                group.users[socket.data.user.id] = { name: socket.data.user.name, id: socket.data.user.id, isOwner: true, isBlocked: false }
                groups.data[group.id] = group
                users.data[socket.data.user.id].groups[group.id] = true
                await socket.join(group.id)
                socket.emit('group', { group: {...group, messages: [], users: [{ name: socket.data.user.name, id: socket.data.user.id, isOwner: true, isBlocked: false }]}, action: data.action })
                break
            
            case "rename":
                groups.data[data.id].name = data.name
                io.to(data.id).emit('group', { id: data.id, name: data.name, action: "rename" })
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
                socket.emit('group', { id: data.id, name: data.name, action: "leave" })
                await socket.leave(data.id)
                break
        }
        await users.write()
        await groups.write()
    })

    socket.on('userInGroup',  async (data) => {
        if (!groups.data[data.groupID].users[data.userID] || data.userID == socket.data.user.id)
            return socket.emit('error', { error: 'Invalid user' })

        switch (data.action) {
            case "unblock":
            case "block":
                groups.data[data.groupID].users[data.userID].isBlocked = data.action == "block"
                break;

            case "kick":
                delete groups.data[data.groupID].users[data.userID]
                delete users.data[data.userID].groups[data.groupID]
                break;
        }
        await users.write()
        await groups.write()
        socket.to(data.groupID).emit('usersInGroup', { users: groups.data[data.groupID].users, id: data.groupID, action: data.action })
        if (data.action == "kick") {
            const userToKickSocket = (await io.in(data.groupID).fetchSockets()).find(socket => socket.data.user.id == data.userID)
            userToKickSocket && userToKickSocket.leave(data.groupID)
        }
    })

    socket.on('createInvite', async (data) => {
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

        if (data.action == "accept") {
            users.data[socket.data.user.id].groups[groupID] = true
            groups.data[groupID].users[socket.data.user.id] = { name: users.data[socket.data.user.id].name, id: socket.data.user.id, isOwner: false, isBlocked: false }
            io.to(groupID).emit('usersInGroup', { users: Object.values(groups.data[groupID].users), id: groupID })
            await socket.join(groupID)
            await groups.write()
        }
        delete users.data[socket.data.user.id].invites[data.id]
        await users.write()
        socket.emit("inviteHandled",{ inviteID: data.id, chat: data.action == "accept" ? ChatParser(groupID) : undefined })
    })

    socket.on('message', async (data) => {
        const group = dms.data[data.chatID] || groups.data[data.chatID]
        if (!group)
            return socket.emit("error", { error: `Invalid chat` })
        
        if (group.isBlocked || group.block)
            return socket.emit("error", { error: `You are blocked from the chat` })

        if (data.action != "send" && (!data.id || !group.messages[data.id]))
            return socket.emit("error", { error: 'Message deleted or missing ID' })

        if ((data.action == "edit" || data.action == "delete") && group.messages[data.id].from.id != socket.data.user.id)
            return socket.emit("error", { error: 'You are not the owner of this message' })

        let message = undefined
        switch (data.action) {
            case "send":
                message = { from: { name: socket.data.user.name, id: socket.data.user.id }, id: LengthUUID(Object.keys(group.messages).length), message: data.message, views: { [socket.data.user.id]: true }, date: new Date(), }
                group.messages[message.id] = message
                break

            case "delete":
                delete group.messages[data.id]
                break

            case "edit":
                group.messages[data.id].message = data.message
                message = group.messages[data.id]
                break

            case "view":
                if (group.messages[data.id].views[socket.data.user.id])
                    return socket.emit("error", { error: 'User has already viewed this message' })

                if (group.messages[data.id].from.id == socket.data.user.id)
                    return socket.emit("error", { error: 'User cannot view his own message' })

                group.messages[data.id].views[socket.data.user.id] = true
                message = group.messages[data.id]
                break
        }
        dms.data[data.chatID] ? await dms.write() : await groups.write()
        io.to(data.chatID).emit("message", { message: message && { ...message, views: Object.keys(message.views) }, chatID: data.chatID, action: data.action, id: data.id })
    })

    socket.on('deleteUser', async () => {
        for (const groupID in users.data[socket.data.user.id].groups) {
            if (Object.hasOwnProperty.call(users.data[socket.data.user.id].groups, groupID)) {
                delete groups.data[groupID].users[socket.data.user.id]
                socket.broadcast.to(groupID).emit('usersInGroup', { users: groups.data[groupID].users, id: groupID })
            }
        }
        delete users.data[socket.data.user.id]
        logs.data.push({ userID: socket.data.user.id, ip: socket.handshake.address, host: socket.handshake.url, method: "delete", date: new Date() })
        await users.write()
        await logs.write()
        socket.disconnect()
    })

    socket.on('disconnect', async () => {
        if (socket.data.user && users.data[socket.data.user.id] && !users.data[socket.data.user.id].otherInstance) {
            users.data[socket.data.user.id].authToken = undefined
            logs.data.push({ userID: socket.data.user.id, ip: socket.handshake.address, host: socket.handshake.url, method: "logout", date: new Date() })
            await logs.write()
        }
        users.data[socket.data.user.id].otherInstance = false
        await users.write()
    })
})
server.listen(port)

function UserParser(rawUser) {
    let responseUser = {
        name: rawUser.name,
        id: rawUser.id,
        email: rawUser.email,
        chats: [],
        invites: Object.values(rawUser.invites)
    }
    for (const groupID in rawUser.groups) Object.hasOwnProperty.call(rawUser.groups, groupID) && responseUser.chats.push(ChatParser(groupID, rawUser.id));
    for (const dmID in rawUser.dms) Object.hasOwnProperty.call(rawUser.dms, dmID) && responseUser.chats.push(ChatParser(dmID, rawUser.id));

    return responseUser
}

function ChatParser(id, userID) {
    const chat = groups.data[id] || dms.data[id]
    const messages = Object.values(chat.messages)
    let filteredMessages = []
    for (let i = 0; i < (messages.length < 10 ? messages.length : 10); i++)
        filteredMessages.unshift({...messages[messages.length - i - 1], views: Object.keys(messages[messages.length - i - 1].views)})
        
    return { 
        ...chat,
        remainingMessages: messages.length - 10 > 0,
        users: Object.values(chat.users),
        messages: filteredMessages,
        inviteToken: groups.data[id] && groups.data[id].owner == userID ? groups.data[id].inviteToken : undefined
    }
}