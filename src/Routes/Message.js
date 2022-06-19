import { Router } from "express";
import { groups, FindDatasetIndex } from '../DB.js'
import AuthMidlleware from "../AuthMidlleware.js";

export const messageRouter = Router()

async function MessageValidadtion(req, res, next) {
    if (!req.params.groupID)
        return res.status(400).json({ message: "Missing group ID" })
    
    if (!groups.data[req.params.groupID])
        return res.status(404).json({ message: `Group with ID ${req.params.groupID} not found` })

    const userIndex = FindDatasetIndex(groups.data[req.params.groupID].members, member => member.id == req.userIndex)
    if (userIndex == undefined)
        return res.status(403).json({ message: "User did not join the group" })

    if (groups.data[req.params.groupID].members[userIndex].isBlocked)
        return res.status(403).json({ message: "User is blocked on this group" })
    
    req.groupIndex = req.params.groupID
    next()
}

messageRouter.get("/:groupID/:limit/:authToken", AuthMidlleware, MessageValidadtion, (req, res) => {
    const limit = req.params.limit == "All" ? groups.data[req.groupIndex].messages.length : req.params.limit
    if (limit != "All" && req.params.limit <= 0)
        return res.status(400).json({ message: "Invalid limit range" })
        
    let limitedMessages = []
    if (groups.data[req.groupIndex].messages.length > limit) {
        for (let i = 0; i < limit; i++)
            limitedMessages[i] = groups.data[req.groupIndex].messages[groups.data[req.groupIndex].messages.length - limit + i]
    }
    res.status(200).json({ message: "Messages found", messages: limitedMessages.length > 0 ? limitedMessages : groups.data[req.groupIndex].messages })   
})

messageRouter.route("/:groupID/:authToken")
    .all(AuthMidlleware, MessageValidadtion)
    .post(async (req, res) => {
        groups.data[req.groupIndex].messages.push({ content: req.body.message, id: groups.data[req.groupIndex].messages.length, owner: req.userIndex, date: new Date().toUTCString() })
        await groups.write()
        res.status(200).json({ message: `Message sended`, messages: groups.data[req.groupIndex].messages })
    })
    .delete(async (req, res) => {
        groups.data[req.groupIndex].messages = groups.data[req.groupIndex].messages.filter(groupMessage => groupMessage.owner == req.user.id && groupMessage.id != req.body.id)
        await groups.write()
        res.status(200).json({ message: `Message deleted`, messages: groups.data[req.groupIndex].messages })
    })