import express, { json } from 'express'
import cors from 'cors'
import { config } from 'dotenv'
import { Server } from 'socket.io'
import { connect } from 'mongoose'
import { createServer } from 'http'
import { LengthUUID, TokenUUID } from './UUID.js'
import queryRouter from './Routes/query.js'
import userRouter from './Routes/user.js'
import chatRouter from './Routes/chat.js'
import { Group } from './models/groups.js'
import { User } from './models/users.js'
import { Dm } from './models/dms.js'
import { Invite } from './models/invites.js'

const app = express()
const server = createServer(app)
const io = new Server(server)

config()
app.use(json())
app.use(cors({ origin: 'https://nodechat-iu4f.onrender.com' }))
app.use("/api/chat", chatRouter)
app.use("/api/user", userRouter)
app.use("/api/query", queryRouter)
app.use(express.static('public'))
io.on('connection', async socket => {
    const user = await User.FindByUID(socket.handshake.auth.userID)
    if (!user || user.authToken != socket.handshake.auth.token)
        return socket.emit('error', { error: "Invalid authentication" })
    
    socket.data.userUID = user.uid
    await socket.join(user.chats.map(chat => chat._id.toString()))
    await socket.join(socket.handshake.auth.userID)
    socket.emit('user', user)
    socket.use(async (packet, next) => {
        if (packet[0] != "auth") {
            if (!user)
                return next(new Error('No authentication provided'))

            if (user.authToken != socket.handshake.auth.token) 
                return socket.disconnect()
        }
        next()
    })

    socket.on('DM', async data => {
        if (data.action != "create" && (!data._id || !dms.data[data._id]))
            return socket.emit('error', { error: "No DM specified or found" })

        let parsedDM = undefined
        let block = undefined
        switch (data.action) {
            case "create":
            if (!data.userID || !users.data[data.userID])
                return socket.emit('error', { error: "Invalid user" })

            for (const dmID in users.data[user.uid].dms)
                if (Object.hasOwnProperty.call(users.data[user.uid].dms, dmID) && dms.data[dmID].users[data.userID])
                    return socket.emit('error', { error: "DM already created" })

            const dmID = LengthUUID(Object.keys(dms.data).length)
            const otherUserSocket = (await io.sockets.in(data.userID).fetchSockets())[0]
            dms.data[dmID] = { id: dmID, users: { [user.uid]: { name: user.name, id: user.uid }, [data.userID]: { name: users.data[data.userID].name, id: data.userID } }, creationDate: new Date(), messages: {} }
            users.data[user.uid].dms[dmID] = true
            users.data[data.userID].dms[dmID] = true
            await socket.join(dmID)
            otherUserSocket && otherUserSocket.join(dmID)
            parsedDM = ChatParser(dmID)
            data._id = dmID
            await users.write()
            break;
            
            case "leave":
                for (const userID in dms.data[data._id].users)
                    if (Object.hasOwnProperty.call(dms.data[data._id].users, userID))
                        delete users.data[userID].dms[data._id]

                delete dms.data[data._id]
                await users.write()
                break;
                    
            case "setBlock":
                if (data.block && dms.data[data._id].block)
                    return socket.emit('error', { error: "DM already blocked" })

                dms.data[data._id].block = data.block ? { by: socket.handshake.auth.userID, date: new Date(), reason: data.reason } : undefined
                block = dms.data[data._id].block
                break;
        }
        await dms.write()
        io.to(data._id).emit("DM", { id: data._id, action: data.action, dm: parsedDM, block })
        data.action == "leave" && io.socketsLeave(data._id)
    })

    socket.on('group', async data => {
        if (data.action == "create") {
            const newGroup = new Group({ name: data.name, uid: LengthUUID((await Group.count()) + 1), description: data.description, owner: user.uid, users: [{ name: user.name, uid: user.uid, isOwner: true, isBlocked: false }] })
            const objGroup = newGroup.toObject()
            user.chats.push(objGroup)
            await newGroup.save()
            await socket.join(newGroup._id.toString())
            return socket.emit('group', { group: objGroup, action: data.action })
        }
        const group = await Group.findById(data.id)
        if (!group) 
            return socket.emit('error', { error: 'Invalid group' })

        switch (data.action) {
            case "delete":
                await group.delete()
                user.chats = user.chats.filter(chat => chat._id == data.id && chat.owner == user.uid)
                io.to(data.id).emit('group', { id: data.id, action: data.action })
                io.socketsLeave(data.id)
                break
            
            case "rename":
                await group.update({ name: data.name })
                io.to(data.id).emit('group', { id: data.id, name: data.name, action: data.action })
                break

            case "join":
                if (data.token != group.inviteToken)
                    return socket.emit('error', { error: "Invalid token" })
                    
                if (group.users.some(_user => _user.uid == user.uid))
                    return socket.emit('error', { error: 'User is already in this group' })

                const groupToJoinObj = group.toObject()
                user.groups.push(groupToJoinObj)
                socket.emit('group', { group: groupToJoinObj, action: data.action })
                io.to(data.id).emit('usersInGroup', { users: groupToJoinObj.users, id: data.id })
                await group.update({ users: { $push: { name: user.name, uid: user.uid, isOwner: false, isBlocked: false } }, inviteToken: TokenUUID() })
                await socket.join(data.id)
                break

            case "leave":
                delete Group.data[data._id].users[user.uid]
                delete users.data[user.uid].groups[data._id]
                io.to(data._id).emit('usersInGroup', { users: Object.values(Group.data[data._id].users), id: data._id })
                socket.emit('group', { id: data._id, name: data.name, action: data.action })
                await socket.leave(data._id)
                break
            }
    
    })

    socket.on('userInGroup',  async (data) => {
        if (!Group.data[data.groupID].users[data.userID] || data.userID == user.uid)
            return socket.emit('error', { error: 'Invalid user' })

        switch (data.action) {
            case "unblock":
            case "block":
                Group.data[data.groupID].users[data.userID].isBlocked = data.action == "block"
                break;

            case "kick":
                delete Group.data[data.groupID].users[data.userID]
                delete users.data[data.userID].groups[data.groupID]
                break;
        }
        await users.write()
        await Group.write()
        socket.to(data.groupID).emit('usersInGroup', { users: Group.data[data.groupID].users, id: data.groupID, action: data.action })
        if (data.action == "kick") {
            const userToKickSocket = (await io.in(data.groupID).fetchSockets()).find(socket => user.uid == data.userID)
            userToKickSocket && userToKickSocket.leave(data.groupID)
        }
    })

    socket.on('createInvite', async data => {
        const userInvite = await User.findOne({ uid: data.to })
        if (!userInvite || data.to === user.uid)
            return socket.emit("error", { error: 'Invalid user to invite' })
            
        if (await Invite.exists({ "from.uid": user.uid, "to.uid": data.to }))
            return socket.emit("error", { error: 'User already has an invite from you' })

        const inviteGroup = await Group.findById(data.groupID)
        if (!inviteGroup)
            return socket.emit("error", { error: 'Group does not exist' })

        if (inviteGroup.users.some(user => user.uid == data.to))
            return socket.emit("error", { error: 'User is already in the group' })

        const invite = new Invite({ from: user.uid, to: userInvite.uid, group: { _id: inviteGroup._id.toString(), token: inviteGroup.inviteToken } })
        const inviteObj = invite.toObject()
        await invite.save()
        user.invites.push(inviteObj)
        io.to(data.to).emit('inviteRecived', inviteObj)
    })

    socket.on('handleInvite', async (data) => {
        const invite = await Invite.findOne({ _id: data._id, "to": user.uid })
        if (!invite)
            return socket.emit('error', { error: 'Invalid invite' })
            
        const group = await Group.findOne({ _id: invite.group._id, inviteToken: invite.group.token })
        if (data.action == "accept") {
            await group.update({ $push: { users: { name: user.name, uid: user.uid, isOwner: false, isBlocked: false } } })
            io.to(group._id.toString()).emit('usersInGroup', { users: group.users, _id: group._id.toString() })
            await socket.join(group._id.toString())
        }
        await invite.delete()
        user.invites = user.invites.filter(_invite => _invite._id == invite._id)
        socket.emit("inviteHandled", { inviteID: data._id, chat: data.action == "accept" ? group.toObject() : undefined })
    })

    socket.on('message', async data => {
        const chat = await Dm.findOne({ _id: data.chatID, "users.uid": user.uid, block: null }) || await Group.findOne({ _id: data.chatID, "users.uid": user.uid, "users.isBlocked": false }) 
        if (!chat)
            return socket.emit("error", { error: `Invalid chat` })

        if (data.action != "send" && (!data.id || !chat.messages.some(message => message.id == data.id)))
            return socket.emit("error", { error: 'Message deleted or missing ID' })

        if ((data.action == "edit" || data.action == "delete") && chat.messages.find(message => message.id == data.id).from.uid != user.uid)
            return socket.emit("error", { error: 'You are not the owner of this message' })

        let message = undefined
        switch (data.action) {
            case "send":
                message = { from: { name: user.name, uid: user.uid }, contentType: data.contentType, id: LengthUUID(chat.messages.length), content: data.content, views: [user.uid], date: new Date() }
                chat.messages.push(message)
                break

            case "delete":
                chat.messages = chat.messages.filter(message => message.id != data.id) 
                break

            case "edit":
                const editMessage = chat.messages.find(message => message.id == data.id)
                editMessage.content = data.content
                message = editMessage
                break

            case "view":
                const viewMessage = chat.messages.find(message => message.id == data.id)
                if (viewMessage.views.some(view => view == user.uid))
                    return socket.emit("error", { error: 'User has already viewed this message' })

                if (viewMessage.from.uid == user.uid)
                    return socket.emit("error", { error: 'User cannot view his own message' })

                viewMessage.views.push(user.uid)
                message = viewMessage
                break
                
                default:
                    return socket.emit("error", { error: 'invalid action' })
            }
            chat.isNew = false
            chat.markModified("messages")
            await chat.save()
        io.to(chat._id.toString()).emit("message", { message: message ? { ...message, views: message.views } : undefined, chatID: data.chatID, action: data.action, id: data.id })
    })

    socket.on('deleteUser', async () => {
        for (const groupID in users.data[user.uid].groups) {
            if (Object.hasOwnProperty.call(users.data[user.uid].groups, groupID)) {
                delete Group.data[groupID].users[user.uid]
                socket.broadcast.to(groupID).emit('usersInGroup', { users: Group.data[groupID].users, id: groupID })
            }
        }
        delete users.data[user.uid]
        logs.data.push({ userID: user.uid, ip: socket.handshake.address, host: socket.handshake.url, method: "delete", date: new Date() })
        await users.write()
        await logs.write()
        socket.disconnect()
    })
})
connect(process.env.API_URI, { useNewUrlParser: true, useUnifiedTopology: true }).then(() => server.listen(process.env.PORT)).catch(error => console.log(error))
