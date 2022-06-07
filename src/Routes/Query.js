import { Router } from 'express'
import db from '../DB.js'

export const queryRouter = Router()

queryRouter.get("/:query/:name", async (req, res) => {
    try {
        await db.read()
        if (db.data[req.params.query]) {
            const query = db.data[req.params.query].map(queryData => {
                if (group.name.includes(req.params.name) && !queryData.isPrivate)
                    return { name: queryData.name, id: queryData.id, creationDate: queryData.creationDate }
            })
            if (query[0])
                res.status(200).json({ message: "Success", groups: query })
            else
                res.status(404).json({ message: "Fail, query data not found" })
        } else
            res.status(406).json({ error: "Invalid query" })
    } catch (error) {
        res.status(500)
    }
}) 