import { Router } from "express";
import { createTransport } from "nodemailer";
import { logs, users, cfmTokens, FindIndex } from '../DB.js'
import { LengthUUID, TokenUUID } from "../UUID.js"

export const userRouter = Router()
const transport = createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.PASSWORD_USER
    },
    tls: {
        rejectUnauthorized: false
    }
})

userRouter
    .post("/create", async (req, res) => {
        if (!req.body.name || req.body.name == ' ' && !req.body.password || req.body.password == ' ', !req.body.email || req.body.email == ' ')
            return res.status(400).json({ error: 'User data is incorrect'})
        
        if (FindIndex(Object.values(users.data), user => user.email == req.body.email) != undefined || req.body.email == process.env.EMAIL_USER)
            return res.status(403).json({ error: "Email already used" })

        const confirmationToken = TokenUUID()
        transport.sendMail({
            from: process.env.EMAIL_USER,
            to: req.body.email,
            subject: "Confirmation email",
            date: new Date().toLocaleString(),
            text: "If you did not request this, please ignore this email.\n\nConfirm your email by clicking the link below:\n\n" + `${req.protocol}://${req.headers.host}/api/user/confirm?token=${confirmationToken}\n\nThis confirmation token will expire in 2 hours.`
        }, async (err, info) => {
            if (err)
                return res.status(500).json({ error: err.message });

            cfmTokens.data[confirmationToken] = { email: req.body.email, password: req.body.password, name: req.body.name };
            await cfmTokens.write();
            setTimeout(async () => {
                if (cfmTokens.data[confirmationToken]) {
                    delete cfmTokens.data[confirmationToken]
                    await cfmTokens.write()
                }
            }, 720000); // 2 hours
            res.status(200).json({ message: "Confirmation email sent to " + req.body.email });
        })
    })
    .get("/login/:email/:password", async (req, res) => {
        const usersArray = Object.values(users.data)
        let user = FindIndex(usersArray, user => user.email == req.params.email && user.password == req.params.password)
        if (user == undefined)
            return res.status(401).json({ message: "Invalid login" })

        user = usersArray[user]
        const authToken = TokenUUID()
        users.data[user.id].authToken = authToken
        logs.data.push({ userID: user.id, ip: req.ip, method: "login", host: req.hostname, date: new Date().toLocaleString(), })
        await logs.write()
        await users.write()
        res.status(200).json({ message: "User was authenticated", userID: user.id, authToken })
    })
    .get("/find/:id", async (req, res) => {
        if (!users.data[req.params.id])
            return res.status(404).json({ error: "User not found" })

        if (users.data[req.params.id].isPrivate)
            return res.status(200).json({ message: "User has a private profile", user: { id: req.params.id, name: users.data[req.params.id].name, creationDate: users.data[req.params.id].creationDate } })

        res.status(200).json({ message: "User found", user: { id: req.params.id, name: users.data[req.params.id].name, creationDate: users.data[req.params.id].creationDate, groups: users.data[req.params.id].groups } })
    })
    .get("/confirm", async (req, res) => {
        if (!cfmTokens.data[req.query.token])
            return res.status(401).json({ error: "Invalid confirmation token" })

        const user = { name: cfmTokens.data[req.query.token].name, email: cfmTokens.data[req.query.token].email, password: cfmTokens.data[req.query.token].password, authToken: TokenUUID(), isPrivate: false, creationDate: new Date().toLocaleString(), id: LengthUUID(Object.keys(users.data).length), dms: [], groups: [], invites: {} }
        logs.data.push({ userID: user.id, ip: req.ip, method: "create", host: req.hostname, date: new Date().toLocaleString(), })
        users.data[user.id] = user
        delete cfmTokens.data[req.query.token]
        await logs.write()
        await users.write()
        await cfmTokens.write();
        res.status(200).redirect(`${req.protocol}://${req.headers.host}/home.html?authToken=${user.authToken}&userID=${user.id}&firstTime=true`)
    })
