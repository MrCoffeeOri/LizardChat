import { Router } from "express";
import { Group } from "../models/group.model.js"
import { Dm } from "../models/dm.model.js"
import { Types } from "mongoose";

export default Router()
    .get("/find/:id", async (req, res) => {
        const chat = await Group.findOne({ _id: req.params.id, $or: [{ inviteToken: req.query.inviteToken }, { isPrivate: false }] }, { messages: 0, users: 0 })
        if (!chat)
            return res.status(404).json({ message: "Chat not found" })
        res.status(200).json({ message: "Success", group: chat })
    })
    .get("/:id", ChatValidation, (req, res) => res.status(200).json({ 
        message: "Success", 
        chat: { 
            ...req.chat, 
            messages: req.query.messagesAmmount ? req.chat.messages.slice(-req.query.messagesAmmount) : undefined,
            remainingMessages: req.query.messagesAmmount ? req.chat.messages.length - req.query.messagesAmmount > 0 : undefined,
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
    const pipeline = [ { $match: { _id: Types.ObjectId(req.params.id), ...(req.query.isDM ? { "users": req.query.userUID } : { "users.uid": req.query.userUID }) } } ]
    if (!req.path.match("messages")) {
        pipeline.push({
            $lookup: {
                from: "users",
                localField: req.query.isDM ? "users" : "users.uid",
                foreignField: "uid",
                let: { users: "$users" },
                as: "users",
                pipeline: [ { $unset: ["email", "password", "authToken", "isPrivate", "otherInstance"] } ]  
            }
        })
        !req.query.isDM && pipeline[1].$lookup.pipeline.push({ $replaceRoot: { newRoot: { $mergeObjects: [{ $arrayElemAt: [ "$$users", { $indexOfArray: [ "$$users", "$$ROOT.uid" ] } ] }, "$$ROOT" ] } } })
    }
    req.chat = (req.query.isDM ? await Dm.aggregate(pipeline) : await Group.aggregate(pipeline))[0]
    return !req.chat ? res.status(404).json({ message: "Chat not found" }) : next()
}