import { Schema, model } from "mongoose"

const $chatLookup = (collection) => ({ 
    from: collection, 
    localField: "uid",
    foreignField: "users.uid",
    as: collection, 
    pipeline: [
        { 
            $addFields: { 
                "newMessages": { 
                    $size: {
                        $filter: {
                            input: "$messages",
                            as: "message",
                            cond: { $in: ["$uid", "$$message.views"] }
                        }
                    }
                },
                "messages": { $cond: { if: { $arrayElemAt: ["$messages", -1] }, then: [{ $arrayElemAt: ["$messages", -1] }], else: [] } }
            } 
        },
        { $unset: ["users", "description", "inviteToken", "isPrivate"] }
    ]
})

export const User = model("User", new Schema({
    name: { 
        type: String, 
        required: true 
    },
    email: { 
        type: String,
        unique: true, 
        required: true 
    },
    password: { 
        type: String, 
        required: true 
    },
    uid: { 
        type: String,
        unique: true, 
        required: true 
    },
    authToken: { 
        type: String, 
        required: true 
    },
    image: { 
        type: String, 
        required: true, 
        default: "default" 
    },
    otherInstance: { 
        type: Boolean, 
        required: true, 
        default: false 
    },
    isPrivate: { 
        type: Boolean, 
        required: true, 
        default: true 
    }
}, { 
    timestamps: true,
    statics: {
        async FindByUID(uid) {
            return (await this.aggregate([
                { $match: { uid: uid } },
                { $lookup: $chatLookup("groups")}, 
                { $lookup: $chatLookup("dms") },
                { $lookup: { from: "invites", localField: "uid", foreignField: "to", as: "invites" } },
                { $addFields: { chats: { $concatArrays: ["$groups", "$dms"] } } },
                { $unset: ["groups", "dms"] },
            ]))[0]
        }
    }
}))