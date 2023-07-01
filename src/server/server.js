import express, { json } from 'express'
import cors from 'cors'
import { rm, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { config } from 'dotenv'
import { Server } from 'socket.io'
import { connect } from 'mongoose'
import { createServer } from 'http'
import queryRouter from './Routes/query.js'
import userRouter from './Routes/user.js'
import chatRouter from './Routes/chat.js'
import uploadRouter from './Routes/upload.js'
import { Group } from './models/group.model.js'
import { User } from './models/user.model.js'
import { Dm } from './models/dm.model.js'
import { Invite } from './models/invite.model.js'
import uploadPath from './helpers/uploadPath.js'

const app = express()
const server = createServer(app)
const io = new Server(server)

!existsSync(uploadPath) && await mkdir(uploadPath)
config()
app.use(json())
app.use(cors())
app.use("/api/chat", chatRouter)
app.use("/api/user", userRouter)
app.use("/api/query", queryRouter)
app.use("/api/upload", uploadRouter)
app.use(express.static('./src/public'))
io.on('connection', async socket => {
    const checkError = document => (document?.errors?.message || !document) && socket.emit('error', { error: document?.errors?.message || "Invalid request"})
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

    socket.on('dm', async (data) => {
        let block = undefined
        let dmObj = undefined
        switch (data.action) {
            case "create":
                const otherUser = await User.findOne({ uid: data.userUID }, { uid: 1, name: 1, image: 1 })
                if (checkError(otherUser) || await Dm.exists({ users: [user.uid, otherUser.uid] })) return 
                const otherUserSocket = (await io.sockets.in(data.userUID).fetchSockets())[0]
                const dm = new Dm({ users: [user.uid, otherUser.uid] })
                dmObj = { ...dm.toObject(), users: [{ ...user, password: undefined, email: undefined, otherInstance: undefined, authToken: undefined }, otherUser.toObject()] }
                otherUserSocket && otherUserSocket.join(dm._id.toString())
                await socket.join(dm._id.toString())
                await dm.save()
                break;

            case "leave":
                if (checkError(await Dm.findOneAndDelete({ _id: data.id, users: user.uid }))) return
                user.chats = user.chats.filter(chat => chat._id != data.id)
                break;
                    
            case "setBlock":
                block = { by: user.uid, date: new Date(), reason: data.reason }
                if (checkError(await Dm.findOneAndUpdate({ _id: data.id, users: [user.uid], block: null }, { block }))) return
                break;
        }
        io.to(data.id || dmObj._id.toString()).emit("chat", { id: data.id, action: data.action, chat: dmObj, block })
        data.action == "leave" && io.socketsLeave(data.id) 
    })

    socket.on('group', async data => {
        switch (data.action) {
            case "create":
                const newGroup = new Group({ name: data.name, description: data.description, image: data.image, owner: user.uid, users: [{ uid: user.uid, isOwner: true, isBlocked: false }] })
                const newObjGroup = newGroup.toObject()
                user.chats.push(newObjGroup)
                await newGroup.save()
                await socket.join(newGroup._id.toString())
                return socket.emit("chat", { chat: newObjGroup, action: data.action })

            case "delete":
                const deletGroup = await Group.findOneAndDelete({ _id: data.id, owner: user.uid })
                if (checkError(deletGroup)) return
                user.chats = user.chats.filter(chat => chat._id == data.id && chat.owner == user.uid)
                io.to(data.id).emit("chat", { id: data.id, action: data.action })
                deletGroup.messages.forEach(async message => message.contentType == "file" && await rm(uploadPath + message.content.url))
                await rm(uploadPath + deletGroup.image)
                return io.socketsLeave(data.id)
            
            case "rename":
                if (checkError(await Group.findOneAndUpdate({ _id: data.id, owner: user.uid }, { name: data.name }))) return
                return io.to(data.id).emit("chat", { id: data.id, name: data.name, action: data.action })

            case "join":
                const groupToJoin = await Group.findOneAndUpdate({ _id: data.id, inviteToken: data.token, $not: { users: user.uid } }, { users: { $push: { name: user.name, uid: user.uid, isOwner: false, isBlocked: false } } })
                if (checkError(groupToJoin)) return
                const objGroup = groupToJoin.toObject()
                user.groups.push(objGroup)
                socket.emit("chat", { chat: objGroup, action: data.action })
                io.to(data.id).emit('userInChat', { userUID: user.uid, id: data.id })
                return await socket.join(data.id)

            case "leave":
                if (checkError(await Group.findByIdAndUpdate(data.id, { $pull: { users: { uid: user.uid } } }))) return
                user.chats = user.chats.filter(chat => chat._id != data.id)
                io.to(data.id).emit('userInChat', { userUID: user.uid, id: data.id })
                return await socket.leave(data.id)
        }
    })

    socket.on('userInChat', async (data) => {
        if (data.userUID == user.uid)
            return socket.emit('error', { error: 'Invalid user' })

        switch (data.action) {
            case "unblock":
            case "block":
                if (checkError(await Group.findOneAndUpdate({ _id: data.groupID, owner: user.uid, users: [data.userUID] }, { "users.$[user].isBlocked": true }, { arrayFilters: [{ "user.uid": data.userUID }] }))) return
                break;

            case "kick":
                if (checkError(await Group.findOneAndUpdate({ _id: data.groupID, owner: user.uid, users: [data.userUID] }, { $pull: { users: { uid: data.userUID } } }))) return
                user.chats = user.chats.filter(chat => chat._id != data.id)
                break;
        }
        socket.to(data.groupID).emit('userInChat', { user: data.userUID, id: data.groupID, action: data.action })
        data.action == "kick" && (await io.in(data.groupID).fetchSockets()).find(socket => socket.data.userUID == data.userUID).leave(data.groupID)
    })

    socket.on('invite', async data => {
        switch (data.action) {
            case "create":
                if (await Invite.exists({ from: user.uid, to: data.to })) return 
                const userInvite = await User.findOne({ uid: data.to })
                if (checkError(userInvite) || data.to === user.uid) return
                const inviteGroup = await Group.findById(data.chatID)
                if (checkError(inviteGroup)) return
                const invite = new Invite({ from: user.uid, to: userInvite.uid, description: "bababui", group: { _id: inviteGroup._id, token: inviteGroup.inviteToken } })
                const inviteObj = invite.toObject()
                await invite.save()
                user.invites.push(inviteObj)
                return io.to(data.to).emit('invite', { action: "recived", invite: inviteObj })


            case "handle":
                const handleInvite = await Invite.findOneAndDelete({ _id: data.id, "to": user.uid })
                let group = null
                if (checkError(handleInvite)) return
                if (data.method == "accept") {
                    group = await Group.findOneAndUpdate({ _id: handleInvite.group.id, inviteToken: handleInvite.group.token }, { $push: { users: { name: user.name, uid: user.uid, isOwner: false, isBlocked: false } } }, { returnDocument: "after", projection: { messages: 0 } })
                    io.to(group._id.toString()).emit('userInChat', { user: { ...user, password: undefined, email: undefined }, id: group._id.toString() })
                    await socket.join(group._id.toString())
                }
                user.invites = user.invites.filter(_invite => _invite._id == handleInvite._id)
                return socket.emit("invite", { action: "handled", inviteID: data._id, chat: group?.toObject() })
        }
    })

    socket.on('message', async data => {
        const options = { arrayFilters: [{ "elem.id": data.id }] }
        const filter = {
            _id: data.chatID, 
            ...(data.chatType == "dm" ? { "users": user.uid } : { "users.uid": user.uid }),
            ...(data.action != "send" && { "messages.id": data.id, ...(data.action == "view" && { "messages.from": { $not: { $eq: user.uid } } }) }), 
        }
        if ((data.action == "edit" || data.action == "delete") && data.contentType == "file") {
            await rm(uploadPath + data.contentURL)
            data.action == "edit" && await writeFile(uploadPath + filePath, Buffer.from(tmpFiles[req.query.userUID].split(',')[1], 'base64'))
        }
        const update = 
            data.action == "send" ? { $push: { messages: { from: { name: user.name, uid: user.uid }, contentType: data.contentType, id: data.id, content: data.content, views: [user.uid], date: new Date() } } } :
            data.action == "delete" ? { $pull: { messages: { id: data.id } } } :
            data.action == "edit" ? { "messages.$[elem].content": data.content } :
            data.action == "view" ? { $push: { "messages.$[elem].views": user.uid } } : null
        const chat = data.chatType == "dm" ? await Dm.findOneAndUpdate({ ...filter,  block: null }, update, options) : await Group.findOneAndUpdate({ ...filter, "users.isBlocked": false }, update, options) 
        if (checkError(chat)) return
        io.to(chat._id.toString()).emit("message", { message: update?.$push?.messages || { id: data.id, date: new Date(), content: data.content, contentType: data.contentType }, chatID: data.chatID, action: data.action })
    })

    /*socket.on('deleteUser', async () => {
        for (const groupID in users.data[user.uid].groups) {
            if (Object.hasOwnProperty.call(users.data[user.uid].groups, groupID)) {
                delete Group.data[groupID].users[user.uid]
                socket.broadcast.to(groupID).emit('userInChat', { users: Group.data[groupID].users, id: groupID })
            }
        }
        delete users.data[user.uid]
        logs.data.push({ userID: user.uid, ip: socket.handshake.address, host: socket.handshake.url, method: "delete", date: new Date() })
        await users.write()
        await logs.write()
        socket.disconnect()
    })*/
})
connect(process.env.API_URI, { useNewUrlParser: true, useUnifiedTopology: true }).then(() => server.listen(process.env.PORT)).catch(error => console.log(error))
