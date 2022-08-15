import { Router } from "express";
import { users, groups, dms, Find } from "../DB.js";

export const messagesRouter = Router()

messagesRouter
    .all("*", async (req, res, next) => {
        if (!users.data[req.query.userID].authToken || users.data[req.query.userID].authToken != req.query.authToken)
            return res.status(401).json({ message: "Invalid authentication token or user does not exist" })
    
        const group = dms.data[req.query.groupID] || groups.data[req.query.groupID]
        if (!group)
            return res.status(404).json({ message: "Group not found" })
    
        if (!group.users[req.query.userID])
            return res.status(403).json({ message: "User is not a member of the group" })
    
        if (group.users[req.query.userID].isBlocked || group.block)
            return res.status(403).json({ message: group.block ? group.block == req.query.userID ? "You are blocked" : "DM is blocked" : "User is blocked" })
    
        req.group = group
        next()
    })
    .get("/", (req, res) => {
        const messages = Object.values(req.group.messages)
        const limit = req.query.limit >= messages.length ? messages.length : req.query.limit
        let limitedMessages = []
        for (let i = Math.max(messages.length - limit - req.query.amount, 0); i < messages.length - limit; i++)
            limitedMessages.push(messages[i])

        res.status(200).json({ message: "Success", messages: limitedMessages })
    })
    .get("/find", (req, res) => {
        const messageIndex = Find(req.group.messages, message => message.text.indexOf(req.query.text) != -1)
        messageIndex == undefined ? res.status(404).json({ message: "Message not found" }) : res.status(200).json({ message: "Success", message: req.group.messages[messageIndex] })
    })