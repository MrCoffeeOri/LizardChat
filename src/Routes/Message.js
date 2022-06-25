import { Router } from "express";
import { groups, FindDatasetIndex } from '../DB.js'
import AuthMidlleware from "../AuthMidlleware.js";

export const messageRouter = Router()

async function MessageValidadtion(req, res, next) {
    if (!req.params.groupID)
        return res.status(400).json({ message: "Missing group ID" })
    
    const grouIndex = FindDatasetIndex(groups.data, group => group.id == req.params.groupID)
    if (grouIndex == undefined)
        return res.status(404).json({ message: `Group with ID ${req.params.groupID} not found` })

    const userIndex = FindDatasetIndex(groups.data[grouIndex].members, member => member.id == req.userIndex)
    if (userIndex == undefined)
        return res.status(403).json({ message: "User did not join the group" })

    if (groups.data[grouIndex].members[userIndex].isBlocked)
        return res.status(403).json({ message: "User is blocked on this group" })
    
    req.groupIndex = grouIndex
    next()
}

messageRouter.param("authToken", AuthMidlleware, MessageValidadtion)

messageRouter.get("/:groupID/:limit/:authToken", (req, res) => {
    if (isNaN(req.params.limit)) 
        return res.status(400).json({ message: "Limit is not a number" })

    const messages = groups.data[req.groupIndex].messages.slice(Math.max(groups.data[req.groupIndex].messages.length - req.params.limit, 0), groups.data[req.groupIndex].messages.length) 
    res.status(200).json({ message: "Messages found", messages })
})

messageRouter.route("/:groupID/:authToken")
    .get((req, res) => res.status(200).json({ message: "Messages found", messages: groups.data[req.groupIndex].messages }))
    .post(async (req, res) => {
        if (!req.body.text || req.body.text == ' ')
            return res.status(400).json({ message: "Message content is empty" })
            
        groups.data[req.groupIndex].messages.push({ text: req.body.text, id: groups.data[req.groupIndex].messages.length, owner: req.userIndex, date: new Date().toUTCString() })
        await groups.write()
        res.status(200).json({ message: `Message sended`, messages: groups.data[req.groupIndex].messages })
    })
    .delete(async (req, res) => {
        if (req.body.id == undefined || req.body.id == null)
            return res.status(400).json({ message: "ID is missing" })
            
        const messageIndex = FindDatasetIndex(groups.data[req.groupIndex].messages, message => message.id == req.body.id)
        if (messageIndex == undefined)
            return res.status(400).json({ message: `Message with ID ${req.body.id} does not exist` })

        if (groups.data[req.groupIndex].messages[messageIndex].owner != req.userIndex)
            return res.status(400).json({ message: "User is not the message owner" })
            
        groups.data[req.groupIndex].messages.splice(messageIndex, 1)
        await groups.write()
        res.status(200).json({ message: `Message deleted`, messages: groups.data[req.groupIndex].messages })
    })
    