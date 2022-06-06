import { Router } from "express";
import db from '../DB.js'
import AuthMidlleware from "../AuthMidlleware.js";

export const groupsRouter = Router()

groupsRouter.get("/query/:name", async (req, res) => {
    try {
        await db.read()
        const groupsFound = db.data.groups.filter(group => group.name.includes(req.params.name))
        if (groupsFound.length > 0)
            res.status(200).json({ message: "Success", groups: groupsFound })
        else
            res.status(404).json({ message: "Fail, groups not found" })
    } catch (error) {
        res.status(500)
    }
})

groupsRouter.route("/auth")
    .all(AuthMidlleware)
    .post(async (req, res) => {
        try {
            await db.read()
            const newGroup = { name: req.body.name, owner: req.user.id, messages: [], members: [], isPrivate: req.body.isPrivate || false, creationDate: new Date().toUTCString(), id: Math.random() }
            db.data.groups.push(newGroup)
            db.data.users.forEach(user => {
                if (req.user.id == user.id) {
                    user.groups.push({ name: newGroup.name, id: newGroup.id, isOwner: true })
                    return
                }
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
    

groupsRouter.route("/auth/:id/message")
    .all(AuthMidlleware)
    .post(async (req, res) => {
        try {
            if (req.params.id && req.user.groups.some(group => group.id == req.params.id)) {
                await db.read()
                for (const group of db.data.groups) {
                    if (group.id == req.params.id) {
                        group.messages.push({ content: req.body.message, id: Math.random(), owner: req.user.id, date: new Date().toUTCString() })
                        break
                    }
                }
                await db.write()
                res.status(200).json({ message: "Message sended" })
            } else
                res.status(400).json({ message: "Missing ID or group does not exist" })
        } catch (error) {
            res.status(500)
        }
    })
    .delete(async (req, res) => {
        try {
            if (req.body.id && req.params.id && req.user.groups.some(group => group.id == req.params.id)) {
                await db.read()
                for (const group of db.data.groups) {
                    if (group.id == req.params.id) {
                        group.messages = group.messages.filter(groupMessage => groupMessage.id != req.body.id)
                        break
                    }
                }
                await db.write()
                res.status(200).json({ message: "Message deleted" })
            } else
                res.status(400).json({ message: "Missing ID or, user is not a member of the group" })
        } catch (error) {
            res.status(500)
        }
    })
