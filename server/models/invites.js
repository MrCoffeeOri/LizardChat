import { model, Schema } from "mongoose";

export const Invite = model("Invite", new Schema({
    description: String,
    from: String,
    to: String,
    group: { _id: String, token: String }
}, { timestamps: true }))