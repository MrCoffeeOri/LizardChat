import { Router } from 'express'
import {  } from '../DB.js'

export const queryRouter = Router()

// TODO ===> FIX THE DATABSE REFERENCE + MODIFY THE LOGIC

queryRouter.get("/:query/:name", async (req, res) => {
    try {
        await db.read()
        if (db.data[req.params.query]) {
            const query = db.data[req.params.query].map(queryData => {
                if (queryData.name.includes(req.params.name) && !queryData.isPrivate) {
                    return { name: queryData.name, id: queryData.id, creationDate: queryData.creationDate, token: queryData.inviteToken }
                }
            })
            if (query && query[0])
                res.status(200).json({ message: "Success", query })
            else
                res.status(404).json({ message: "Fail, query data not found" })
        } else
            res.status(406).json({ error: "Invalid query" })
    } catch (error) {
        res.status(500)
    }
}) 