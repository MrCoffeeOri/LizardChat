import express from "express";
import { db } from "../index.js";

export const router = express.Router()
let user;

router
    .post("/", async (req, res) => {
        try {
            await db.read()
            if (!db.data.users.some(user => user.name == req.body.name)) {
                db.data.users.push({name: req.body.name, password: req.body.password, messages: req.body.messages, id: Math.random()})
                await db.write()
                res.status(200).json({ message: "Success" })
            } else
                res.status(406).json({ message: 'User name already used'})
        } catch (error) {
            res.status(500).json({ message: 'Fail to add user'})
        }
    })
    .route("/auth")
        .all(async (req, res, next) => {
            try {
                await db.read()
                user = db.data.users.find(user => user.password == req.body.password)
                if (!user)
                    return res.status(404).json({ message: 'Fail to authenticate user' })
                next()
            } catch (error) {
                res.status(101).json({ message: e })
            }
        })
        .get((req, res) => res.status(200).json({ user }))
        .delete(async (req, res) => {
            try {
                await db.read()
                db.data.users = db.data.users.filter(_user => _user.password != user.password && _user.name != user.name)
                await db.write()
                res.status(200).json({ message: 'User deleted' })
            } catch (error) {
                res.status(101).json({ message: e })
            }
        })