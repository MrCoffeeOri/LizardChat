import { Router } from 'express'
import { users, groups } from '../DB.js'

export const queryRouter = Router()


queryRouter.get("/:query/:limit/:name", async (req, res) => {
    const queryDataset = req.params.query == "users" ? users : req.params.query == "groups" ? groups : undefined
    if (!queryDataset)
        return res.status(400).json({ message: "Invalid query" })
        
    await queryDataset.read()
    for (let i = 0; i < array.length; i++) {
        
    }
    const query = queryDataset.data.map(queryData => queryData.name.contains(req.params.name))
    if (!query && !query[0])
        res.status(404).json({ message: "Fail, query data not found" })
        
    res.status(200).json({ message: "Success", query })
}) 