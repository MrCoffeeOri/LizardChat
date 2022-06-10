import { Router } from "express";
import db from '../DB.js'
import AuthMidlleware from "../AuthMidlleware.js";

export const messageRouter = Router()

messageRouter.all("/:groupID/auth/:email/:password", AuthMidlleware, async (req, res, next) => {
    try {
        if (req.params.groupID && req.user.groups.some(group => group.id == req.params.groupID)) {
            let responseMessage;
            await db.read()
            for (const group of db.data.groups) {
                if (group.id == req.params.groupID) {
                    if (req.method.toUpperCase() == "GET")
                        return res.status(200).json({ message: "Messages found", messages: group.messages })
                    else if (req.method.toUpperCase() == "POST") {
                        group.messages.push({ content: req.body.message, id: Math.random(), owner: req.user.id, date: new Date().toUTCString() })
                        responseMessage = "Message sended"
                        break
                    } else if (req.method.toUpperCase() == "DELETE") {
                        group.messages = group.messages.filter(groupMessage => groupMessage.id != req.body.id)
                        responseMessage = "Message deleted"
                        break
                    } else
                        return res.status(405)
                }
            }
            await db.write()
            res.status(200).json({ message: responseMessage })
            next()
        }
        else
            return res.status(400).json({ message: "Missing ID or group does not exist" })
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