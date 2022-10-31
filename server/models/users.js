import { Schema, model } from "mongoose"
import { TokenUUID } from "../UUID.js"

export const User = model("User", new Schema({
    name: String,
    email: String,
    password: String,
    uid: String,
    otherInstance: { type: Boolean, default: false },
    isPrivate: { type: Boolean, default: true },
    authToken: { type: String, default: TokenUUID },
}, {  
    timestamps: true,
}))

export const users = await User.aggregate([ 
    { $lookup: { from: "groups", localField: "uid", foreignField: "users.uid", as: "groups" } }, 
    { $lookup: { from: "dms", localField: "uid", foreignField: "users.uid", as: "dms" } },
    { $lookup: { from: "invites", localField: "uid", foreignField: "to.uid", as: "invites" } },
    { $addFields: { chats: { $concatArrays: ["$groups", "$dms"] } } },
    { $unset: "groups" },
    { $unset: "dms" }
])