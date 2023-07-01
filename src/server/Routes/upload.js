import { writeFile, rm } from 'fs/promises'
import { Router } from "express";
import crypto from "crypto"
import uploadPath from '../helpers/uploadPath.js'

let tmpFiles = {}
export default Router()
    .post("/", async (req, res) => {
        if (req.body.length == tmpFiles[req.query.userUID]?.length) {
            const filePath = `${req.query.userUID}@${crypto.randomUUID()}${req.body.fileType}`
            req.body.oldUrl && await rm(uploadPath + req.body.oldUrl)
            await writeFile(uploadPath + filePath, Buffer.from(tmpFiles[req.query.userUID].split(',')[1], 'base64'))
            delete tmpFiles[req.query.userUID]
            return res.status(200).json({ filePath })
        }  
        if (!tmpFiles[req.query.userUID]) tmpFiles[req.query.userUID] = ''
        tmpFiles[req.query.userUID] += req.body.chunk.trim()
        res.status(201).json({ message: "Chunk recived" })
    })
    .get("/:id", (req, res) => res.status(200).sendFile(`${process.cwd()}/src/server/uploads/${req.params.id}`))