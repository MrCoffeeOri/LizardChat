import { Router } from "express";
import db from '../DB.js'
import AuthMidlleware from "../AuthMidlleware.js";

export const groupRouter = Router()

groupRouter.use("/auth", AuthMidlleware)

groupRouter.route("/auth")
    .post(async (req, res) => {
        try {
            await db.read()
            const newGroup = { name: req.body.name, owner: req.user.id, isPrivate: req.body.isPrivate || false, inviteToken: new Crypto().randomUUID(), creationDate: new Date().toUTCString(), id: Math.random(), messages: [], members: [] }
            db.data.groups.push(newGroup)
            db.data.users.forEach(user => {
                if (req.user.id == user.id)
                    return user.groups.push({ name: newGroup.name, id: newGroup.id, isOwner: true })
            })
            await db.write()
            res.status(200).json({ message: `Group created`, group: newGroup })
        } catch (error) {
            res.status(500).json({ message: error })
        }
    })
    .delete(async (req, res) => {
        try {
            if (req.body.id) {
                await db.read()
                db.data.groups = db.data.groups.filter(group => group.id != req.body.id)
                for (const user of db.data.users) {
                    if (req.user.id == user.id) {
                        user.groups = user.groups.filter(group => group.id != req.body.id)
                        break
                    }
                }
                await db.write()
                res.status(200).json({ message: `Group deleted` })
            } else 
                res.status(400).json({ message: `Invalid request, group ID is missing` })
        } catch (error) {
            res.status(500)
        }
    })

groupRouter.route("/auth/invite/:groupID")
    .post((req, res) => {

    })