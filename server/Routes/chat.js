import { Router } from "express";
import { User } from "../models/users.js"
import { Group } from "../models/groups.js"
import { Dm } from "../models/dms.js"

export default Router()
    .get('/:id', GroupValidation, (req, res) => res.status(200).json({ message: "Success", group: { ...req.chat, messages: undefined, users: req.chat.isPrivate ? undefined : Object.keys(req.chat.users), inviteToken: req.chat.isPrivate ? undefined : req.chat.inviteToken }}))
    .get('/:id/messages', GroupValidation, MessageValidation, (req, res) => res.status(200).json({ message: "Success", messages: req.messages.slice(Math.max(req.messages.length - req.query.limit - req.query.amount, 0), req.messages.length - req.query.limit <= 0 ? req.messages.length : req.messages.length - req.query.limit), remaining: Math.max(0, req.messages.length - req.query.limit - req.query.amount) }))
    .get('/:id/messages/find', GroupValidation, MessageValidation, (req, res) => {
        const filterMessages = req.messages.filter(message => message.id == req.query.id || message.text.includes(req.query.text))
        res.status(200).json({ message: filterMessages.length > 0 ? "Success" : "Messages not found", messages: filterMessages.length > 0 ? filterMessages : undefined })
    })

function MessageValidation(req, res, next) {
    if (!req.chat.users[req.query.userID] || req.chat.users[req.query.userID].isBlocked)
        return res.status(403).json({ message: "User does not have access to the messages" })

    req.messages = Object.values(req.chat.messages).map(message => ({...message, views: Object.keys(message.views) }))
    next()
}

async function GroupValidation(req, res, next) {
    const user = await User.findOne({ uid: req.query.userUID, authToken: req.query.authToken })
    if (!user)
        return res.status(401).json({ message: "Invalid authentication token or user does not exist" })

    req.chat = await Group.findOne({ _id: req.params.id, "users.uid": user.uid }) || await Dm.findOne({ _id: req.params.id, "users.uid": user.uid })
    if (!req.chat)
        return res.status(404).json({ message: "Chat not found" })
    next()
}