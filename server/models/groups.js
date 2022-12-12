import { Schema, model } from "mongoose"
import { TokenUUID } from "../UUID.js"

export const Group = model("Group", new Schema({
    name: String,
    description: String,
    owner: String,
    uid: String,
    inviteToken: { type: String, default: TokenUUID },
    isPrivate: { type: Boolean, default: false },
    users: { type: Array, default: [] },
    messages: { type: Array, default: [] },
}, { timestamps: true }))