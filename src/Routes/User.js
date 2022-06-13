import { Router } from "express";
import db from '../DB.js'
import AuthMidlleware from "../AuthMidlleware.js";

export const userRouter = Router()

userRouter
    .post("/", async (req, res) => {
        try {
            await db.read()
            if (req.body.name && req.body.name != ' ' && req.body.password && req.body.password != ' ' && req.body.email && req.body.email != ' ') {
                if (!db.data.users.some(_user => _user.email == req.body.email)) {
                    db.data.users.push({name: req.body.name, email: req.body.email, password: req.body.password, isPrivate: req.body.isPrivate || false, creationDate: new Date().toUTCString(), id: Math.random(), groups: req.body.groups || [], invites: []})
                    await db.write()
                    res.status(200).json({ message: "Success" })
                } else
                    res.status(406).json({ message: "Email already used" })
            } else
                res.status(406).json({ message: 'User data is incorrect'})
        } catch (error) {
            res.status(500).json({ error })
        }
    })
    .get("/:id", async (req, res) => {
        try {
            await db.read()
            const user = db.data.users.find(user => !user.isPrivate && user.id == req.params.id)
            if (user)
                res.status(200).json({ message: "Success", user: { id: user.id, name: user.name } })
            else
                res.status(404).json({ error: "User not found or, user has a private profile" })
        } catch (error) {
            res.status(500).json({ error })
        }
    })

userRouter.route("/auth/:email/:password")
        .all(AuthMidlleware)
        .get((req, res) => res.status(200).json({ user: req.user }))
        .delete(async (req, res) => {
            try {
                await db.read()
                db.data.users = db.data.users.filter(_user => _user.id != req.user.id)
                await db.write()
                res.status(200).json({ message: 'User deleted' })
            } catch (error) {
                res.status(500).json({ message: e })
            }
        })
        .patch(async (req, res) => {
            try {
                await db.read()
                for (const user of db.data.users) {
                    if (user.id == req.user.id) {
                        if (req.body.length < 0)
                            return res.status(406).json({ error: "At least one data needs to be modified (name, email, password or user privacy)" })
                        user.name = req.body.name ?? user.name 
                        user.email = req.body.email ?? user.email 
                        user.password = req.body.password ?? user.password 
                        user.isPrivate = req.body.isPrivate ?? user.isPrivate 
                        await db.write()
                        return res.status(200).json({ message: "User updated", user })
                    }
                }
            } catch (error) {
                res.status(500).json({ error })
            }
        })