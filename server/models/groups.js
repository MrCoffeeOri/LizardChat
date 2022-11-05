import { Schema, model } from "mongoose"

export const Group = model("Group", new Schema({
    name: String,
    description: String,
    owner: String,
    uid: String,
    inviteToken: String,
    users: { type: Array, default: [] },
    messages: { type: Array, default: [] },
}, { timestamps: true }))