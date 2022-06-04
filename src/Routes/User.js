import express from "express";
import { db } from "../Index.js";

export const router = express.Router()

router
    .post("/", async (req, res) => {
        try {
            await db.read()
            if (!db.data.users.some(user => user.name == req.body.name)) {
                db.data.users.push({name: req.body.name, messages: req.body.messages, id: Math.random()})
                await db.write()
                res.status(200).json({ message: "Success" })
            } else
                res.status(406).json({ message: 'User name already used'})
            console.log(db.data)
        } catch (error) {
            res.status(500).json({ message: 'Fail to add user'})
        }
    })
    .route("/:id")
        .get(async (req, res) => {
            try {
                await db.read()
                const user = db.data.users.find(user => user.id == req.params.id)
                if (user)
                    res.status(200).json({ user })
                else
                    res.status(404).json({ message: 'Fail to find user with ID: ' + req.params.id })
            } catch (e) {
                res.status(101).json({ message: e })
            }
        })
        //.delete()