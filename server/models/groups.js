import { Schema, model } from "mongoose"
import { TokenUUID } from "../UUID.js"

export const Group = model("Group", new Schema({
    name: String,
    description: String,
    owner: String,
    users: { type: Array, default: [] },
    messages: { type: [{ from: Object, uid: String, contentType: String, content: Object, date: { type: Date, default: Date.now } }], default: [] },
    inviteToken: { type: String, default: TokenUUID }
}, { timestamps: true }))