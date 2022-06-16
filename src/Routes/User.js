import { Router } from "express";
import { db } from '../DB.js'
import AuthMidlleware from "../AuthMidlleware.js";

export const userRouter = Router()

userRouter
    .post("/", async (req, res) => {
        try {
            if (!req.body.name || req.body.name == ' ' && !req.body.password || req.body.password == ' ', !req.body.email || req.body.email == ' ')
                return res.status(406).json({ message: 'User data is incorrect'})
            
            await db.read()
            if (db.data.users.some(user => user.email == req.body.email))
                return res.status(406).json({ message: "Email already used" })

            db.data.users.push({name: req.body.name, email: req.body.email, password: req.body.password, isPrivate: req.body.isPrivate || false, creationDate: new Date().toUTCString(), id: Math.random(), groups: req.body.groups || [], invites: []})
            await db.write()
            res.status(200).json({ message: "User created" })
        } catch (error) {
            res.status(500).json({ error })
        }
    })
    .get("/:id", async (req, res) => {
        try {
            await db.read()
            const user = db.data.users.find(user => !user.isPrivate && user.id == req.params.id)
            if (!user)
                return res.status(404).json({ error: "User not found or, user has a private profile" })
            res.status(200).json({ message: "User found", user: { id: user.id, name: user.name, creationDate: user.creationDate, groups: user.groups } })
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
                if (!req.body && !req.body.name && !req.body.email && !req.body.password && req.body.isPrivate == undefined)
                    return res.status(406).json({ error: "At least one data needs to be modified (name, email, password or user privacy)" })

                await db.read()
                db.data.users[req.userIndex].name = req.body.name ?? db.data.users[req.userIndex].name 
                db.data.users[req.userIndex].email = req.body.email ?? db.data.users[req.userIndex].email 
                db.data.users[req.userIndex].password = req.body.password ?? db.data.users[req.userIndex].password 
                db.data.users[req.userIndex].isPrivate = req.body.isPrivate ?? db.data.users[req.userIndex].isPrivate 
                await db.write()
                return res.status(200).json({ message: "User updated", user: db.data.users[req.userIndex] })
            } catch (error) {
                res.status(500).json({ error })
            }
        })