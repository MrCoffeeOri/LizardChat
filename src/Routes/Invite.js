import { Router } from "express";
import db from '../DB.js'
import AuthMidlleware from "../AuthMidlleware.js";

export const inviteRouter = Router()
export let tokenTimers = []

function FindDatasetIndex(dataset, callback) {
    for (let index = 0; index <= db.data[dataset].length; index++) {
        if (callback(db.data[dataset][index])) return db.data[dataset][index] ? index : undefined;
    }
}

inviteRouter.route("/auth/:email/:password")
    .all(AuthMidlleware)
    .post(async (req, res) => {
        try {
            await db.read()
            let groupIndex = FindDatasetIndex("groups", group => group.id == req.body.groupID && group.owner == req.user.id)
            let userIndex = FindDatasetIndex("users", user => user.id == req.body.userToInvite)

            if (!groupIndex)
                return res.status(400).json({ error: "Group does not exist or, user is not allowed to invite" })

            if (!userIndex)
                return res.status(404).json({ error: "User not found" })

            if (db.data.groups[groupIndex].members.some(member => member.id == req.body.userToInvite))
                return res.status(406).json({ error: "User is already a group member" })

            tokenTimers.push({token: db.data.groups[groupIndex].inviteToken, time: setTimeout(async () => {
                await db.read()
                db.data.users[userIndex].invites = db.data.groups[userIndex].invites.filter(invite => invite.token != req.body.token)
                db.data.groups[groupIndex].inviteToken = Math.random()
                await db.write()
                console.log("Token changed!")
            }, 300000)}) // 5 minutes == 300000
            
            db.data.users[userIndex].invites.push({ token: db.data.groups[groupIndex].inviteToken, by: req.user.id, date: new Date().toUTCString() })
            await db.write()
            return res.status(200).json({ message: "Invite sended" })
        } catch (error) {
            res.status(500).json(error)
        }
    })
    .patch(async (req, res) => {
        try {
            await db.read()
            let invitedGroupIndex = FindDatasetIndex("groups", group => group.inviteToken == req.body.token)

            if (!invitedGroupIndex && !req.user.invites.some(invite => invite.token == req.body.token && invite.by != req.user.id) && req.body.accepted == null)
                return res.status(400).json({ error: "Invalid invite" })
            
            for (const user of db.data.users) {
                if (req.user.id == user.id) {
                    if (req.body.accepted) {
                        user.groups.push({ name: db.data.groups[invitedGroupIndex].name, id: db.data.groups[invitedGroupIndex].id, isOwner: false })
                        db.data.groups[invitedGroupIndex].members.push(req.user)
                    }
                    user.invites = user.invites.filter(invite => invite.token != req.body.token)
                    clearTimeout(tokenTimers.find(tk => tk.token == req.body.token).time)
                    tokenTimers = tokenTimers.filter(tk => tk.token != req.body.token)
                    db.data.groups[invitedGroupIndex].inviteToken = Math.random()
                    await db.write()
                    return res.status(200).json({ message: `Invite ${req.body.accepted ? 'accepted' : 'neglected'}` })
                }
            }
        } catch (error) {
            res.status(500).json({ error })
        }
    })
