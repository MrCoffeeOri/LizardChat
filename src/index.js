import cors from 'cors'
import express, { json } from "express"
import { Low, JSONFile } from 'lowdb'
import { router as userRouter } from "./Routes/User.js"

export const app = express()
export const db = new Low(new JSONFile('database/db.json'))
const door = process.env.DOOR || 5500

app.use(json())
app.use(cors())
app.use("/user", userRouter)

app.get("/", async (req, res) => {
    try {
        await db.read()
        res.status(200).json(db.data.users) // Only testing
    } catch (error) {
        res.status(101)
    }
})

app.listen(door, () => {
    console.log(`Server running at http://localhost:${door}`)
})