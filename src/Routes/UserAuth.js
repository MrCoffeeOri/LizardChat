import { Router } from "express";
import db from '../DB.js'
import AuthMidlleware from "../AuthMidlleware.js";

export const userAuthRouter = Router()
let authUser;

userAuthRouter.route("/")
    .all(AuthMidlleware)
    .get((req, res) => res.status(200).json({ user: req.user }))
    .delete(async (req, res) => {
        try {
            await db.read()
            db.data.users = db.data.users.filter(_user => _user.email != req.user.email && _user.password != req.user.password)
            await db.write()
            res.status(200).json({ message: 'User deleted' })
        } catch (error) {
            res.status(500).json({ message: e })
        }
    })