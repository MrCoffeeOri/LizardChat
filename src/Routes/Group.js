import { Router } from "express";
import { db } from '../DB.js'
import AuthMidlleware from "../AuthMidlleware.js";

export const groupRouter = Router()

groupRouter.post("/auth/:email/:password", AuthMidlleware, async (req, res) => {
    try {
        if (req.user.groups.length == 20)
            return res.status(403).json({ error: "User can't create more groups, length of 20 reached" })

        await db.read()
        const newGroup = { name: req.body.name, owner: req.user.id, isPrivate: req.body.isPrivate || false, inviteToken: Math.random(), creationDate: new Date().toUTCString(), id: Math.random(), messages: [], members: new Array({name: req.user.name, id: req.user.id, isOwner: true, isBlocked: false}) }
        const user = db.data.users.find(user => req.user.id == user.id)
        db.data.groups.push(newGroup)
        user.groups.push({ name: newGroup.name, id: newGroup.id, isOwner: true })
        await db.write()
        return res.status(201).json({ message: `Group created`, group: newGroup })
    } catch (error) {
        res.status(500).json({ message: error })
    }
})
    
groupRouter.route("/:id/auth/:email/:password")
    .all(AuthMidlleware, async (req, res, next) => {
        if (!req.params.id)
                return res.status(400).json({ message: "Group ID is missing" })
            
        await db.read()
        if (!db.data.groups.some(group => group.id == req.params.id && group.owner == req.user.id))
            return res.status(401).json({ message: "User is not owner or, group does not exist" })
        next()
    })
    .delete(async (req, res) => {
        try {
            const user = db.data.users.find(user => req.user.id == user.id)
            db.data.groups = db.data.groups.filter(group => group.id != req.params.id)
            user.groups = user.groups.filter(group => group.id != req.params.id)
            await db.write()
            return res.status(200).json({ message: "Group deleted" })
        } catch (error) {
            res.status(500)
        }
    })
    .patch(async (req, res) => {
        try {
            await db.read()
            if (!req.body && !req.body.name && req.body.isPrivate == undefined)
                return res.status(406).json({ error: "At least one data needs to be modified (name or group privacy)" })
            
            const group = db.data.groups.find(group => group.id == req.params.id)
            group.name = req.body.name ?? group.name
            group.isPrivate = req.body.isPrivate
            await db.write()
        } catch (error) {
            res.status(500)
        }
    })