import { Router } from "express";
import { groups, users, FindDatasetIndex } from '../DB.js'
import AuthMidlleware from "../AuthMidlleware.js";
import CreateUUID from "../CreateUUID.js";

export const inviteRouter = Router()
export let tokenTimers = []

inviteRouter.route("/:authToken")
    .all(AuthMidlleware)
    .post(async (req, res) => {
        const grouIndex = FindDatasetIndex(groups.data, group => group.id == req.body.groupID)
        if (grouIndex == undefined)
            return res.status(404).json({ error: "Group not found" })

        if (groups.data[grouIndex].owner != req.userIndex)
            return res.status(403).json({ message: "User is not allowed to send an invite" })
            
        const userToInviteIndex = FindDatasetIndex(users.data, user => user.id == req.body.userToInvite)
        if (userToInviteIndex == undefined)
            return res.status(404).json({ error: "User not found" })

        if (groups.data[grouIndex].members.some(member => member.id == req.body.userToInvite))
            return res.status(403).json({ error: "User is already a group member" })

        tokenTimers.push({token: groups.data[grouIndex].inviteToken, time: setTimeout(async () => {
            await users.read()
            await groups.read()
            users.data[userToInviteIndex].invites = users.data[userToInviteIndex].invites.filter(invite => invite.token != groups.data[grouIndex].inviteToken)
            groups.data[grouIndex].inviteToken = CreateUUID()
            await users.write()
            await groups.write()
            console.log("Token changed!")
        }, 300000)}) // 5 minutes == 300000
        
        users.data[userToInviteIndex].invites.push({ token: groups.data[grouIndex].inviteToken, by: users.data[req.userIndex].id, date: new Date().toUTCString() })
        await users.write()
        res.status(200).json({ message: "Invite sended" })
    })
    .patch(async (req, res) => {
        let invitedGroupIndex = FindDatasetIndex(groups.data, group => group.inviteToken == req.body.token)
        if (invitedGroupIndex == undefined || !users.data[req.userIndex].invites.some(invite => invite.token == req.body.token && invite.by != req.userIndex) || req.body.accepted == null)
            return res.status(400).json({ error: "Invalid invite" })
        
        if (req.body.accepted) {
            users.data[req.userIndex].groups.push({ name: groups.data[invitedGroupIndex].name, id: groups.data[invitedGroupIndex].id, isOwner: false, isBlocked: false })
            groups.data[invitedGroupIndex].members.push({ name: users.data[req.userIndex].name, id: req.userIndex, isOwner: false, isBlocked: false })
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
        res.status(200).json({ message: `Invite ${req.body.accepted ? 'accepted' : 'neglected'}`, groups: users.data[req.userIndex].groups })
    })