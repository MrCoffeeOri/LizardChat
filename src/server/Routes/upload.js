import { writeFile, rm } from 'fs/promises'
import { Router } from "express";
import crypto from "crypto"
import uploadPath from '../helpers/uploadPath.js'

let tmpFiles = {}
export default Router()
    .post("/", async (req, res) => {
        res.status(200).json({ filePath: await SaveFile(req.body.fileURL, req.body.fileType) })
    })
    .post("/chunk", async (req, res) => {
        if (req.body.length == tmpFiles[req.query.userUID]?.length) {
            res.status(200).json({ filePath: await SaveFile(tmpFiles[req.query.userUID], req.body.fileType, req.body.oldUrl, req.query.userUID) })
            return delete tmpFiles[req.query.userUID]
        }
        if (!tmpFiles[req.query.userUID]) tmpFiles[req.query.userUID] = ''
        tmpFiles[req.query.userUID] += req.body.chunk.trim()
        res.status(201).json({ message: "Chunk recived" })
    })
    .get("/:id", (req, res) => res.status(200).sendFile(`${process.cwd()}/src/server/uploads/${req.params.id}`))

async function SaveFile(file, fileType, oldUrl, userUID = Math.ceil(Math.random() * 100000)) {
    const filePath = userUID + '@' + crypto.randomUUID() + fileType
    oldUrl && await rm(uploadPath + oldUrl)
    await writeFile(uploadPath + filePath, Buffer.from(file.split(',')[1], 'base64'))
    return filePath
}