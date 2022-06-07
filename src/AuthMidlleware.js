import { Router } from "express"
import db from "./DB.js"

export default function AuthMidlleware(req, res, next) {
    try {
        await db.read()
        let user = db.data.users.find(_user => _user.email == req.body.email && _user.password == req.body.password)
        if (!user)
            return res.status(400).json({ message: 'Invalid user' })
        db.data.authLogs.psuh({ id: user.id, ip: req.ipv, date: new Date().toUTCString() })
        await db.write()
        req.user = user
        next()
    } catch (error) {
        res.status(500).json({ message: error })
    }
} 