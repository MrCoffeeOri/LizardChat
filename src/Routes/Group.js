import { Router } from "express";
import { groups, users, FindDatasetIndex } from '../DB.js'
import AuthMidlleware from "../AuthMidlleware.js";
import CreateUUID from "../CreateUUID.js";

export const groupRouter = Router()

function GroupValidation(req, res, next) {
    if (!req.params.id)
        return res.status(400).json({ message: "Group ID is missing" })
            
    if (groups.data[req.params.id] == undefined)
        return res.status(404).json({ message: "Group not found" })

    if (groups.data[req.params.id].owner != req.user.id)
        return res.status(403).json({ message: "User is not owner" })

    req.groupIndex = req.params.id
    next()
}

groupRouter.post("/:authToken", AuthMidlleware, async (req, res) => {
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

    users.data[req.userIndex].groups.push({ name: groups.data[invitedGroupIndex].name, id: groups.data[invitedGroupIndex].id, isOwner: false, isBlocked: false })
    groups.data[groupIndex].members.push({ name: req.user.name, id: req.user.id, isBlocked: false, isOwner: false })
})

groupRouter.get("/:id/token/:authToken", AuthMidlleware, GroupValidation, (req, res) => res.status(200).json({ message: "Token found", token: groups.data[req.groupIndex].inviteToken }))

groupRouter.route("/:id/:authToken")
    .all(AuthMidlleware, GroupValidation)
    .delete(async (req, res) => {
        groups.data = groups.data.filter(group => group.id != req.params.id)
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
    .get((req, res) => res.status(200).json({ message: "Group found", group: groups.data[req.groupIndex] }))