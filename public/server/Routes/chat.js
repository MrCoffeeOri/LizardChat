import { Router } from "express";

export const chatRouter = Router()
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

function GroupValidation(req, res, next) {
    if (!users.data[req.query.userID] || !users.data[req.query.userID].authToken || users.data[req.query.userID].authToken != req.query.authToken)
        return res.status(401).json({ message: "Invalid authentication token or user does not exist" })

    req.chat = groups.data[req.params.id] || dms.data[req.params.id]
    if (!req.params.id || !req.chat)
        return res.status(404).json({ message: "Chat not found" })
    next()
}