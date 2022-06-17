import { Router } from "express";
import { groups, users, FindDatasetIndex } from '../DB.js'
import AuthMidlleware from "../AuthMidlleware.js";
import CreateUUID from "../CreateUUID.js";

export const inviteRouter = Router()
export let tokenTimers = []

inviteRouter.route("/auth/:email/:password")
    .all(AuthMidlleware)
    .post(async (req, res) => {
        let groupIndex = FindDatasetIndex(groups, group => group.id == req.body.groupID && group.owner == req.user.id)
        if (groupIndex == undefined)
            return res.status(400).json({ error: "Group does not exist or, user is not allowed to invite" })
            
        let userToInviteIndex = FindDatasetIndex(users, user => user.id == req.body.userToInvite)
        if (userToInviteIndex == undefined)
            return res.status(404).json({ error: "User not found" })

        if (groups.data[groupIndex].members.some(member => member.id == req.body.userToInvite))
            return res.status(406).json({ error: "User is already a group member" })

        tokenTimers.push({token: groups.data[groupIndex].inviteToken, time: setTimeout(async () => {
            await users.read()
            await groups.read()
            users.data[userToInviteIndex].invites = users.data[userToInviteIndex].invites.filter(invite => invite.token != groups.data[groupIndex].inviteToken)
            groups.data[groupIndex].inviteToken = CreateUUID()
            await users.write()
            await groups.write()
            console.log("Token changed!")
        }, 300000)}) // 5 minutes == 300000
        
        users.data[userToInviteIndex].invites.push({ token: groups.data[groupIndex].inviteToken, by: req.user.id, date: new Date().toUTCString() })
        await users.write()
        res.status(200).json({ message: "Invite sended" })
    })
    .patch(async (req, res) => {
        let invitedGroupIndex = FindDatasetIndex(groups, group => group.inviteToken == req.body.token)
        if (invitedGroupIndex == undefined || !req.user.invites.some(invite => invite.token == req.body.token && invite.by != req.user.id) || req.body.accepted == null)
            return res.status(400).json({ error: "Invalid invite" })
        
        if (req.body.accepted) {
            users.data[req.userIndex].groups.push({ name: groups.data[invitedGroupIndex].name, id: groups.data[invitedGroupIndex].id, isOwner: false, isBlocked: false })
            groups.data[invitedGroupIndex].members.push({ name: req.user.name, id: req.user.id, isOwner: false, isBlocked: false })
        }
        users.data[req.userIndex].invites = users.data[req.userIndex].invites.filter(invite => invite.token != req.body.token)
        tokenTimers = tokenTimers.filter(tk => {
            if (tk.token == req.body.token)
                clearTimeout(tk.time)
            return tk.token != req.body.token
        })
        groups.data[invitedGroupIndex].inviteToken = CreateUUID()
        await groups.write()
        await users.write()
        res.status(200).json({ message: `Invite ${req.body.accepted ? 'accepted' : 'neglected'}` })
    })
