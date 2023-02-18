import { Router } from "express";
import { Group } from "../models/group.model.js";
import { User } from "../models/user.model.js";

export default Router()
    .get("/:collection/:chars/:limit", async (req, res) => {
        const collection = req.params.collection == "chats" ? Group : req.params.collection == "users" ? User : null
        if (!collection)
            return res.status(400).json({ message: "Query does not exist" })

        const queryData = await collection.aggregate([
            { $match: { $and: [{ isPrivate: false }, { $or: [{ uid: req.params.chars }, { name: new RegExp(req.params.chars, "i")}] }] } },
            { $limit: Number(req.params.limit) },
            { $unset: ["password", "email"] }
        ])
        if (!queryData.length)
            return res.status(404).json({ message: "Query not found" })

        res.status(200).json({ message: "Success", query: queryData, remaining: (await collection.count()) - queryData.length })
    })