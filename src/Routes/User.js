import { Router } from "express";
import { FindDatasetIndex, users } from '../DB.js'
import AuthMidlleware from "../AuthMidlleware.js";

export const userRouter = Router()

userRouter
    .post("/", async (req, res) => {
        if (!req.body.name || req.body.name == ' ' && !req.body.password || req.body.password == ' ', !req.body.email || req.body.email == ' ')
            return res.status(400).json({ message: 'User data is incorrect'})
        
        if (users.data.some(user => user.email == req.body.email))
            return res.status(403).json({ message: "Email already used" })

        users.data.push({name: req.body.name, email: req.body.email, password: req.body.password, isPrivate: req.body.isPrivate || false, creationDate: new Date().toUTCString(), id: users.data.length + 1, groups: req.body.groups || [], invites: []})
        await users.write()
        res.status(201).json({ message: "User created" })
    })
    .get("/:id", async (req, res) => {
        const userIndex = FindDatasetIndex(users.data, user => user.id == req.params.id)
        if (userIndex == undefined)
            return res.status(404).json({ error: "User not found" })

        if (users.data[userIndex].isPrivate)
            return res.status(200).json({ message: "User has a private profile", user: { id: users.data[userIndex].id, name: users.data[userIndex].name, creationDate: users.data[userIndex].creationDate } })

        res.status(200).json({ message: "User found", user: { id: users.data[userIndex].id, name: users.data[userIndex].name, creationDate: users.data[userIndex].creationDate, groups: users.data[userIndex].groups } })
    })

userRouter.route("/auth/:email/:password")
    .all(AuthMidlleware)
    .get((req, res) => res.status(200).json({ user: req.user }))
    .delete(async (req, res) => {
        users.data = users.data.filter(_user => _user.id != req.user.id)
        await db.write()
        res.status(200).json({ message: 'User deleted' })
    })
    .patch(async (req, res) => {
        if (!req.body && !req.body.name && !req.body.email && !req.body.password && req.body.isPrivate == undefined)
            return res.status(400).json({ error: "At least one data needs to be modified (name, email, password or user privacy)" })

        users.data[req.userIndex].name = req.body.name ?? users.data[req.userIndex].name 
        users.data[req.userIndex].email = req.body.email ?? users.data[req.userIndex].email 
        users.data[req.userIndex].password = req.body.password ?? users.data[req.userIndex].password 
        users.data[req.userIndex].isPrivate = req.body.isPrivate ?? users.data[req.userIndex].isPrivate 
        await users.write()
        res.status(200).json({ message: "User updated", user: users.data[req.userIndex] })
    })