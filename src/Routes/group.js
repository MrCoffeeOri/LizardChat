import { Router } from "express";
import { groups, users } from "../DB.js";

export const groupRouter = Router()

groupRouter
    .get('/:id', GroupValidation, (req, res) => res.status(200).json({ message: "Success", group: { ...groups.data[req.params.id], messages: undefined, users: groups.data[req.params.id].isPrivate ? undefined : Object.keys(groups.data[req.params.id].users), inviteToken: groups.data[req.params.id].isPrivate ? undefined : groups.data[req.params.id].inviteToken }}))
    .get('/:id/messages', GroupValidation, MessageValidation, (req, res) => res.status(200).json({ message: "Success", messages: req.messages.slice(Math.max(req.messages.length - req.query.limit - req.query.amount, 0), req.messages.length - req.query.limit <= 0 ? req.messages.length : req.messages.length - req.query.limit), remaining: Math.max(0, req.messages.length - req.query.limit - req.query.amount) }))
    .get('/:id/messages/find', GroupValidation, MessageValidation, (req, res) => {
        const filterMessages = req.messages.filter(message => message.text.includes(req.query.text))
        res.status(200).json({ message: filterMessages.length > 0 ? "Success" : "Messages not found", messages: filterMessages.length > 0 ? filterMessages : undefined })
    })

function MessageValidation(req, res, next) {
    if (!groups.data[req.params.id].users[req.query.userID] || groups.data[req.params.id].users[req.query.userID].isBlocked)
        return res.status(403).json({ message: "User does not have access to the messages" })

    req.messages = Object.values(groups.data[req.params.id].messages).map(message => ({...message, views: Object.keys(message.views) }))
    next()
}

function GroupValidation(req, res, next) {
    if (!users.data[req.query.userID] || !users.data[req.query.userID].authToken || users.data[req.query.userID].authToken != req.query.authToken)
        return res.status(401).json({ message: "Invalid authentication token or user does not exist" })

    if (!req.params.id || !groups.data[req.params.id])
        return res.status(404).json({ message: "Group not found" })
    next()
}