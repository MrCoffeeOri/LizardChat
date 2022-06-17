import { Router } from "express";
import { groups, users, FindDatasetIndex } from '../DB.js'
import AuthMidlleware from "../AuthMidlleware.js";
import CreateUUID from "../CreateUUID.js";

export const groupRouter = Router()

groupRouter.post("/auth/:email/:password", AuthMidlleware, async (req, res) => {
    if (req.user.groups.length == 20)
        return res.status(403).json({ error: "User can't create more groups, length of 20 reached" })
    
    const newGroup = { name: req.body.name, owner: req.user.id, isPrivate: req.body.isPrivate || false, inviteToken: CreateUUID(), creationDate: new Date().toUTCString(), id: Math.random(), messages: [], members: new Array({name: req.user.name, id: req.user.id, isOwner: true, isBlocked: false}) }
    groups.data.push(newGroup)
    users.data[req.userIndex].groups.push({ name: newGroup.name, id: newGroup.id, isOwner: true })
    await groups.write()
    await users.write()
    res.status(201).json({ message: `Group created`, group: newGroup })
})
    
groupRouter.route("/:id/auth/:email/:password")
    .all(AuthMidlleware, async (req, res, next) => {
        if (!req.params.id)
            return res.status(400).json({ message: "Group ID is missing" })
            
        if (!groups.data.some(group => group.id == req.params.id && group.owner == req.user.id))
            return res.status(401).json({ message: "User is not owner or, group does not exist" })

        const groupIndex = FindDatasetIndex(groups, group => group.id == req.params.id)
        req.groupIndex = groupIndex
        next()
    })
    .delete(async (req, res) => {
        groups.data = groups.data.filter(group => group.id != req.params.id)
        users.data[req.userIndex].groups = users.data[req.userIndex].groups.filter(group => group.id != req.params.id)
        await groups.write()
        await users.write()
        res.status(200).json({ message: "Group deleted" })
    })
    .patch(async (req, res) => {
        if (!req.body && !req.body.name && req.body.isPrivate == undefined)
            return res.status(406).json({ error: "At least one data needs to be modified (name or group privacy)" })
        
        groups.data[req.groupIndex].name = req.body.name ?? groups.data[req.groupIndex].name
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