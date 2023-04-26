import { Router } from "express";
import { User } from "../models/user.model.js"
import { Group } from "../models/group.model.js"
import { Dm } from "../models/dm.model.js"

export default Router()
    .get("/find/:id", async (req, res) => {
        const chat = await Group.findOne({ _id: req.params.id, isPrivate: false })
        if (!chat)
            return res.status(404).json({ message: "Chat not found" })
            
        res.status(200).json({ message: "Success", group: { ...chat, messages: undefined } })
    })
    .get("/:id", ChatValidation, (req, res) => res.status(200).json({ 
        message: "Success", 
        chat: { 
            ...req.chat, 
            messages: req.query.messagesAmmount ? req.chat.messages.slice(-req.query.messagesAmmount) : undefined,
            remainingMessages: req.chat.messages.length - req.query.messagesAmmount > 0,
            inviteToken: req.chat.owner == req.query.userUID ? req.chat.inviteToken : undefined 
        }
    }))
    .get("/:id/messages", ChatValidation, MessageValidation, (req, res) => res.status(200).json({ 
        message: "Success", 
        messages: req.chat.messages.slice(Math.max(req.chat.messages.length - req.query.limit - req.query.amount, 0), req.chat.messages.length - req.query.limit <= 0 ? req.chat.messages.length : req.chat.messages.length - req.query.limit), 
        remaining: req.chat.messages.length - req.query.limit - req.query.amount > 0
    }))
    .get("/:id/messages/find", ChatValidation, MessageValidation, (req, res) => {
        const filterMessages = req.chat.messages.filter(message => message.id == req.query.id || message.text.includes(req.query.text))
        res.status(200).json({ message: filterMessages.length > 0 ? "Success" : "Messages not found", messages: filterMessages.length > 0 ? filterMessages : undefined })
    })

async function MessageValidation(req, res, next) {
    if (req.chat.users.some(user => user.uid == req.query.userUID && user.isBlocked))
        return res.status(403).json({ message: "User does not have access to the messages" })
    next()
}

async function ChatValidation(req, res, next) {
    const filter = { _id: req.params.id, "users.uid": req.query.userUID }
    req.chat = (await Group.findOne(filter) || await Dm.findOne(filter))?.toObject()
    return !req.chat ? res.status(404).json({ message: "Chat not found" }) : next()
}