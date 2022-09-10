import { Router } from 'express'
import { users, groups } from '../DB.js'

export const queryRouter = Router()
    .get("/:table/:limit/:chars", async (req, res) => {
        req.params.chars = req.params.chars.toString()
        const queryTable = req.params.table == "users" ? Object.values(users.data) : req.params.table == "groups" ?  Object.values(groups.data) : undefined
        if (queryTable == undefined)
            return res.status(400).json({ message: "Invalid query" })
            
        if (isNaN(req.params.limit) || req.params.limit < 0)
            return res.status(400).json({ message: "Limit is not a number or is negative" })
        
        req.params.limit = req.params.limit > queryTable.length ? queryTable.length : req.params.limit
        let query = []
        queryTable.forEach(item => {
            if (item.id == req.params.chars || item.name.includes(req.params.chars) || item.name.includes(req.params.chars.toLowerCase()) || item.name.includes(req.params.chars.toUpperCase())) {
                query.push(item.isPrivate ? 
                { id: item.id, name: item.name, creationDate: item.creationDate } 
                : 
                { id: item.id, name: item.name, creationDate: item.creationDate, inviteToken: item.inviteToken, groups: item.groups && Object.keys(item.groups).map(groupID => ({ name: groups.data[groupID].name, creationDate: groups.data[groupID].creationDate })), users: item.users && Object.values(item.users) })
            }
        })
        res.status(200).json({ message: "Success", query: query.slice(0, req.params.limit), remaining: Math.max(0, query.length - req.params.limit) })
    })