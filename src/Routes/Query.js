import { Router } from 'express'
import { users, groups } from '../DB.js'

export const queryRouter = Router()


queryRouter.get("/users/:limit/:chars", async (req, res) => {
    const query = []
    for (let i = 0; i < req.params.limit; i++) {
        if (!users.data[i]) break;
        if (users.data[i].name.includes(req.params.chars)) {
            query[i] = users.data[i].isPrivate ? 
            { id: users.data[i].id, name: users.data[i].name, creationDate: users.data[i].creationDate } 
            : 
            { id: users.data[i].id, name: users.data[i].name, creationDate: users.data[i].creationDate, groups: users.data[i].groups }
        }
    }
    if (!query || !query[0])
        return res.status(404).json({ message: "Users not found" })
    
    const remaining = users.data.length - req.params.limit
    res.status(200).json({ message: "Success", query, remaining: remaining > 0 ? remaining : 0 })
}) 

queryRouter.get("/groups/:limit/:name", async (req, res) => {
    const queryDataset = req.params.query == "users" ? users : req.params.query == "groups" ? groups : undefined
    if (!queryDataset)
        return res.status(400).json({ message: "Invalid query" })
        
    const query = queryDataset.data.map(queryData => {
        if (queryData.name.contains(req.params.name)) {
            
        }
    })
    if (!query && !query[0])
        res.status(404).json({ message: "Fail, query data not found" })
        
    res.status(200).json({ message: "Success", query })
}) 