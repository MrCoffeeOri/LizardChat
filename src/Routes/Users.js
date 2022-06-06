import { Router } from "express";
import db from '../DB.js'
import AuthMidlleware from "../AuthMidlleware.js";

export const usersRouter = Router()

usersRouter
    .post("/", async (req, res) => {
        try {
            await db.read()
            if (req.body.name && req.body.name != ' ' && req.body.password && req.body.password != ' ', req.body.email && req.body.email != ' ') {
                if (!db.data.users.some(_user => _user.email == req.body.email)) {
                    db.data.users.push({name: req.body.name, email: req.body.email, password: req.body.password, groups: req.body.groups || [], id: Math.random()})
                    await db.write()
                    res.status(200).json({ message: "Success" })
                } else
                    res.status(406).json({ message: "Email already used" })
            } else
                res.status(406).json({ message: 'User data is incorrect'})
        } catch (error) {
            res.status(500).json({ message: error})
        }
    })
    .get("/query/:name", async (req, res) => {
        try {
            await db.read()
            const usersFound = db.data.users.map(user => {
                if (user.name.includes(req.params.name))
                    return { name: user.name, email: user.email, id: user.id }
            })
            if (usersFound[0])
                res.status(200).json({ message: "Success", users: usersFound })
            else
                res.status(404).json({ message: "Fail, users not found" })
        } catch (error) {
            res.status(500).json({ message: error})
        }
    })

usersRouter.route("/auth")
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