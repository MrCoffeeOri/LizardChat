import { Schema, model } from "mongoose"

export const User = model("User", new Schema({
    name: String,
    email: String,
    password: String,
    uid: String,
    authToken: String,
    otherInstance: { type: Boolean, default: false },
    isPrivate: { type: Boolean, default: true }
}, { 
    timestamps: true,
    statics: {
        async FindByUID(uid) {
            return (await this.aggregate([ 
                { $match: { uid: uid } },
                { $lookup: { from: "groups", localField: "uid", foreignField: "users.uid", as: "groups" } }, 
                { $lookup: { from: "dms", localField: "uid", foreignField: "users.uid", as: "dms" } },
                { $lookup: { from: "invites", localField: "uid", foreignField: "to", as: "invites" } },
                { $addFields: { chats: { $concatArrays: ["$groups", "$dms"] } } },
                { $unset: "groups" },
                { $unset: "dms" }
            ]))[0]
        }
    }
}))