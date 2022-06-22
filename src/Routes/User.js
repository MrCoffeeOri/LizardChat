import { Router } from "express";
import { authLogs, authTokens, FindDatasetIndex, users } from '../DB.js'
import AuthMidlleware from "../AuthMidlleware.js";
import CreateUUID from "../CreateUUID.js";

export const userRouter = Router()

userRouter
    .post("/", async (req, res) => {
        if (!req.body.name || req.body.name == ' ' && !req.body.password || req.body.password == ' ', !req.body.email || req.body.email == ' ')
            return res.status(400).json({ message: 'User data is incorrect'})
        
        if (users.data.some(user => user.email == req.body.email))
            return res.status(403).json({ message: "Email already used" })

        const user = { name: req.body.name, email: req.body.email, password: req.body.password, isPrivate: req.body.isPrivate || false, creationDate: new Date().toUTCString(), id: users.data.length, groups: req.body.groups || [], invites: [] }
        const authToken = CreateUUID(12)
        authTokens.data.push({ token: authToken, userID: users.data.length })
        authLogs.data.push({ userID: users.data.length, ip: req.ip, method: "login", date: new Date().toUTCString() })
        users.data.push(user)
        await users.write()
        await authTokens.write()
        await authLogs.write()
        res.status(201).json({ message: "User created", user, authToken })
    })
    .get("/:id", async (req, res) => {
        const userIndex = FindDatasetIndex(users.data, user => user.id == req.params.id)
        if (userIndex == undefined)
            return res.status(404).json({ error: "User not found" })

        if (users.data[userIndex].isPrivate)
            return res.status(200).json({ message: "User has a private profile", user: { id: req.params.id, name: users.data[userIndex].name, creationDate: users.data[userIndex].creationDate } })

        res.status(200).json({ message: "User found", user: { id: req.params.id, name: users.data[userIndex].name, creationDate: users.data[userIndex].creationDate, groups: users.data[userIndex].groups } })
    })


userRouter.get("/login/:email/:password", async (req, res) => {
    const userIndex = FindDatasetIndex(users.data, user => user.email == req.params.email && user.password == req.params.password)
    if (userIndex == undefined)
        return res.status(401).json({ message: "Invalid login" })

    const authToken = CreateUUID(12)
    const authTokenIndex = FindDatasetIndex(authTokens.data, at => at.userID == users.data[userIndex].id)
    if (authTokenIndex == undefined) {
        authTokens.data.push({ token: authToken, userID: users.data[userIndex].id })
        await authTokens.write()
    } else
        authTokens.data[authTokenIndex].token = authToken

    authLogs.data.push({ userID: userIndex, ip: req.ip, method: "login", date: new Date().toUTCString() })
    await authLogs.write()
    await authTokens.write()
    res.status(200).json({ message: authTokenIndex == undefined ? "User authenticated" : "User was authenticated in other instance", authToken, user: users.data[userIndex] })
})

userRouter.delete("/logout/:authToken", AuthMidlleware, async (req, res) => {
    authTokens.data.splice(req.auhtTokenIndex, 1)
    authLogs.data.push({ userID: req.userIndex, ip: req.ip, method: "logout", date: new Date().toUTCString() })
    await authTokens.write()
    await authLogs.write()
    res.status(200).json({ message: "User logout" })
})

userRouter.get("/checkToken/:authToken", AuthMidlleware, (_, res) => res.status(200).json({ message: "Ok" }))

userRouter.get("/invites/:authToken", AuthMidlleware, (req, res) => res.status(200).json({ message: "Invites found", invites: users.data[req.userIndex].invites }))

userRouter.route("/:authToken")
    .all(AuthMidlleware)
    .get((req, res) => res.status(200).json({ user: users.data[req.userIndex] }))
    .delete(async (req, res) => {
        users.data.splice(req.userIndex, 1)
        authTokens.data.splice(req.auhtTokenIndex, 1)
        authLogs.data = authLogs.data.filter(authLog => authLog.userID != users.data[req.userIndex].id)
        await users.write()
        await authTokens.write()
        await authLogs.write()
        res.status(200).json({ message: 'User deleted' })
    })
    .patch(async (req, res) => {
        if (!req.body || (!req.body.name && !req.body.email && !req.body.password && req.body.isPrivate == undefined))
            return res.status(400).json({ error: "At least one data needs to be modified (name, email, password or user privacy)" })

        users.data[req.userIndex].name = req.body.name ?? users.data[req.userIndex].name 
        users.data[req.userIndex].email = req.body.email ?? users.data[req.userIndex].email 
        users.data[req.userIndex].password = req.body.password ?? users.data[req.userIndex].password 
        users.data[req.userIndex].isPrivate = req.body.isPrivate ?? users.data[req.userIndex].isPrivate 
        await users.write()
        res.status(200).json({ message: "User updated", user: users.data[req.userIndex] })
    })