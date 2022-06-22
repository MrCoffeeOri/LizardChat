import { Router } from "express";
import { groups, users, FindDatasetIndex } from '../DB.js'
import AuthMidlleware from "../AuthMidlleware.js";
import CreateUUID from "../CreateUUID.js";

export const groupRouter = Router()

function GroupValidation(req, res, next) {
    if (!req.params.id)
        return res.status(400).json({ message: "Group ID is missing" })
            
    const groupIndex = FindDatasetIndex(groups.data, group => group.id == req.params.id)
    if (groupIndex == undefined)
        return res.status(404).json({ message: "Group not found" })

    if (groups.data[groupIndex].owner != req.user.id)
        return res.status(403).json({ message: "User is not owner" })

    req.groupIndex = groupIndex
    next()
}

groupRouter.post("/create/:authToken", AuthMidlleware, async (req, res) => {
    if (users.data[req.userIndex].groups.length == 20)
        return res.status(403).json({ error: "User can't create more groups, length of 20 reached" })
    
    const newGroup = { name: req.body.name, owner: req.userIndex, isPrivate: false, inviteToken: CreateUUID(), creationDate: new Date().toUTCString(), id: groups.data.length, messages: [], members: new Array({name: users.data[req.userIndex].name, id: req.userIndex, isOwner: true, isBlocked: false}) }
    groups.data.push(newGroup)
    users.data[req.userIndex].groups.push({ name: newGroup.name, id: newGroup.id, isOwner: true })
    await groups.write()
    await users.write()
    res.status(201).json({ message: `Group created`, group: newGroup })
})

groupRouter.post("/join/:authToken", AuthMidlleware, (req, res) => {
    const groupIndex = FindDatasetIndex(groups.data, group => group.token == req.body.token)
    if (groupIndex == undefined)
        return res.status(400).json({ message: "Invalid token" })

    if (groups.data[groupIndex].members.some(member => member.id == req.user.id))
        return res.status(403).json({ message: "User is already a group member" })

    users.data[req.userIndex].groups.push({ name: groups.data[groupIndex].name, id: groups.data[groupIndex].id, isOwner: false, isBlocked: false })
    groups.data[groupIndex].members.push({ name: users.data[req.userIndex].name, id: users.data[req.userIndex].id, isBlocked: false, isOwner: false })
})

groupRouter.get("/:id/token/:authToken", AuthMidlleware, GroupValidation, (req, res) => res.status(200).json({ message: "Token found", token: groups.data[req.groupIndex].inviteToken }))

groupRouter.patch("/:id/member/:memberID/:authToken", AuthMidlleware, GroupValidation, async (req, res) => {
    const userIndex = FindDatasetIndex(groups.data[req.groupIndex].members, member => member.id == req.params.memberID)
    if (userIndex == undefined)
        return res.status(404).json({ message: "User not found" })

    switch (req.body.action) { 
        case "block":
            if (groups.data[req.groupIndex].members[userIndex].isBlocked)
                return res.status(403).json({ message: "User is already blocked on this group" })
            groups.data[req.groupIndex].members[userIndex].isBlocked = true
            break;
        
        case "unblock":
            if (!groups.data[req.groupIndex].members[userIndex].isBlocked)
                return res.status(403).json({ message: "User is already unblocked on this group" })
            groups.data[req.groupIndex].members[userIndex].isBlocked = false
            break;

        case "remove":
            groups.data[req.groupIndex].members.splice(userIndex, 1)
            break;

        default:
            return res.status(400).json({ message: "Invalid action" })
    }
    await groups.write()
    res.status(200).json({ message: `User ${req.body.action}ed` })         
})

groupRouter.route("/:id/:authToken")
    .all(AuthMidlleware, GroupValidation)
    .get((req, res) => res.status(200).json({ message: "Group found", group: groups.data[req.groupIndex] }))
    .delete(async (req, res) => {
        groups.data.splice(req.groupIndex, 1)
        users.data[req.userIndex].groups = users.data[req.userIndex].groups.filter(group => group.id != req.params.id)
        await groups.write()
        await users.write()
        res.status(200).json({ message: "Group deleted" })
    })
    .patch(async (req, res) => {
        if (!req.body && !req.body.name && req.body.isPrivate == undefined)
            return res.status(400).json({ error: "At least one data needs to be modified (name or group privacy)" })
        
        groups.data[req.groupIndex].name = req.body.name ?? groups.data[req.groupIndex].name
        if (req.body.isPrivate)
            groups.data[req.groupIndex].inviteToken = CreateUUID()
            
        groups.data[req.groupIndex].isPrivate = req.body.isPrivate
        users.data.forEach(user => {
            user.groups.forEach(group => {
                if (group.id == req.params.id)
                    group.name = req.body.name
            })
        }) 
        await groups.write()
        await users.write()
        res.status(200).json({ message: "Group modified", group: groups.data[req.groupIndex] })
    })