import { Router } from "express";
import db from '../DB.js'
import AuthMidlleware from "../AuthMidlleware.js";

export const groupRouter = Router()

groupRouter.route("/auth/:email/:password")
    .all(AuthMidlleware)
    .post(async (req, res) => {
        try {
            if (req.user.groups.length != 50) {
                await db.read()
                const newGroup = { name: req.body.name, owner: req.user.id, isPrivate: req.body.isPrivate || false, inviteToken: Math.random(), creationDate: new Date().toUTCString(), id: Math.random(), messages: [], members: [] }
                db.data.groups.push(newGroup)
                for (const user of db.data.users) {
                    if (req.user.id == user.id) {
                        user.groups.push({ name: newGroup.name, id: newGroup.id, isOwner: true })
                        await db.write()
                        return res.status(201).json({ message: `Group created`, group: newGroup })
                    }
                }
            } else
                res.status(403).json({ error: "User can't create more groups, length of 50 reached" })
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