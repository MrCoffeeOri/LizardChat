import crypto from "crypto"
import { Router } from "express";
import { Group } from "../models/group.model.js";
import { User } from "../models/user.model.js";
import { LengthUUID } from "../helpers/UUID.js";

export default Router()
    .post("/create", async (req, res) => {
        if (!req.body.name || req.body.name == ' ' && !req.body.password || req.body.password == ' ', !req.body.email || req.body.email == ' ')
            return res.status(400).json({ error: "User data is missing" })

        if (!req.body.password.match(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/g))
            return res.status(400).json({ error: "Minimum eight characters, at least one letter, one number and no symbols" })
        
        if (await User.exists({ email: req.body.email }))
            return res.status(403).json({ error: "Email already used" })

        const user = new User({ name: req.body.name, password: req.body.password, email: req.body.email, image: req.body.image, isPrivate: false, uid: LengthUUID((await User.count()) + 1), authToken: crypto.randomUUID() })
        res.status(200).json({ message: "Account created!", uid: user.uid, authToken: user.authToken})
        await user.save()
    })
    .get("/login/:email/:password", async (req, res) => {
        const authToken = crypto.randomUUID()
        let user = await User.findOneAndUpdate({ email: req.params.email, password: req.params.password }, { authToken })
        if (!user)
            return res.status(401).json({ message: "Invalid login" })

        res.status(200).json({ message: "User was authenticated", uid: user.uid, authToken })
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
    //.patch("/edit", async (req, res) => {})
