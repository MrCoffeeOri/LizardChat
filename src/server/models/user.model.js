import { Schema, model } from "mongoose"

const $chatLookup = (collection) => {
    const pipeline = [
        { 
            $addFields: {
                newMessages: { 
                    $size: {
                        $filter: {
                            input: "$messages",
                            as: "message",
                            cond: { $in: ["$uid", "$$message.views"] }
                        }
                    }
                },
                messages: { 
                    $cond: { 
                        if: { $arrayElemAt: ["$messages", -1] }, 
                        then: [{ $arrayElemAt: ["$messages", -1] }], 
                        else: [] 
                    } 
                },
            } 
        },
        { $unset: ["description", "inviteToken", "isPrivate"] }
    ]
    collection == "dms" ? pipeline.unshift({ $lookup: { from: "users", localField: "users", foreignField: "uid", as: "users", pipeline: [{ $project: { name: 1, uid: 1, image: 1 } }] } }) : pipeline[1].$unset.push("users")
    return {
        from: collection, 
        localField: "uid",
        foreignField: collection == "groups" ? "users.uid" : "users",
        as: collection,
        pipeline
    }
}

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
        default: "default" 
    },
    otherInstance: { 
        type: Boolean, 
        default: false 
    },
    isPrivate: { 
        type: Boolean, 
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
                { $unset: ["groups", "dms"] }
            ]))[0]
        }
    }
}))