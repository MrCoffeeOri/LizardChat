import crypto from "crypto"
import { Router } from "express";
import { createTransport } from "nodemailer";
import { ConfirmationToken } from "../models/cfmToken.model.js";
import { Group } from "../models/group.model.js";
import { User } from "../models/user.model.js";
import { LengthUUID } from "../helpers/UUID.js"

const tranport = createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false,
    auth: { user: process.env.EMAIL_USER, pass: process.env.PASSWORD_USER },
    tls: { rejectUnauthorized: false }
})

export default Router()
    .post("/create", async (req, res) => {
        if (!req.body.name || req.body.name == ' ' && !req.body.password || req.body.password == ' ', !req.body.email || req.body.email == ' ')
            return res.status(400).json({ error: "User data is missing" })

        if (!req.body.password.match(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/g))
            return res.status(400).json({ error: "Minimum eight characters, at least one letter, one number and no symbols" })
        
        if (await User.exists({ $or: [{ email: req.body.email }, { name: req.body.name }] }))
            return res.status(403).json({ error: "Email or name already used" })

        if (await ConfirmationToken.exists({ email: req.body.email }))
            return res.status(403).json({ error: "Token already sent to " + req.body.email })
            
        const cfmToken = new ConfirmationToken({ email: req.body.email, password: req.body.password, name: req.body.name })
        tranport.sendMail({
            from: process.env.EMAIL_USER,
            to: req.body.email,
            subject: "Confirmation email",
            date: new Date(),
            text: "If you did not request this, please ignore this email.\n\nConfirm your email by clicking the link below:\n\n" + `${req.protocol}://${req.headers.host}/api/user/confirm?token=${cfmToken.token}\n\nThis confirmation token will expire in 2 hours.`
        }, async err => {
            if (err)
                return res.status(500).json({ error: err.message });
            
            setTimeout(async () => await cfmToken.delete(), 720000); // 2 hours
            await cfmToken.save()
            res.status(200).json({ message: "Confirmation email sent to " + req.body.email });
        })
    })
    .get("/login/:email/:password", async (req, res) => {
        const authToken = crypto.randomUUID()
        let user = await User.findOneAndUpdate({ email: req.params.email, password: req.params.password }, { authToken })
        if (!user)
            return res.status(401).json({ message: "Invalid login" })

        res.status(200).json({ message: "User was authenticated", userUID: user.uid, authToken })
    })
    .get("/find/:uid", async (req, res) => {
        const user = await User.findOne({ uid: req.params.uid })
        if (!user)
            return res.status(404).json({ error: "User not found" })

        res.status(200).json({ message: "User found", user: { uid: req.params.uid, name: user.name, creationDate: user.createdAt, chats: user.isPrivate ? undefined : await Group.aggregate([
            { $match: { "users.uid": user.uid } },
            { $unset: "users" },
            { $unset: "inviteToken" },
            { $unset: "messages" },
        ])}})
    })
    .get("/confirm", async (req, res) => {
        const cfmToken = await ConfirmationToken.findOneAndDelete({ token: req.query.token })
        if (!cfmToken)
            return res.status(401).json({ error: "Invalid confirmation token" })

        const user = new User({ name: cfmToken.name, email: cfmToken.email, password: cfmToken.password, uid: LengthUUID((await User.count()) + 1), authToken: crypto.randomUUID() })
        await user.save()
        res.status(200).redirect(`/home.html?authToken=${user.authToken}&userID=${user.id}&firstTime=true`)
    })
    //.patch("/edit", async (req, res) => {})
