import { Router } from "express";
import { groups, FindDatasetIndex } from '../DB.js'
import AuthMidlleware from "../AuthMidlleware.js";

export const messageRouter = Router()

async function MessageValidadtion(req, res, next) {
    if (!req.params.groupID && !req.user.groups.some(group => group.id == req.params.groupID))
        return res.status(400).json({ message: "Missing ID or group does not exist" })
    
    const groupIndex = FindDatasetIndex(groups, group => group.id == req.params.groupID)
    if (groupIndex == undefined)
        return res.status(404).json({ message: `Group with ID ${req.params.groupID} not found` })

    if (!groups.data[groupIndex].members.some(member => member.id == req.user.id) || groups.data[groupIndex].members.some(member => member.id == req.user.id && member.isBlocked))
        return res.status(401).json({ message: "User is blocked on this group or, user did not join the group" })
    
    req.groupIndex = groupIndex
    next()
}

messageRouter.get("/:groupID/:limit/auth/:email/:password", AuthMidlleware, MessageValidadtion, (req, res) => {
    let limitedMessages = []
    if (groups.data[req.groupIndex].messages.length > req.params.limit) {
        for (let i = 0; i < req.params.limit; i++)
            limitedMessages[i] = groups.data[req.groupIndex].messages[groups.data[req.groupIndex].messages.length - i - 1]
    }
    res.status(200).json({ message: "Messages found", messages: limitedMessages.length > 0 ? limitedMessages : groups.data[req.groupIndex].messages })   
})

messageRouter.route("/:groupID/auth/:email/:password")
    .all(AuthMidlleware, MessageValidadtion)
    .post(async (req, res) => {
        groups.data[req.groupIndex].messages.push({ content: req.body.message, id: Math.random(), owner: req.user.id, date: new Date().toUTCString() })
        await groups.write()
        res.status(200).json({ message: `Message sended`, messages: groups.data[req.groupIndex].messages })
    })
    .delete(async (req, res) => {
        groups.data[req.groupIndex].messages = groups.data[req.groupIndex].messages.filter(groupMessage => groupMessage.owner == req.user.id && groupMessage.id != req.body.id)
        await groups.write()
        res.status(200).json({ message: `Message deleted`, messages: groups.data[req.groupIndex].messages })
    })