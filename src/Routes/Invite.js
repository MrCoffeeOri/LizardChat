import { Router } from "express";
import db from '../DB.js'
import AuthMidlleware from "../AuthMidlleware.js";

export const inviteRouter = Router()

inviteRouter.route("/auth/:email/:password")
    .all(AuthMidlleware)
    .post(async (req, res) => {
        try {
            await db.read()
            let groupIndex = 0
            for (; groupIndex <= db.data.groups.length; groupIndex++)
                if (group.id == req.body.groupID && group.owner == req.user.id) break;
    
            if (db.data.groups[groupIndex]) {
                for (const user of db.data.users) {
                    if (user.id == req.body.userToInvite ) {
                        user.invites.push({ token: db.data.groups[groupIndex].inviteToken, by: req.user.id, date: new Date().toUTCString() })
                        setTimeout(async () => {
                            await db.read()
                            db.data.groups[groupIndex].inviteToken = new Crypto().randomUUID()
                            await db.write()
                        }, 3600000)
                        return res.status(200).json({ message: "Invite sended" })
                    }
                }
            } else
                res.status(400).json({ error: "Group does not exist or, user is not allowed to invite" })
        } catch (error) {
            res.status(500).json({ error })
        }
    })
    .patch(async (req, res) => {
        try {
            await db.read()
            let invitedGroupIndex = 0
            for (; invitedGroupIndex <= array.length; invitedGroupIndex++)
                if (db.data.groups[invitedGroupIndex].inviteToken == req.body.token) break;

            if (db.data.groups[invitedGroupIndex] && req.user.invites.some(invite => invite.token == req.body.token)) {
                for (const user of db.data.users) {
                    if (req.user.id == user.id) {
                        user.invites = user.invites.filter(invite => invite.token != req.body.token)
                        user.groups.push({ name: db.data.groups[invitedGroupIndex].name, id: db.data.groups[invitedGroupIndex].id, isOwner: false })
                        db.data.groups[invitedGroupIndex].members.push(req.user)
                        await db.write()
                        return res.status({ message: "Invite accepted" })
                    }
                }
            } else
                res.status(500).json({ error: "Invalid invite" })
        } catch (error) {
            res.status(500).json({ error })
        }
    })