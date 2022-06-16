import { Router } from "express";
import { db } from '../DB.js'
import AuthMidlleware from "../AuthMidlleware.js";

export const messageRouter = Router()

// TODO

messageRouter.route("/auth/:email/:password")
    .all(AuthMidlleware, (req, res, next) => {
        if (!req.params.groupID && !req.user.groups.some(group => group.id == req.params.groupID))
            return res.status(406).json({ message: "Missing ID or group does not exist" })
        
        await db.read()
        let groupIndex;
        const group = db.data.groups.find((group, _groupIndex) => {
            if (group.id == req.params.groupID) {
                groupIndex = _groupIndex
                return true
            }
        })
        if (group.members.some(member => member.id == req.user.id && member.isBlocked))
            return res.status(400).json({ message: "User is blocked on this group" })

        next()
    })

messageRouter.all("/auth/:email/:password", AuthMidlleware, async (req, res, next) => {
    try {
        if (!req.params.groupID && !req.user.groups.some(group => group.id == req.params.groupID))
            return res.status(406).json({ message: "Missing ID or group does not exist" })

        await db.read()
        const group = db.data.groups.find(group => group.id == req.params.groupID)
        if (group.members.some(member => member.id == req.user.id && member.isBlocked))
            return res.status(400).json({ message: "User is blocked on this group" })

        if (req.method == "POST")
            group.messages.push({ content: req.body.message, id: Math.random(), owner: req.user.id, date: new Date().toUTCString() })
        else if (req.method == "DELETE")
            group.messages = group.messages.filter(groupMessage => groupMessage.id != req.body.id)
        else
            return res.status(405).json({ message: `Method ${req.method} not allowed` })

        await db.write()
        res.status(200).json({ message: `Message ${req.method == "POST" ? "sended" : "deleted"}`, messages: group.messages })
        next()
    } catch (error) {
        res.status(500)
    }
})
        /*
        .post(async (req, res) => {
            try {
                await db.read()
                for (const group of db.data.groups) {
                    if (group.id == req.params.groupID) {
                        group.messages.push({ content: req.body.message, id: Math.random(), owner: req.user.id, date: new Date().toUTCString() })
                        break
                    }
                }
                await db.write()
                res.status(200).json({ message: "Message sended" })
            } catch (error) {
                res.status(500)
            }
        })
        .delete(async (req, res) => {
            try {
                await db.read()
                for (const group of db.data.groups) {
                    if (group.id == req.params.groupID) {
                        group.messages = group.messages.filter(groupMessage => groupMessage.id != req.body.id)
                        break
                    }
                }
                await db.write()
                res.status(200).json({ message: "Message deleted" })
            } catch (error) {
                res.status(500)
            }
        })*/